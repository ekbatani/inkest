import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { getNoteById } from "@/server/notes/service";
import { summarizeNote } from "@/server/ai/summarize-note";
import { improveWriting } from "@/server/ai/improve-writing";
import { extractTasks } from "@/server/ai/extract-tasks";
import { createProjectPlan } from "@/server/ai/create-project-plan";
import { generateMermaid } from "@/server/ai/generate-mermaid";
import { explainText } from "@/server/ai/explain-text";
import { translateText } from "@/server/ai/translate-text";
import { NoteEditorActionSchema } from "@/server/ai/specs";

const RequestSchema = z.object({
  action: NoteEditorActionSchema,
  noteId: z.string(),
  selectedText: z.string().optional(),
  promptHint: z.string().optional(),
  targetLanguage: z.string().optional(),
});

function statusFor(actionReturn: {
  ok: boolean;
  notConfigured?: boolean;
}): number {
  return actionReturn.notConfigured ? 503 : 500;
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

  const { action, noteId, selectedText, promptHint, targetLanguage } =
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
    return NextResponse.json({ kind: "text", output: r.output });
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
    return NextResponse.json({ kind: "text", output: r.output });
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
    return NextResponse.json({ kind: "text", output: r.output });
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
    return NextResponse.json({ kind: "text", output: r.output });
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
    return NextResponse.json({ kind: "text", output: r.output });
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
    return NextResponse.json({ kind: "text", output: r.output });
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
    return NextResponse.json({ kind: "tasks", tasks: r.output.tasks });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
