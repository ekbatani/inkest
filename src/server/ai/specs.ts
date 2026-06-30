import { z } from "zod";

export const NoteEditorActionSchema = z.enum([
  "summarize",
  "improve-writing",
  "extract-tasks",
  "create-project-plan",
  "generate-mermaid",
  "explain",
  "translate",
  "comment-selection",
  "apply-comments",
]);

export type NoteEditorActionId = z.infer<typeof NoteEditorActionSchema>;
export type AiActionId = NoteEditorActionId | "create-note-from-prompt";

export const MarkdownResponseSchema = z.object({
  contentMd: z.string().trim().min(1),
});

export const QuickCaptureNoteSchema = z.object({
  title: z.string().trim().min(1).max(80),
  contentMd: z.string().trim().min(1),
});

export const ExtractedTaskSchema = z.object({
  title: z.string().trim().min(1).max(90),
  description: z.string().trim().min(1).nullable().optional().default(null),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  dueDate: z.string().trim().min(1).nullable().optional().default(null),
  sourceQuote: z.string().trim().min(1).nullable().optional().default(null),
});

export const ExtractTasksSchema = z.object({
  tasks: z.array(ExtractedTaskSchema),
});

export const ProjectPlanSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  milestones: z.array(
    z.object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      tasks: z.array(z.string().trim().min(1)),
    }),
  ),
  risks: z.array(z.string().trim().min(1)),
  nextActions: z.array(z.string().trim().min(1)),
});

export const MermaidSchema = z.object({
  title: z.string().trim().min(1),
  diagramType: z.enum(["flowchart", "sequence", "mindmap", "timeline"]),
  mermaidCode: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
});

type ActionSpec = {
  goal: string;
  contextKeys: string[];
  rules: string[];
  outputSchema: z.ZodType<unknown>;
};

const AI_ACTION_SPECS: Record<AiActionId, ActionSpec> = {
  summarize: {
    goal: "Summarize note content into concise, useful Markdown.",
    contextKeys: ["noteTitle", "noteContent", "selectedText"],
    rules: [
      "If selectedText is present, summarize only that selection.",
      "Start with a short 1-2 sentence summary.",
      "Include 3-5 key points when the material supports it.",
      "Mention explicit action items only when they appear in the source.",
      "Do not invent facts or advice not grounded in the provided context.",
    ],
    outputSchema: MarkdownResponseSchema,
  },
  "improve-writing": {
    goal: "Rewrite the user's writing for clarity while preserving meaning.",
    contextKeys: ["noteTitle", "noteContent", "selectedText"],
    rules: [
      "If selectedText is present, rewrite only that selection.",
      "Preserve Markdown structure such as headings, lists, checklists, links, and emphasis.",
      "Fix grammar, clarity, and flow without changing intent.",
      "Do not add new facts, claims, or sections that are not implied by the source.",
    ],
    outputSchema: MarkdownResponseSchema,
  },
  "extract-tasks": {
    goal: "Extract concrete next actions from note content.",
    contextKeys: ["noteTitle", "noteContent", "selectedText"],
    rules: [
      "If selectedText is present, extract tasks only from that selection.",
      "Return only concrete, actionable tasks and skip background facts or goals with no action.",
      "Write task titles in imperative mood and keep them concise.",
      "Set priority to none unless urgency is clearly implied.",
      "Use dueDate only when an explicit date or deadline appears in the source.",
    ],
    outputSchema: ExtractTasksSchema,
  },
  "create-project-plan": {
    goal: "Turn note goals into a structured project plan.",
    contextKeys: ["noteTitle", "noteContent", "promptHint"],
    rules: [
      "Use promptHint only as an additional constraint, not as a replacement for the note context.",
      "Keep the plan practical and scoped to the supplied material.",
      "Milestones should describe meaningful phases of work.",
      "Tasks should be concrete next steps, not vague aspirations.",
      "Do not assume teams, budgets, timelines, or technical details that were not provided unless clearly necessary and marked conservatively.",
    ],
    outputSchema: ProjectPlanSchema,
  },
  "generate-mermaid": {
    goal: "Generate a Mermaid diagram from note context and optional user guidance.",
    contextKeys: ["noteTitle", "noteContent", "selectedText", "promptHint"],
    rules: [
      "If selectedText is present, use it as the primary source context.",
      "Use promptHint to shape the diagram if it is present.",
      "Choose the simplest supported diagram type that fits the request.",
      "Return raw Mermaid code only in mermaidCode, without fences.",
      "Keep node identifiers short and readable.",
    ],
    outputSchema: MermaidSchema,
  },
  explain: {
    goal: "Explain a selected passage in clear, friendly Markdown.",
    contextKeys: ["noteTitle", "selectedText"],
    rules: [
      "Explain only the selectedText.",
      "Keep the explanation short unless the source is complex.",
      "Define technical terms inline when helpful.",
      "Do not drift into unrelated general advice.",
    ],
    outputSchema: MarkdownResponseSchema,
  },
  translate: {
    goal: "Translate selected text into the requested target language.",
    contextKeys: ["noteTitle", "selectedText", "targetLanguage"],
    rules: [
      "Translate only the selectedText.",
      "Preserve Markdown structure and formatting.",
      "Do not add commentary or translator notes.",
      "Keep proper nouns and product names unchanged unless the target language convention strongly requires translation.",
    ],
    outputSchema: MarkdownResponseSchema,
  },
  "comment-selection": {
    goal: "Add a concise AI review comment to selected note text.",
    contextKeys: ["noteTitle", "noteContent", "selectedText", "promptHint"],
    rules: [
      "Return the selectedText as a Markdown link using exactly this annotation shape: [selected text](inkest-comment:URL_ENCODED_COMMENT).",
      "URL_ENCODED_COMMENT must be a concise review comment encoded with percent encoding.",
      "Do not rewrite selectedText unless the user explicitly asks for a suggested replacement in promptHint.",
      "Keep the comment grounded in the note context and selection.",
      "Do not wrap the output in a code fence.",
    ],
    outputSchema: MarkdownResponseSchema,
  },
  "apply-comments": {
    goal: "Revise note Markdown by reading inline Inkest comments and applying useful edits.",
    contextKeys: ["noteTitle", "noteContent", "promptHint"],
    rules: [
      "Read inline comments encoded as [text](inkest-comment:URL_ENCODED_COMMENT).",
      "Apply comments that clearly improve the note while preserving the author's intent.",
      "Remove comment annotations after applying them.",
      "Preserve unrelated Markdown structure, links, highlights, checklists, code fences, and wiki links.",
      "If a comment is unclear or should not be applied, keep the original text and remove only the comment annotation.",
      "Return the complete revised note body, not a summary.",
    ],
    outputSchema: MarkdownResponseSchema,
  },
  "create-note-from-prompt": {
    goal: "Draft a polished note from a short user request.",
    contextKeys: ["prompt"],
    rules: [
      "Expand the request into a practical personal note.",
      "Choose a concise note title no longer than 80 characters.",
      "Use headings and bullet points when they improve readability.",
      "Do not wrap the output in code fences.",
    ],
    outputSchema: QuickCaptureNoteSchema,
  },
};

function stableStringify(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function extractJsonCandidate(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("```")) {
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenceMatch?.[1]) {
      return fenceMatch[1].trim();
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function compactContext<T extends Record<string, unknown>>(context: T) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      return typeof value !== "string" || value.trim().length > 0;
    }),
  );
}

export function buildAiSystemPrompt(action: AiActionId) {
  const spec = AI_ACTION_SPECS[action];

  return [
    `You are executing the inkest AI action "${action}".`,
    spec.goal,
    "",
    "The user request context will be supplied as a JSON object.",
    `Expected context keys: ${spec.contextKeys.join(", ")}.`,
    "",
    "Return exactly one valid JSON object matching this schema:",
    stableStringify(z.toJSONSchema(spec.outputSchema)),
    "",
    "Rules:",
    ...spec.rules.map((rule) => `- ${rule}`),
    "- Do not return Markdown fences around the JSON.",
    "- Do not include explanatory prose before or after the JSON.",
  ].join("\n");
}

export function buildAiUserPrompt(action: AiActionId, context: Record<string, unknown>) {
  return [
    `Complete the "${action}" action using this request context JSON:`,
    stableStringify(compactContext(context)),
  ].join("\n\n");
}

export function createSchemaParser<T>(schema: z.ZodType<T>) {
  return (raw: string): T | null => {
    const candidate = extractJsonCandidate(raw);
    if (!candidate) return null;

    try {
      const parsed = JSON.parse(candidate);
      const result = schema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  };
}

export function createMarkdownResponseParser() {
  const parseJson = createSchemaParser(MarkdownResponseSchema);

  return (raw: string) => {
    const parsedJson = parseJson(raw);
    if (parsedJson) return parsedJson;

    const trimmed = raw.trim();
    if (!trimmed) return null;

    const result = MarkdownResponseSchema.safeParse({ contentMd: trimmed });
    return result.success ? result.data : null;
  };
}

export function renderProjectPlanMarkdown(plan: z.infer<typeof ProjectPlanSchema>) {
  const lines: string[] = [`# ${plan.title}`, "", plan.summary];

  if (plan.milestones.length > 0) {
    lines.push("", "## Milestones");
    for (const [index, milestone] of plan.milestones.entries()) {
      lines.push("", `${index + 1}. **${milestone.title}**`, `${milestone.description}`);
      if (milestone.tasks.length > 0) {
        lines.push("", "Tasks:");
        for (const task of milestone.tasks) {
          lines.push(`- [ ] ${task}`);
        }
      }
    }
  }

  if (plan.risks.length > 0) {
    lines.push("", "## Risks");
    for (const risk of plan.risks) {
      lines.push(`- ${risk}`);
    }
  }

  if (plan.nextActions.length > 0) {
    lines.push("", "## Next Actions");
    for (const action of plan.nextActions) {
      lines.push(`- [ ] ${action}`);
    }
  }

  return lines.join("\n").trim();
}

export function renderMermaidMarkdown(diagram: z.infer<typeof MermaidSchema>) {
  return [
    `## ${diagram.title}`,
    "",
    "```mermaid",
    diagram.mermaidCode.trim(),
    "```",
    "",
    diagram.explanation,
  ]
    .join("\n")
    .trim();
}
