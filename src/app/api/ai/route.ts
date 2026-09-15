import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { getNoteById } from "@/server/notes/service";
import { summarizeNote } from "@/server/ai/summarize-note";
import { improveWriting } from "@/server/ai/improve-writing";
import { gentlyEdit } from "@/server/ai/gently-edit";
import { extractTasks } from "@/server/ai/extract-tasks";
import { createProjectPlan } from "@/server/ai/create-project-plan";
import { generateMermaid } from "@/server/ai/generate-mermaid";
import { explainText } from "@/server/ai/explain-text";
import { translateText } from "@/server/ai/translate-text";
import { commentOnSelection } from "@/server/ai/comment-selection";
import { applyInlineComments } from "@/server/ai/apply-comments";
import { NoteEditorActionSchema } from "@/server/ai/specs";
import { notifyAiActionResult } from "@/server/notifications/telegram";
import { streamTextAction, type StreamTextActionResult } from "@/server/ai/runner";
import {
  buildAiStreamingSystemPrompt,
  buildAiStreamingUserPrompt,
} from "@/server/ai/specs";

const RequestSchema = z.object({
  action: NoteEditorActionSchema,
  noteId: z.string(),
  selectedText: z.string().optional(),
  promptHint: z.string().optional(),
  targetLanguage: z.string().optional(),
  stream: z.boolean().optional().default(false),
});

const STREAMABLE_ACTIONS = new Set([
  "summarize",
  "improve-writing",
  "gently-edit",
  "explain",
  "translate",
  "comment-selection",
  "apply-comments",
]);

function statusFor(actionReturn: {
  ok: boolean;
  notConfigured?: boolean;
}): number {
  return actionReturn.notConfigured ? 503 : 500;
}

function createSseStreamResponse(
  streamResult: Extract<StreamTextActionResult, { ok: true }>,
  noteTitle: string,
  action: string,
) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const chunk of streamResult.stream) {
          fullText += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`),
          );
        }

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              output: fullText,
              citations: streamResult.citations,
              transformType: streamResult.transformType,
              uncertaintyNote: streamResult.uncertaintyNote,
            })}\n\n`,
          ),
        );

        // Run persistence and notification asynchronously in background
        void streamResult.onComplete(fullText).catch((err) => {
          console.warn("[api/ai] stream onComplete error:", err);
        });

        void notifySuccessfulAiAction({
          action,
          noteTitle,
          output: fullText,
          model: streamResult.model,
          provider: streamResult.provider,
        }).catch((err) => {
          console.warn("[api/ai] async notification error:", err);
        });
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: err instanceof Error ? err.message : "Stream failed.",
            })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function formatTasksForNotification(
  tasks: Array<{
    title: string;
    description?: string | null;
    priority?: string | null;
    dueDate?: string | null;
    sourceQuote?: string | null;
  }>,
) {
  if (tasks.length === 0) return "No tasks were extracted.";

  return tasks
    .map((task, index) => {
      const details = [
        task.description ? `Description: ${task.description}` : null,
        task.priority && task.priority !== "none"
          ? `Priority: ${task.priority}`
          : null,
        task.dueDate ? `Due: ${task.dueDate}` : null,
        task.sourceQuote ? `Source: ${task.sourceQuote}` : null,
      ].filter(Boolean);

      return [`${index + 1}. ${task.title}`, ...details].join("\n");
    })
    .join("\n\n");
}

async function notifySuccessfulAiAction(args: {
  action: string;
  noteTitle: string;
  output: string;
  model?: string;
  provider?: string;
}) {
  try {
    await notifyAiActionResult(args);
  } catch (err) {
    console.warn("[api/ai] async notification error:", err);
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { action, noteId, selectedText, promptHint, targetLanguage, stream } =
    parsed.data;

  const note = await getNoteById(noteId);
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const selection = selectedText?.trim();

  // Selection-only actions must have a selection.
  if (action === "explain" && !selection) {
    return NextResponse.json(
      { error: "Select text in the editor first." },
      { status: 400 },
    );
  }
  if (action === "translate" && !selection) {
    return NextResponse.json(
      { error: "Select text to translate first." },
      { status: 400 },
    );
  }
  if (action === "translate" && !targetLanguage?.trim()) {
    return NextResponse.json(
      { error: "Choose a target language." },
      { status: 400 },
    );
  }
  if (action === "comment-selection" && !selection) {
    return NextResponse.json(
      { error: "Select text for the AI to comment on." },
      { status: 400 },
    );
  }
  if (action === "apply-comments" && !note.contentMd.includes("inkest-comment:")) {
    return NextResponse.json(
      { error: "This note does not have any inline comments to apply." },
      { status: 400 },
    );
  }

  // ── Streaming execution for text actions ────────────────────────────────
  if (stream && STREAMABLE_ACTIONS.has(action)) {
    const hasSelection = Boolean(selection);
    const inputForAudit = hasSelection ? selection! : `# ${note.title}\n\n${note.contentMd}`;

    const streamResult = await streamTextAction({
      noteId: note.id,
      action,
      systemPrompt: buildAiStreamingSystemPrompt(action),
      inputForAudit,
      promptToModel: buildAiStreamingUserPrompt(action, {
        noteTitle: note.title,
        noteContent: note.contentMd,
        selectedText: hasSelection ? selection : undefined,
        promptHint,
        targetLanguage,
      }),
      enableGrounding: action === "explain" || action === "summarize",
      transformType:
        action === "gently-edit"
          ? "Gentle Polish"
          : action === "improve-writing"
            ? "Improve Writing"
            : action === "summarize"
              ? "Summary"
              : action === "explain"
                ? "Explanation"
                : action === "translate"
                  ? `Translation (${targetLanguage ?? "English"})`
                  : undefined,
    });

    if (!streamResult.ok) {
      return NextResponse.json(
        { error: streamResult.error, notConfigured: streamResult.notConfigured },
        { status: statusFor(streamResult) },
      );
    }

    return createSseStreamResponse(streamResult, note.title, action);
  }

  if (action === "summarize") {
    const r = await summarizeNote({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      selectedText,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "improve-writing") {
    const r = await improveWriting({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      selectedText,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "gently-edit") {
    const r = await gentlyEdit({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      selectedText,
      promptHint,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "create-project-plan") {
    const r = await createProjectPlan({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      promptHint,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "generate-mermaid") {
    const r = await generateMermaid({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      selectedText,
      promptHint,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "explain") {
    const r = await explainText({
      noteId: note.id,
      noteTitle: note.title,
      selectedText: selection!,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "translate") {
    const r = await translateText({
      noteId: note.id,
      noteTitle: note.title,
      selectedText: selection!,
      targetLanguage: targetLanguage!,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "comment-selection") {
    const r = await commentOnSelection({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      selectedText: selection!,
      promptHint,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "apply-comments") {
    const r = await applyInlineComments({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      promptHint,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: r.output,
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({
      kind: "text",
      output: r.output,
      citations: r.citations,
      transformType: r.transformType,
      uncertaintyNote: r.uncertaintyNote,
    });
  }

  if (action === "extract-tasks") {
    const r = await extractTasks({
      noteId: note.id,
      noteTitle: note.title,
      noteContent: note.contentMd,
      selectedText,
    });
    if (!r.ok)
      return NextResponse.json(
        { error: r.error, notConfigured: r.notConfigured },
        { status: statusFor(r) },
      );
    void notifySuccessfulAiAction({
      action,
      noteTitle: note.title,
      output: formatTasksForNotification(r.output.tasks),
      model: r.model,
      provider: r.provider,
    });
    return NextResponse.json({ kind: "tasks", tasks: r.output.tasks });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
