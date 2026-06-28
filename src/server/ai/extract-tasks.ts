import { runJsonAction, type AiActionResult } from "./runner";

const SYSTEM_PROMPT = `You extract actionable tasks from a user's note.
Return a JSON object of the form:
{"tasks":[{"title":"a concise task","priority":"none" | "low" | "medium" | "high","dueDate":null}]}
Rules:
- Only include items that represent concrete next actions, not descriptions or facts.
- Title: imperative mood, <= 90 chars.
- priority defaults to "none". dueDate is always null unless the note explicitly gives a date.
- Respond ONLY with the JSON; no commentary, no Markdown fences.`;

export type ExtractedTask = {
  title: string;
  priority: "none" | "low" | "medium" | "high";
  dueDate: null;
};

export type ExtractTasksOutput = { tasks: ExtractedTask[] };

function parse(raw: string): ExtractTasksOutput | null {
  try {
    const obj = JSON.parse(raw) as ExtractTasksOutput;
    if (!obj || !Array.isArray(obj.tasks)) return null;
    const allowed = new Set(["none", "low", "medium", "high"]);
    const cleaned: ExtractedTask[] = [];
    for (const t of obj.tasks) {
      if (!t || typeof t.title !== "string" || !t.title.trim()) continue;
      const priority = allowed.has(t.priority) ? t.priority : "none";
      cleaned.push({ title: t.title.trim(), priority, dueDate: null });
    }
    return { tasks: cleaned };
  } catch {
    return null;
  }
}

export async function extractTasks(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
}): Promise<AiActionResult<ExtractTasksOutput>> {
  const full = `# ${args.noteTitle}\n\n${args.noteContent}`;
  const hasSelection = Boolean(args.selectedText && args.selectedText.trim());
  const inputForAudit = hasSelection ? args.selectedText! : full;
  const prompt = hasSelection
    ? `Extract tasks from this selection of the note "${args.noteTitle}":\n\n${args.selectedText}`
    : `Extract tasks from the following note:\n\n${full}`;
  return runJsonAction<ExtractTasksOutput>({
    noteId: args.noteId,
    action: "extract-tasks",
    systemPrompt: SYSTEM_PROMPT,
    inputForAudit,
    promptToModel: prompt,
    parse,
  });
}