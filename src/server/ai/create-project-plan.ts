import { type AiActionResult, runJsonAction } from "./runner";
import {
  buildAiSystemPrompt,
  buildAiUserPrompt,
  createSchemaParser,
  ProjectPlanSchema,
  renderProjectPlanMarkdown,
} from "./specs";

export async function createProjectPlan(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  promptHint?: string;
}): Promise<AiActionResult<string>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;

  const result = await runJsonAction({
    noteId: args.noteId,
    action: "create-project-plan",
    systemPrompt: buildAiSystemPrompt("create-project-plan"),
    inputForAudit: full,
    promptToModel: buildAiUserPrompt("create-project-plan", {
      noteTitle: args.noteTitle,
      noteContent: args.noteContent,
      promptHint: args.promptHint,
    }),
    parse: createSchemaParser(ProjectPlanSchema),
  });

  return result.ok
    ? { ...result, output: renderProjectPlanMarkdown(result.output) }
    : result;
}
