import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createSchemaParser,
  normalizeProjectPlan,
  ProjectPlanSchema,
  renderProjectPlanMarkdown,
} from "./specs";
import { getUserSettings } from "@/server/users/settings-service";

export async function createProjectPlan(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const settings = await getUserSettings();

  const now = new Date();
  const currentDate = now.toISOString().slice(0, 10);
  const timingPrompt =
    settings.ai?.projectPlanningPrompt?.trim() ||
    settings.ai?.taskTimingPrompt?.trim() ||
    "Break down goals into concrete phased milestones with realistic deliverables, dependencies, and actionable tasks with scheduled timelines.";

  const result = await runJsonAction({
    noteId: args.noteId,
    action: "create-project-plan",
    systemPrompt: buildAiSystemPrompt("create-project-plan"),
    inputForAudit: full,
    // Grounding pulls in linked notes so plans can reference existing material.
    enableGrounding: true,
    promptToModel: buildAiUserPrompt("create-project-plan", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      currentDate,
      timingPrompt,
      promptHint: args.promptHint?.trim() || undefined,
    }),
    parse: createSchemaParser(ProjectPlanSchema, normalizeProjectPlan),
  });

  return result.ok
    ? { ...result, output: renderProjectPlanMarkdown(result.output) }
    : result;
}
