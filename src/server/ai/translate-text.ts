import { runTextAction } from "./runner";

const SYSTEM_PROMPT = `You translate a user's selected text into the target language.
- Preserve Markdown structure.
- Do not add commentary. Output only the translated text, in Markdown.`;

export async function translateText(args: {
  noteId: string;
  noteTitle: string;
  selectedText: string;
  targetLanguage: string;
}) {
  const prompt = `Translate the following selection from the note titled "${args.noteTitle}" into ${args.targetLanguage}. Preserve Markdown structure.\n\n${args.selectedText}`;
  return runTextAction({
    noteId: args.noteId,
    action: "translate",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit: args.selectedText,
    promptToModel: prompt,
  });
}