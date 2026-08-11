"use server";

import { runTextAction, type AiActionResult } from "./runner";

export async function runAiChatPromptAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  userPrompt: string;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<AiActionResult<string>> {
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());

  let contextBlock = `Current Note Title: ${args.noteTitle}\n\nCurrent Note Content:\n\`\`\`markdown\n${args.noteContent}\n\`\`\``;
  if (hasSelection) {
    contextBlock += `\n\nSelected Text in Editor:\n\`\`\`\n${args.selectedText}\n\`\`\``;
  }

  let conversationBlock = "";
  if (args.history && args.history.length > 0) {
    // Keep up to 6 recent conversation items to stay within context budget
    const recentHistory = args.history.slice(-6);
    conversationBlock =
      "\n\nPrevious Conversation:\n" +
      recentHistory
        .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
        .join("\n\n");
  }

  const promptToModel = `${contextBlock}${conversationBlock}\n\nUser Request / Instruction:\n${args.userPrompt}`;

  const systemPrompt =
    "You are an AI assistant in Inkest, a Markdown personal workspace. Answer the user's questions or follow their instructions based on the note context and selection provided. Provide clear, direct, and beautifully formatted Markdown responses. When modifying or drafting content, present the content cleanly so the user can easily insert or replace it into their note.";

  return runTextAction({
    noteId: args.noteId,
    action: "chat-prompt",
    systemPrompt,
    inputForAudit: args.userPrompt,
    promptToModel,
  });
}
