"use server";

import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { resolveProjectAccess } from "@/server/projects/access";
import { runTextAction, type AiActionResult } from "./runner";
import { summarizeNote } from "./summarize-note";
import { improveWriting } from "./improve-writing";
import { gentlyEdit } from "./gently-edit";
import { extractTasks, type ExtractTasksOutput } from "./extract-tasks";
import { generateMermaid } from "./generate-mermaid";
import { translateText } from "./translate-text";
import { explainText } from "./explain-text";
import { createProjectPlan } from "./create-project-plan";
import {
  createChatThread,
  listChatThreads,
  getChatThreadMessages,
  addChatMessage,
  deleteChatThread,
} from "./chat-service";
import type { ChatThread, ChatMessageEntity } from "@/server/db/schema";

export async function createChatThreadAction(title?: string): Promise<{
  success: boolean;
  thread?: ChatThread;
  threadId?: string;
  error?: string;
}> {
  try {
    const thread = await createChatThread(title);
    return { success: true, thread, threadId: thread.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create chat thread";
    return { success: false, error: message };
  }
}

export async function listChatThreadsAction(): Promise<{
  success: boolean;
  threads?: ChatThread[];
  error?: string;
}> {
  try {
    const threads = await listChatThreads();
    return { success: true, threads };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list chat threads";
    return { success: false, error: message };
  }
}

export async function getChatThreadMessagesAction(threadId: string): Promise<{
  success: boolean;
  messages?: ChatMessageEntity[];
  error?: string;
}> {
  try {
    const messages = await getChatThreadMessages(threadId);
    return { success: true, messages };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load thread messages";
    return { success: false, error: message };
  }
}

export async function deleteChatThreadAction(threadId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await deleteChatThread(threadId);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete chat thread";
    return { success: false, error: message };
  }
}

export async function saveChatMessageAction(args: {
  threadId: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}): Promise<{
  success: boolean;
  message?: ChatMessageEntity;
  error?: string;
}> {
  try {
    const message = await addChatMessage(args);
    return { success: true, message };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to save message";
    return { success: false, error: errorMessage };
  }
}

export type AiContextItem = {
  id: string;
  type: "note" | "project" | "file" | "vault";
  title: string;
  subtitle?: string;
  ciphertext?: string;
  iv?: string;
  content?: string;
};

export async function searchContextItemsAction(query: string): Promise<{
  success: boolean;
  items?: AiContextItem[];
  error?: string;
}> {
  try {
    const { listNotes } = await import("@/server/notes/service");
    const { listVaultItems } = await import("@/server/vault/vault-service");

    const notes = await listNotes({ search: query || undefined, limit: 12 });
    const vaultItems = await listVaultItems();

    const matchedVaultItems = query
      ? vaultItems.filter((v) => v.title.toLowerCase().includes(query.toLowerCase()))
      : vaultItems.slice(0, 5);

    const items: AiContextItem[] = [
      ...notes.map((n) => ({
        id: n.id,
        type: (n.type === "project" ? "project" : "note") as "note" | "project",
        title: n.title,
        subtitle: n.type === "project" ? "Project" : "Note",
        content: n.contentMd,
      })),
      ...matchedVaultItems.map((v) => ({
        id: v.id,
        type: "vault" as const,
        title: v.title,
        subtitle: `Vault Secret (${v.category})`,
        ciphertext: v.ciphertext,
        iv: v.iv,
      })),
    ];

    return { success: true, items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to search context items";
    return { success: false, error: message };
  }
}

const CHECKLIST_PROMPT_CAP = 12;
const TASK_NOTE_PROMPT_CAP = 8;

/**
 * Live project state for the AI chat. When the current page is a project the
 * assistant should see its real checklist, task-note board, and subprojects —
 * not just the note markdown. Access follows the same project-share rules as
 * the project page. Best-effort: any failure just omits the block.
 */
async function buildProjectContextBlock(noteId: string | undefined): Promise<string> {
  if (!noteId) return "";
  try {
    const user = await getCurrentUser();
    if (!user) return "";
    const access = await resolveProjectAccess(noteId, user.id);
    if (!access || access.note.type !== "project") return "";
    const project = access.note;

    const [subprojects, checklist, taskNotes] = await Promise.all([
      db
        .select({
          title: schema.notes.title,
          status: schema.notes.status,
          dueDate: schema.notes.dueDate,
        })
        .from(schema.notes)
        .where(
          and(
            eq(schema.notes.parentId, project.id),
            eq(schema.notes.type, "project"),
            isNull(schema.notes.deletedAt),
          ),
        )
        .orderBy(asc(schema.notes.dueDate))
        .limit(20),
      db
        .select({
          title: schema.tasks.title,
          status: schema.tasks.status,
          priority: schema.tasks.priority,
          dueDate: schema.tasks.dueDate,
        })
        .from(schema.tasks)
        .where(eq(schema.tasks.noteId, project.id))
        .orderBy(asc(schema.tasks.status), asc(schema.tasks.dueDate))
        .limit(50),
      db
        .select({
          title: schema.notes.title,
          status: schema.notes.status,
          dueDate: schema.notes.dueDate,
        })
        .from(schema.notes)
        .where(
          and(
            eq(schema.notes.parentId, project.id),
            isNull(schema.notes.deletedAt),
            ne(schema.notes.type, "project"),
            ne(schema.notes.status, "none"),
          ),
        )
        .orderBy(asc(schema.notes.status), asc(schema.notes.dueDate))
        .limit(50),
    ]);

    const openChecklist = checklist.filter((t) => t.status !== "done" && t.status !== "canceled");
    const doneChecklist = checklist.length - openChecklist.length;
    const boardColumns = { todo: 0, doing: 0, paused: 0, done: 0 } as Record<string, number>;
    for (const taskNote of taskNotes) {
      if (taskNote.status in boardColumns) boardColumns[taskNote.status] += 1;
    }

    const lines: string[] = [
      `Live Project Context for "${project.title}":`,
      `- Project status: ${project.status}, priority: ${project.priority}${project.dueDate ? `, due ${project.dueDate.toISOString().slice(0, 10)}` : ""}`,
      `- Checklist: ${openChecklist.length} open / ${doneChecklist} finished`,
      ...openChecklist
        .slice(0, CHECKLIST_PROMPT_CAP)
        .map(
          (t) =>
            `  - [${t.status}${t.priority !== "none" ? ` · ${t.priority}` : ""}] ${t.title}${t.dueDate ? ` (due ${t.dueDate.toISOString().slice(0, 10)})` : ""}`,
        ),
      `- Task-note board: ${boardColumns.todo} to do, ${boardColumns.doing} in progress, ${boardColumns.paused} paused, ${boardColumns.done} done`,
      ...taskNotes
        .filter((n) => n.status !== "done")
        .slice(0, TASK_NOTE_PROMPT_CAP)
        .map((n) => `  - Open task note (${n.status}): ${n.title}`),
    ];
    if (subprojects.length > 0) {
      lines.push(
        `- Subprojects: ${subprojects
          .map(
            (s) =>
              `${s.title} (${s.status}${s.dueDate ? `, due ${s.dueDate.toISOString().slice(0, 10)}` : ""})`,
          )
          .join("; ")}`,
      );
    }
    return lines.join("\n");
  } catch {
    return "";
  }
}

export async function runAiChatPromptAction(args: {
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  selectedText?: string;
  userPrompt: string;
  history?: { role: "user" | "assistant"; content: string }[];
  enableGrounding?: boolean;
  threadId?: string;
  attachedContexts?: AiContextItem[];
  includePageContext?: boolean;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;

  if (!activeThreadId) {
    try {
      const newThread = await createChatThread(args.userPrompt.slice(0, 40));
      activeThreadId = newThread.id;
    } catch {
      // If thread creation fails (e.g. unauthenticated session in tests), proceed without saving
    }
  }

  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: args.userPrompt,
      });
    } catch {
      // Continue execution if persistence fails
    }
  }

  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const shouldIncludeContext =
    args.includePageContext !== false &&
    Boolean((args.noteTitle && args.noteTitle.trim()) || (args.noteContent && args.noteContent.trim()));

  let contextBlock = "";
  if (shouldIncludeContext) {
    contextBlock = `Current Page / Note: ${args.noteTitle || "Untitled"}\n\nCurrent Page Content:\n\`\`\`markdown\n${args.noteContent || ""}\n\`\`\``;
    if (hasSelection) {
      contextBlock += `\n\nSelected Text in Editor:\n\`\`\`\n${args.selectedText}\n\`\`\``;
    }
  }

  let attachedContextBlock = "";
  if (args.attachedContexts && args.attachedContexts.length > 0) {
    attachedContextBlock =
      "\n\nReferenced Workspace Context:\n" +
      args.attachedContexts
        .map((ctx) => {
          return `[${ctx.type.toUpperCase()}: ${ctx.title}]\n${ctx.content || "(No content available)"}`;
        })
        .join("\n\n");
  }

  let conversationBlock = "";
  if (args.history && args.history.length > 0) {
    const recentHistory = args.history.slice(-6);
    conversationBlock =
      "\n\nPrevious Conversation:\n" +
      recentHistory
        .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
        .join("\n\n");
  }

  const projectContextBlock = await buildProjectContextBlock(args.noteId);

  const promptToModel = `${contextBlock}${projectContextBlock ? `\n\n${projectContextBlock}` : ""}${attachedContextBlock}${conversationBlock}\n\nUser Request / Instruction:\n${args.userPrompt}`.trim();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const systemPrompt =
    `You are the Inkest AI Assistant, deeply integrated into Inkest — a private, Markdown-first personal workspace.\n` +
    `Today's date is ${todayStr}.\n\n` +
    `APPLICATION SERVICES & KNOWLEDGE:\n` +
    `- **Notes & Documents**: Markdown notes with live preview, wiki-links ([[Note Title]]), tags (#tag), task checklists (- [ ]), and Mermaid diagrams.\n` +
    `- **Projects & Subprojects**: Hierarchical projects (top-level or nested subprojects via parentId), Kanban board stages (todo, doing, done, paused, archived), priority levels (low, medium, high), and project milestone due dates.\n` +
    `- **Tasks & Action Items**: Structured tasks attached to projects or notes with statuses (todo, doing, done, canceled), priorities, start dates, due dates, next actions, and Telegram reminder delivery.\n` +
    `- **Daily Journal**: Daily reflection notes with structured reflection, gratitude, and decision templates.\n` +
    `- **Calendar & Google Sync**: External Google Calendar connections and scheduled agenda integration.\n` +
    `- **Vault**: Encrypted zero-knowledge secret items (passwords, tokens, keys).\n\n` +
    `RESPONSE GUIDELINES:\n` +
    `- Answer questions or follow instructions based on the note context, referenced items (@notes, @projects, @vault secrets), workspace knowledge, and selection provided.\n` +
    `- When a 'Live Project Context' block is present, treat it as the authoritative current state of that project's checklist, task board, and subprojects.\n` +
    `- When generating tasks, checklists, or project plans, output concrete actionable items in markdown checklist format: \`- [ ] Task title\` with optional timing and priority.\n` +
    `- When drafting or gently editing note content, present clean Markdown ready for easy insertion or replacement.\n` +
    `- If the user's request has ambiguities or multiple possible directions, conclude with a concise '### ❓ Clarifications & Follow-up' section with 2-3 specific choices to confirm.\n` +
    `- You may use double brackets [[Note Title]] for wiki-links when referencing workspace concepts.`;

  const result = await runTextAction({
    noteId: args.noteId || null,
    action: "chat-prompt",
    systemPrompt,
    inputForAudit: `${args.userPrompt} ${args.noteTitle}`,
    promptToModel,
    enableGrounding: args.enableGrounding !== false,
  });

  if (activeThreadId) {
    try {
      if (result.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: result.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: result.error,
          isError: true,
        });
      }
    } catch {
      // Continue execution
    }
  }

  return { ...result, threadId: activeThreadId };
}

export async function gentlyEditNoteAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  return gentlyEdit(args);
}

export async function summarizeNoteAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Summarize note");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Summarize note",
      });
    } catch {}
  }

  const res = await summarizeNote(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function improveWritingAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Improve writing");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Improve writing",
      });
    } catch {}
  }

  const res = await improveWriting(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function extractTasksAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  threadId?: string;
}): Promise<AiActionResult<ExtractTasksOutput> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Extract tasks");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Extract tasks",
      });
    } catch {}
  }

  const res = await extractTasks(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        const textOutput = res.output.tasks
          .map((t) => {
            const meta = [];
            if (t.priority && t.priority !== "none") meta.push(`Priority: ${t.priority}`);
            if (t.dueDate) meta.push(`Due: ${t.dueDate}`);
            if (t.startDate) meta.push(`Start: ${t.startDate}`);
            const metaStr = meta.length > 0 ? ` *(${meta.join(" | ")})*` : "";
            const descStr = t.description ? ` — ${t.description}` : "";
            return `- [ ] **${t.title}**${metaStr}${descStr}`;
          })
          .join("\n");
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: textOutput,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function generateMermaidAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Generate diagram");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Generate diagram",
      });
    } catch {}
  }

  const res = await generateMermaid(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function translateTextAction(args: {
  noteId: string;
  noteTitle: string;
  selectedText: string;
  targetLanguage: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread(`Translate to ${args.targetLanguage}`);
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: `Translate to ${args.targetLanguage}`,
      });
    } catch {}
  }

  const res = await translateText(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function explainTextAction(args: {
  noteId: string;
  noteTitle: string;
  selectedText: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Explain context");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Explain context",
      });
    } catch {}
  }

  const res = await explainText(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function createProjectPlanAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  promptHint?: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Draft Project Plan");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Draft Project Plan",
      });
    } catch {}
  }

  const res = await createProjectPlan(args);

  if (activeThreadId) {
    try {
      if (res.ok) {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.output,
        });
      } else {
        await addChatMessage({
          threadId: activeThreadId,
          role: "assistant",
          content: res.error,
          isError: true,
        });
      }
    } catch {}
  }

  return { ...res, threadId: activeThreadId };
}

export async function clarifyAndFindGapsAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Clarify & Find Gaps");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Analyze this note/project for ambiguities, missing details, and clarifying questions",
      });
    } catch {}
  }

  const userPrompt = `Please analyze the current note or context: "${args.noteTitle}". Identify any ambiguities, missing details, edge cases, risks, or open design decisions. Present your analysis clearly in Markdown with:\n1. 🔍 **Gaps & Blind Spots Summary**\n2. ❓ **Clarifying Questions for the User** (with 2-3 suggested options or directions to consider).`;

  const res = await runAiChatPromptAction({
    noteId: args.noteId,
    noteTitle: args.noteTitle,
    noteContent: args.noteContent,
    selectedText: args.selectedText,
    userPrompt,
    threadId: activeThreadId,
    enableGrounding: true,
  });

  return res;
}

export async function checkTyposAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  threadId?: string;
}): Promise<AiActionResult<string> & { threadId?: string }> {
  let activeThreadId = args.threadId;
  if (!activeThreadId) {
    try {
      const thread = await createChatThread("Check Typos & Grammar");
      activeThreadId = thread.id;
    } catch {}
  }
  if (activeThreadId) {
    try {
      await addChatMessage({
        threadId: activeThreadId,
        role: "user",
        content: "Check typos & grammar suggestions",
      });
    } catch {}
  }

  const isSelection = Boolean(args.selectedText && args.selectedText.trim());
  const userPrompt = `Please carefully check the following ${isSelection ? "selected text" : "note text"} for typos, spelling mistakes, punctuation errors, and grammatical slips.\n\n` +
    `Structure your response with:\n` +
    `1. 🔍 **Detected Typos & Suggestions**: A clear bulleted list showing what was wrong, the correction, and why (e.g. \`- **\`originaal\`** → **\`original\`**: Fixed spelling mistake\`). If no typos are found, state that the text is clean.\n\n` +
    `2. ✏️ **Corrected Version**: Provide the complete revised text ready for review and direct replacement without altering original Markdown structure or meaning.`;

  const res = await runAiChatPromptAction({
    noteId: args.noteId,
    noteTitle: args.noteTitle,
    noteContent: args.noteContent,
    selectedText: args.selectedText,
    userPrompt,
    threadId: activeThreadId,
    enableGrounding: false,
  });

  if (!res.ok) {
    return res;
  }

  return {
    ...res,
    transformType: "Typo & Grammar Check",
  };
}


