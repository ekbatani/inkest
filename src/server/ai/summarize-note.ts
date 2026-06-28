import { runTextAction } from "./runner";

const SYSTEM_PROMPT = `You are a concise summarizer for personal notes.
Summarize the user's note as Markdown with:
- A 1-2 sentence summary at the top
- 3-5 key points as a bulleted list
- Any action items mentioned in the note

Keep it short and useful. Respond in Markdown only.`;

export async function summarizeNote(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
}) {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;
  const prompt = hasSelection
    ? `Summarize only this selection from the note titled "${args.noteTitle}":\n\n${args.selectedText}`
    : full;
  return runTextAction({
    noteId: args.noteId,
    action: "summarize",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit,
    promptToModel: prompt,
  });
}