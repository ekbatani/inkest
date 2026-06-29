import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createSchemaParser,
  MermaidSchema,
  renderMermaidMarkdown,
} from "./specs";

export async function generateMermaid(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const seed = args.selectedText?.trim() || full;

  const result = await runJsonAction({
    noteId: args.noteId,
    action: "generate-mermaid",
    systemPrompt: buildAiSystemPrompt("generate-mermaid"),
    inputForAudit: seed,
    promptToModel: buildAiUserPrompt("generate-mermaid", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      selectedText: args.selectedText,
      promptHint: args.promptHint,
    }),
    parse: createSchemaParser(MermaidSchema),
  });

  return result.ok
    ? { ...result, output: renderMermaidMarkdown(result.output) }
    : result;
}
