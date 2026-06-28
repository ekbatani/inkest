import { runTextAction } from "./runner";

const SYSTEM_PROMPT = `You explain a user's selected text in clear, friendly Markdown.
- Keep it short (3-6 sentences) unless the selection is complex.
- Define any technical terms inline.
- Respond in Markdown only.`;

export async function explainText(args: {
  noteId: string;
  noteTitle: string;
  selectedText: string;
}) {
  const prompt = `Explain this selection from the note titled "${args.noteTitle}":\n\n${args.selectedText}`;
  return runTextAction({
    noteId: args.noteId,
    action: "explain",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit: args.selectedText,
    promptToModel: prompt,
  });
}