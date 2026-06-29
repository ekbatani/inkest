import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createMarkdownResponseParser,
} from "./specs";

export async function translateText(args: {
  noteId: string;
  noteTitle: string;
  selectedText: string;
  targetLanguage: string;
}): Promise<AiActionResult<string>> {
  const result = await runJsonAction({
    noteId: args.noteId,
    action: "translate",
    systemPrompt: buildAiSystemPrompt("translate"),
    inputForAudit: args.selectedText,
    promptToModel: buildAiUserPrompt("translate", {
      noteTitle: args.noteTitle,
      selectedText: args.selectedText,
      targetLanguage: args.targetLanguage,
    }),
    parse: createMarkdownResponseParser(),
  });

  return result.ok ? { ...result, output: result.output.contentMd } : result;
}
