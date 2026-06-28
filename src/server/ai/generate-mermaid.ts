import { runTextAction } from "./runner";

const SYSTEM_PROMPT = `You generate a Mermaid diagram from a user's request.
Rules:
- Output ONLY a fenced Mermaid code block, e.g.:
\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`
- Use the simplest diagram type that fits (flowchart / sequence / state / gantt).
- Keep node ids short; node labels in English unless the input is otherwise.
- Do not add narrative text outside the code block.`;

export async function generateMermaid(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
  promptHint?: string;
}) {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const seed = args.selectedText?.trim() || full;
  const prompt = args.promptHint?.trim()
    ? `Generate a Mermaid diagram matching this request: ${args.promptHint}\n\nContext:\n${seed}`
    : `Generate a Mermaid diagram that summarises the structure of:\n\n${seed}`;
  return runTextAction({
    noteId: args.noteId,
    action: "generate-mermaid",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit: seed,
    promptToModel: prompt,
  });
}