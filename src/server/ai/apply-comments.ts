import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createMarkdownResponseParser,
} from "./specs";

export async function applyInlineComments(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  const result = await runJsonAction({
    noteId: args.noteId,
    action: "apply-comments",
    systemPrompt: buildAiSystemPrompt("apply-comments"),
    inputForAudit: args.noteContent,
    promptToModel: buildAiUserPrompt("apply-comments", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      promptHint: args.promptHint,
    }),
    parse: createMarkdownResponseParser(),
  });

  return result.ok ? { ...result, output: result.output.contentMd } : result;
}
