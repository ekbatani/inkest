import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createMarkdownResponseParser,
} from "./specs";

export async function improveWriting(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
}): Promise<AiActionResult<string>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;

  const result = await runJsonAction({
    noteId: args.noteId,
    action: "improve-writing",
    systemPrompt: buildAiSystemPrompt("improve-writing"),
    inputForAudit,
    promptToModel: buildAiUserPrompt("improve-writing", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      selectedText: hasSelection ? args.selectedText : undefined,
    }),
    parse: createMarkdownResponseParser(),
  });

  return result.ok ? { ...result, output: result.output.contentMd } : result;
}
