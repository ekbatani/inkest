import { runTextAction } from "./runner";

const SYSTEM_PROMPT = `You create a project plan in Markdown based on the user's input.
Structure:
- "## Goal" — 1-2 sentences
- "## Scope" — bullet list of in/out of scope
- "## Milestones" — numbered milestones with short descriptions
- "## Tasks" — markdown task list (- [ ] ...) grouped under milestones
- "## Risks" — bullet list
Respond in Markdown only.`;

export async function createProjectPlan(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  promptHint?: string;
}) {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const prompt = args.promptHint?.trim()
    ? `Create a project plan from these goals. Seed content:\n${full}\n\nAdditional request: ${args.promptHint}`
    : `Create a project plan from this note:\n\n${full}`;
  return runTextAction({
    noteId: args.noteId,
    action: "create-project-plan",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit: full,
    promptToModel: prompt,
  });
}