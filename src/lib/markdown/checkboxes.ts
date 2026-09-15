export type ParsedCheckbox = {
  line: number;
  checked: boolean;
  title: string;
};

export type ChecklistProgress = {
  total: number;
  completed: number;
  percent: number;
};

const CHECKBOX_RE = /^(\s*(?:[-*+]|\d+\.)\s+)\[(?:(x| )|X)\]\s+(.+)$/i;

export function parseMarkdownCheckboxes(content: string): ParsedCheckbox[] {
  const out: ParsedCheckbox[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const m = CHECKBOX_RE.exec(line);
    if (!m) continue;
    const checked = (m[2] ?? "").toLowerCase() === "x";
    const rest = (m[3] ?? "").trim();
    if (!rest) continue;
    out.push({ line: i, checked, title: rest });
  }
  return out;
}

export function getChecklistProgress(content: string): ChecklistProgress | null {
  if (!content) return null;
  const checkboxes = parseMarkdownCheckboxes(content);
  if (checkboxes.length === 0) return null;
  const completed = checkboxes.filter((c) => c.checked).length;
  const total = checkboxes.length;
  const percent = Math.round((completed / total) * 100);
  return { total, completed, percent };
}

export function hasSubstantialContent(content: string): boolean {
  if (!content) return false;
  const nonCheckbox = content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("#")) return false;
      if (CHECKBOX_RE.test(line)) return false;
      return true;
    })
    .join(" ")
    .trim();
  return nonCheckbox.length > 0;
}
