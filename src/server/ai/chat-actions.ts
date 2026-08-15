"use server";

import { runTextAction, type AiActionResult } from "./runner";
import { summarizeNote } from "./summarize-note";
import { improveWriting } from "./improve-writing";
import { gentlyEdit } from "./gently-edit";
import { extractTasks, type ExtractTasksOutput } from "./extract-tasks";
import { generateMermaid } from "./generate-mermaid";
import { translateText } from "./translate-text";
import { explainText } from "./explain-text";
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

  const promptToModel = `${contextBlock}${attachedContextBlock}${conversationBlock}\n\nUser Request / Instruction:\n${args.userPrompt}`.trim();

  const systemPrompt =
    "You are an AI assistant in Inkest, a Markdown personal workspace. Answer the user's questions or follow their instructions based on the page/note context, referenced items (@notes, @projects, @files, @vault secrets), workspace knowledge, and selection provided. Provide clear, direct, and beautifully formatted Markdown responses. When modifying, gently editing, or drafting content, present the content cleanly so the user can easily insert, replace, or gently merge it into their note.";

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
          .map((t) => `- [ ] ${t.title}${t.description ? `: ${t.description}` : ""}`)
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
