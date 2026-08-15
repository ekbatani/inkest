import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createMarkdownResponseParser,
} from "./specs";

export async function gentlyEdit(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;

  const result = await runJsonAction({
    noteId: args.noteId,
    action: "gently-edit",
    systemPrompt: buildAiSystemPrompt("gently-edit"),
    inputForAudit,
    promptToModel: buildAiUserPrompt("gently-edit", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      selectedText: hasSelection ? args.selectedText : undefined,
      promptHint: args.promptHint?.trim() || undefined,
    }),
    parse: createMarkdownResponseParser(),
  });

  return result.ok ? { ...result, output: result.output.contentMd } : result;
}
