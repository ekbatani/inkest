import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createSchemaParser,
  ExtractTasksSchema,
  normalizeExtractTasks,
} from "./specs";
import { getUserSettings } from "@/server/users/settings-service";

export type ExtractTasksOutput = typeof ExtractTasksSchema._output;
export type ExtractedTask = ExtractTasksOutput["tasks"][number];

export async function extractTasks(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  promptHint?: string;
}): Promise<AiActionResult<ExtractTasksOutput>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;
  const settings = await getUserSettings();

  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const timingPrompt =
    settings.ai?.taskTimingPrompt?.trim() ||
    "Calculate realistic due dates and start dates relative to the current date. For urgent items, schedule within 1-2 days; medium priority within 1 week; low priority within 2-3 weeks. Sequence tasks logically by dependencies.";

  return runJsonAction({
    noteId: args.noteId,
    action: "extract-tasks",
    systemPrompt: buildAiSystemPrompt("extract-tasks"),
    inputForAudit,
    promptToModel: buildAiUserPrompt("extract-tasks", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      selectedText: hasSelection ? args.selectedText : undefined,
      currentDate,
      timingPrompt,
      promptHint: args.promptHint?.trim() || undefined,
    }),
    parse: createSchemaParser(ExtractTasksSchema, normalizeExtractTasks),
  });
}
