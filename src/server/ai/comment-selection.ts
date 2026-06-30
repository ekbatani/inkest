import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createMarkdownResponseParser,
} from "./specs";

export async function commentOnSelection(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  const result = await runJsonAction({
    noteId: args.noteId,
    action: "comment-selection",
    systemPrompt: buildAiSystemPrompt("comment-selection"),
    inputForAudit: args.selectedText,
    promptToModel: buildAiUserPrompt("comment-selection", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      selectedText: args.selectedText,
      promptHint: args.promptHint,
    }),
    parse: createMarkdownResponseParser(),
  });

  return result.ok ? { ...result, output: result.output.contentMd } : result;
}
