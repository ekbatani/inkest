import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createMarkdownResponseParser,
} from "./specs";

export async function explainText(args: {
  noteId: string;
  noteTitle: string;
  selectedText: string;
}): Promise<AiActionResult<string>> {
  const result = await runJsonAction({
    noteId: args.noteId,
    action: "explain",
    systemPrompt: buildAiSystemPrompt("explain"),
    inputForAudit: args.selectedText,
    promptToModel: buildAiUserPrompt("explain", {
      noteTitle: args.noteTitle,
      selectedText: args.selectedText,
    }),
    parse: createMarkdownResponseParser(),
  });

  return result.ok ? { ...result, output: result.output.contentMd } : result;
}
