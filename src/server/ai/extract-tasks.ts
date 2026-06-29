import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createSchemaParser,
  ExtractTasksSchema,
} from "./specs";

export type ExtractTasksOutput = typeof ExtractTasksSchema._output;
export type ExtractedTask = ExtractTasksOutput["tasks"][number];

export async function extractTasks(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
}): Promise<AiActionResult<ExtractTasksOutput>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;

  return runJsonAction({
    noteId: args.noteId,
    action: "extract-tasks",
    systemPrompt: buildAiSystemPrompt("extract-tasks"),
    inputForAudit,
    promptToModel: buildAiUserPrompt("extract-tasks", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      selectedText: hasSelection ? args.selectedText : undefined,
    }),
    parse: createSchemaParser(ExtractTasksSchema),
  });
}
