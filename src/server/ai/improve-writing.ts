import { runTextAction } from "./runner";

const SYSTEM_PROMPT = `You are an expert writing editor. Improve the user's writing while preserving their meaning and intent.
- Fix grammar, clarity, and flow.
- Keep the Markdown structure (headings, lists, links) intact.
- Do not invent new facts; only rephrase.
- Respond in Markdown only, with no commentary.`;

export async function improveWriting(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
}) {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;
  const prompt = hasSelection
    ? `Improve only this selection from the note titled "${args.noteTitle}" in place. Return the rewritten text only, in Markdown:\n\n${args.selectedText}`
    : `Rewrite the following note in place. Return the rewritten note in Markdown only:\n\n${full}`;
  return runTextAction({
    noteId: args.noteId,
    action: "improve-writing",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit,
    promptToModel: prompt,
  });
}