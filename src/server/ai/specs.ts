import { z } from "zod";
import { parseAndValidateAiJson, stripReasoningTags } from "./json-engine";

export const NoteEditorActionSchema = z.enum([
  "summarize",
  "improve-writing",
  "gently-edit",
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
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).nullable().optional().default(null),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  dueDate: z.string().trim().min(1).nullable().optional().default(null),
  startDate: z.string().trim().min(1).nullable().optional().default(null),
  sourceQuote: z.string().trim().min(1).nullable().optional().default(null),
});

export const ExtractTasksSchema = z.object({
  tasks: z.array(ExtractedTaskSchema),
});

export const ProjectPlanSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  targetDueDate: z.string().trim().min(1).nullable().optional().default(null),
  milestones: z.array(
    z.object({
      title: z.string().trim().min(1),
      description: z.string().trim().min(1),
      targetDate: z.string().trim().min(1).nullable().optional().default(null),
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

export type ActionSpec = {
  goal: string;
  contextKeys: string[];
  rules: string[];
  outputSchema: z.ZodType<unknown>;
  exampleOutput: Record<string, unknown>;
  normalize?: (val: unknown) => unknown;
};

// ==========================================
// Schema Normalization Helpers
// ==========================================

export function normalizeMarkdownResponse(val: unknown): unknown {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed ? { contentMd: trimmed } : null;
  }

  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    const candidate =
      obj.contentMd ??
      obj.markdown ??
      obj.content ??
      obj.text ??
      obj.result ??
      obj.summary ??
      obj.revisedText ??
      obj.improvedText ??
      obj.translation ??
      obj.explanation ??
      obj.body;

    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return { contentMd: candidate.trim() };
    }
  }

  return val;
}

function normalizePriority(rawPriority: unknown): "none" | "low" | "medium" | "high" {
  if (typeof rawPriority !== "string") return "none";
  const p = rawPriority.trim().toLowerCase();
  if (p === "high" || p === "urgent" || p === "p1" || p === "critical") return "high";
  if (p === "medium" || p === "normal" || p === "p2" || p === "med") return "medium";
  if (p === "low" || p === "minor" || p === "p3") return "low";
  return "none";
}

export function normalizeExtractTasks(val: unknown): unknown {
  let list: unknown[] = [];

  if (Array.isArray(val)) {
    list = val;
  } else if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    const rawList =
      obj.tasks ??
      obj.items ??
      obj.taskList ??
      obj.actionItems ??
      obj.todos ??
      obj.actions ??
      obj.data;

    if (Array.isArray(rawList)) {
      list = rawList;
    }
  } else {
    return val;
  }

  const normalizedTasks = list
    .map((item) => {
      if (typeof item === "string") {
        const title = item.replace(/^-\s*\[\s*\]\s*/, "").trim();
        return title ? { title, priority: "none" as const } : null;
      }

      if (typeof item === "object" && item !== null) {
        const taskObj = item as Record<string, unknown>;
        const rawTitle =
          taskObj.title ?? taskObj.task ?? taskObj.name ?? taskObj.action ?? taskObj.item;
        if (typeof rawTitle !== "string" || !rawTitle.trim()) return null;

        const title = rawTitle.replace(/^-\s*\[\s*\]\s*/, "").trim().slice(0, 120);
        const description =
          typeof taskObj.description === "string" && taskObj.description.trim()
            ? taskObj.description.trim()
            : typeof taskObj.desc === "string" && taskObj.desc.trim()
              ? taskObj.desc.trim()
              : typeof taskObj.details === "string" && taskObj.details.trim()
                ? taskObj.details.trim()
                : null;

        const priority = normalizePriority(taskObj.priority);
        const dueDate =
          typeof taskObj.dueDate === "string" && taskObj.dueDate.trim()
            ? taskObj.dueDate.trim()
            : typeof taskObj.due_date === "string" && taskObj.due_date.trim()
              ? taskObj.due_date.trim()
              : typeof taskObj.due === "string" && taskObj.due.trim()
                ? taskObj.due.trim()
                : typeof taskObj.deadline === "string" && taskObj.deadline.trim()
                  ? taskObj.deadline.trim()
                  : null;

        const startDate =
          typeof taskObj.startDate === "string" && taskObj.startDate.trim()
            ? taskObj.startDate.trim()
            : typeof taskObj.start_date === "string" && taskObj.start_date.trim()
              ? taskObj.start_date.trim()
              : typeof taskObj.start === "string" && taskObj.start.trim()
                ? taskObj.start.trim()
                : null;

        const sourceQuote =
          typeof taskObj.sourceQuote === "string" && taskObj.sourceQuote.trim()
            ? taskObj.sourceQuote.trim()
            : typeof taskObj.source_quote === "string" && taskObj.source_quote.trim()
              ? taskObj.source_quote.trim()
              : typeof taskObj.quote === "string" && taskObj.quote.trim()
                ? taskObj.quote.trim()
                : null;

        return {
          title,
          description,
          priority,
          dueDate,
          startDate,
          sourceQuote,
        };
      }

      return null;
    })
    .filter(Boolean);

  return { tasks: normalizedTasks };
}

export function normalizeProjectPlan(val: unknown): unknown {
  if (typeof val !== "object" || val === null) return val;
  const obj = val as Record<string, unknown>;

  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : typeof obj.name === "string" && obj.name.trim()
        ? obj.name.trim()
        : "Project Plan";

  const summary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : typeof obj.description === "string" && obj.description.trim()
        ? obj.description.trim()
        : typeof obj.overview === "string" && obj.overview.trim()
          ? obj.overview.trim()
          : "Structured project plan breakdown.";

  const targetDueDate =
    typeof obj.targetDueDate === "string" && obj.targetDueDate.trim()
      ? obj.targetDueDate.trim()
      : typeof obj.target_due_date === "string" && obj.target_due_date.trim()
        ? obj.target_due_date.trim()
        : typeof obj.dueDate === "string" && obj.dueDate.trim()
          ? obj.dueDate.trim()
          : typeof obj.targetDate === "string" && obj.targetDate.trim()
            ? obj.targetDate.trim()
            : null;

  const rawMilestones = Array.isArray(obj.milestones) ? obj.milestones : [];
  const milestones = rawMilestones.map((m: unknown) => {
    if (typeof m === "object" && m !== null) {
      const mObj = m as Record<string, unknown>;
      const mTitle =
        typeof mObj.title === "string" && mObj.title.trim()
          ? mObj.title.trim()
          : typeof mObj.name === "string" && mObj.name.trim()
            ? mObj.name.trim()
            : "Phase";

      const mDesc =
        typeof mObj.description === "string" && mObj.description.trim()
          ? mObj.description.trim()
          : typeof mObj.desc === "string" && mObj.desc.trim()
            ? mObj.desc.trim()
            : "";

      const mTargetDate =
        typeof mObj.targetDate === "string" && mObj.targetDate.trim()
          ? mObj.targetDate.trim()
          : typeof mObj.target_date === "string" && mObj.target_date.trim()
            ? mObj.target_date.trim()
            : typeof mObj.dueDate === "string" && mObj.dueDate.trim()
              ? mObj.dueDate.trim()
              : null;

      const rawTasks = Array.isArray(mObj.tasks) ? mObj.tasks : [];
      const tasks = rawTasks
        .map((t) => {
          if (typeof t === "string") return t.replace(/^-\s*\[\s*\]\s*/, "").trim();
          if (typeof t === "object" && t !== null) {
            const tObj = t as Record<string, unknown>;
            const tTitle = tObj.title ?? tObj.task ?? tObj.name;
            return typeof tTitle === "string" ? tTitle.trim() : "";
          }
          return "";
        })
        .filter((t) => t.length > 0);

      return {
        title: mTitle,
        description: mDesc,
        targetDate: mTargetDate,
        tasks,
      };
    }
    return {
      title: "Milestone",
      description: "",
      targetDate: null,
      tasks: [],
    };
  });

  const rawRisks = Array.isArray(obj.risks) ? obj.risks : [];
  const risks = rawRisks
    .map((r) => (typeof r === "string" ? r.trim() : typeof r === "object" && r !== null ? ((r as { risk?: string }).risk ?? JSON.stringify(r)) : ""))
    .filter((r) => r.length > 0);

  const rawNextActions = Array.isArray(obj.nextActions)
    ? obj.nextActions
    : Array.isArray(obj.next_actions)
      ? obj.next_actions
      : [];
  const nextActions = rawNextActions
    .map((a) => (typeof a === "string" ? a.replace(/^-\s*\[\s*\]\s*/, "").trim() : typeof a === "object" && a !== null ? ((a as { action?: string }).action ?? JSON.stringify(a)) : ""))
    .filter((a) => a.length > 0);

  return {
    title,
    summary,
    targetDueDate,
    milestones,
    risks,
    nextActions,
  };
}

export function normalizeMermaid(val: unknown): unknown {
  if (typeof val === "string") {
    let code = val.trim();
    code = code.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let diagramType: "flowchart" | "sequence" | "mindmap" | "timeline" = "flowchart";
    if (/^\s*(sequenceDiagram)/im.test(code)) diagramType = "sequence";
    else if (/^\s*(mindmap)/im.test(code)) diagramType = "mindmap";
    else if (/^\s*(timeline)/im.test(code)) diagramType = "timeline";

    return {
      title: "Diagram",
      diagramType,
      mermaidCode: code,
      explanation: "Mermaid diagram generated from note context.",
    };
  }

  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    const rawCode = obj.mermaidCode ?? obj.code ?? obj.diagram ?? obj.mermaid ?? "";
    let code = typeof rawCode === "string" ? rawCode.trim() : "";
    code = code.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let diagramType = (typeof obj.diagramType === "string" ? obj.diagramType.toLowerCase() : "") as "flowchart" | "sequence" | "mindmap" | "timeline";
    if (!["flowchart", "sequence", "mindmap", "timeline"].includes(diagramType)) {
      if (/^\s*(sequenceDiagram)/im.test(code)) diagramType = "sequence";
      else if (/^\s*(mindmap)/im.test(code)) diagramType = "mindmap";
      else if (/^\s*(timeline)/im.test(code)) diagramType = "timeline";
      else diagramType = "flowchart";
    }

    const title =
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : "Architecture Diagram";

    const explanation =
      typeof obj.explanation === "string" && obj.explanation.trim()
        ? obj.explanation.trim()
        : typeof obj.description === "string" && obj.description.trim()
          ? obj.description.trim()
          : "Diagram overview.";

    return {
      title,
      diagramType,
      mermaidCode: code,
      explanation,
    };
  }

  return val;
}

export function normalizeQuickCaptureNote(val: unknown): unknown {
  if (typeof val === "string") {
    const lines = val.trim().split("\n");
    const firstLine = lines[0]?.replace(/^#*\s*/, "").trim() || "Quick Note";
    const body = lines.slice(1).join("\n").trim() || val.trim();
    return {
      title: firstLine.slice(0, 80),
      contentMd: body,
    };
  }

  if (typeof val === "object" && val !== null) {
    const obj = val as Record<string, unknown>;
    const title =
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim().slice(0, 80)
        : typeof obj.noteTitle === "string" && obj.noteTitle.trim()
          ? obj.noteTitle.trim().slice(0, 80)
          : typeof obj.name === "string" && obj.name.trim()
            ? obj.name.trim().slice(0, 80)
            : "Quick Note";

    const contentMd =
      typeof obj.contentMd === "string" && obj.contentMd.trim()
        ? obj.contentMd.trim()
        : typeof obj.content === "string" && obj.content.trim()
          ? obj.content.trim()
          : typeof obj.body === "string" && obj.body.trim()
            ? obj.body.trim()
            : typeof obj.text === "string" && obj.text.trim()
              ? obj.text.trim()
              : "";

    return {
      title,
      contentMd,
    };
  }

  return val;
}

export const AI_ACTION_SPECS: Record<AiActionId, ActionSpec> = {
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
    exampleOutput: {
      contentMd: "### Overview\nShort summary of the note.\n\n### Key Highlights\n- Point 1\n- Point 2\n- Point 3",
    },
    normalize: normalizeMarkdownResponse,
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
    exampleOutput: {
      contentMd: "## Improved Section\nRefined and polished Markdown text preserving all original links and formatting.",
    },
    normalize: normalizeMarkdownResponse,
  },
  "gently-edit": {
    goal: "Gently edit and polish note text, making targeted improvements to flow, phrasing, and structure without disrupting the author's original voice or formatting.",
    contextKeys: ["noteTitle", "noteContent", "selectedText", "promptHint"],
    rules: [
      "If selectedText is present, edit only that selection.",
      "Make subtle, gentle edits: fix awkward phrasing, punctuation, sentence flow, and clarity.",
      "Retain all Markdown markup, link targets, headers, bold/italics, and list nesting exactly.",
      "Never delete significant paragraphs or alter the core message.",
      "Return the complete improved text ready for drop-in diff and merge.",
    ],
    outputSchema: MarkdownResponseSchema,
    exampleOutput: {
      contentMd: "Complete polished text ready for direct replacement, maintaining voice and style.",
    },
    normalize: normalizeMarkdownResponse,
  },
  "extract-tasks": {
    goal: "Extract concrete next actions, action items, and checklists from note content with realistic timing.",
    contextKeys: ["noteTitle", "noteContent", "selectedText", "currentDate", "timingPrompt", "promptHint"],
    rules: [
      "If selectedText is present, extract tasks only from that selection.",
      "Return only concrete, actionable tasks and skip background facts or goals with no action.",
      "Write task titles in imperative mood and keep them concise (max 90 characters).",
      "Assign priority ('none', 'low', 'medium', 'high') reflecting urgency or impact.",
      "Estimate and populate dueDate (and optional startDate) in YYYY-MM-DD format using currentDate as reference, taking into account explicit deadlines in the note and following timingPrompt heuristics.",
      "Preserve any source context in description or sourceQuote when helpful.",
    ],
    outputSchema: ExtractTasksSchema,
    exampleOutput: {
      tasks: [
        {
          title: "Complete initial prototype API integration",
          description: "Connect endpoint handlers and test authentication flow",
          priority: "high",
          dueDate: "2026-09-05",
          startDate: "2026-09-01",
          sourceQuote: "Finish the auth integration by next Friday",
        },
        {
          title: "Update documentation guide",
          description: null,
          priority: "medium",
          dueDate: "2026-09-12",
          startDate: null,
          sourceQuote: null,
        },
      ],
    },
    normalize: normalizeExtractTasks,
  },
  "create-project-plan": {
    goal: "Turn note goals into a structured project plan with phased milestones and timelines.",
    contextKeys: ["noteTitle", "noteContent", "currentDate", "timingPrompt", "promptHint"],
    rules: [
      "Use promptHint and timingPrompt as guidance for scope, milestone duration, and scheduling.",
      "Keep the plan practical, grounded in the supplied context, and structured into progressive milestones.",
      "Milestones should describe meaningful phases of work with target dates formatted as YYYY-MM-DD or relative week indicators.",
      "Tasks should be concrete next steps, not vague aspirations.",
      "Do not assume teams or budgets not provided unless clearly framed as recommendations.",
    ],
    outputSchema: ProjectPlanSchema,
    exampleOutput: {
      title: "Workspace Modernization Project Plan",
      summary: "End-to-end plan to upgrade application services, database schemas, and AI integrations.",
      targetDueDate: "2026-10-15",
      milestones: [
        {
          title: "Phase 1: Architecture & Data Layer",
          description: "Finalize schema updates and data persistence layer.",
          targetDate: "2026-09-15",
          tasks: ["Draft Drizzle migration", "Implement service repository functions"],
        },
        {
          title: "Phase 2: Frontend & UI Integration",
          description: "Build reactive components and editor enhancements.",
          targetDate: "2026-09-30",
          tasks: ["Add interactive planning modal", "Connect real-time validation"],
        },
      ],
      risks: ["Third-party API rate limits", "Migration compatibility on legacy records"],
      nextActions: ["Run initial schema migration", "Schedule kickoff alignment"],
    },
    normalize: normalizeProjectPlan,
  },
  "generate-mermaid": {
    goal: "Generate a Mermaid diagram from note context and optional user guidance.",
    contextKeys: ["noteTitle", "noteContent", "selectedText", "promptHint"],
    rules: [
      "If selectedText is present, use it as the primary source context.",
      "Use promptHint to shape the diagram if it is present.",
      "Choose the simplest supported diagram type ('flowchart', 'sequence', 'mindmap', 'timeline') that fits the request.",
      "Return raw Mermaid code only in mermaidCode, without outer markdown fences.",
      "Keep node identifiers short and readable.",
    ],
    outputSchema: MermaidSchema,
    exampleOutput: {
      title: "System Architecture Flow",
      diagramType: "flowchart",
      mermaidCode: "flowchart TD\n  Client[Client App] --> API[API Server]\n  API --> DB[(Database)]",
      explanation: "Demonstrates request flow between client, API, and database.",
    },
    normalize: normalizeMermaid,
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
    exampleOutput: {
      contentMd: "### Concept Explanation\nClear, beginner-friendly explanation of the highlighted concept and context.",
    },
    normalize: normalizeMarkdownResponse,
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
    exampleOutput: {
      contentMd: "Translated Markdown content preserving all bold, lists, and formatting.",
    },
    normalize: normalizeMarkdownResponse,
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
    exampleOutput: {
      contentMd: "[selected passage](inkest-comment:Consider%20clarifying%20this%20assumption%20with%20metrics.)",
    },
    normalize: normalizeMarkdownResponse,
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
    exampleOutput: {
      contentMd: "# Note Title\n\nClean revised note body with inline comments integrated seamlessly.",
    },
    normalize: normalizeMarkdownResponse,
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
    exampleOutput: {
      title: "Quarterly Strategy Alignment",
      contentMd: "# Quarterly Strategy Alignment\n\n## Objectives\n- Goal 1\n- Goal 2\n\n## Action Items\n- [ ] Initial kickoff meeting",
    },
    normalize: normalizeQuickCaptureNote,
  },
};

function stableStringify(value: unknown) {
  return JSON.stringify(value, null, 2);
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
    `You are the Inkest AI Assistant, deeply integrated into Inkest — a private, Markdown-first personal workspace.`,
    `Executing Action: "${action}"`,
    spec.goal,
    "",
    "WORKSPACE DOMAIN CONVENTIONS:",
    "- Notes: Markdown notes with live preview, wiki-links ([[Note Title]]), tags (#tag), and checklist items (- [ ]).",
    "- Projects & Subprojects: Hierarchical projects with milestones, priority levels ('none', 'low', 'medium', 'high'), and target due dates.",
    "- Tasks: Actionable checklist items with imperative titles, start dates, and due dates.",
    "- Mermaid: Standard Markdown mermaid diagrams (flowchart, sequence, mindmap, timeline).",
    "",
    "RESPONSE INSTRUCTIONS:",
    "1. Respond ONLY with a valid, clean JSON object matching the template below.",
    "2. All string fields containing Markdown MUST have newlines properly escaped (\\n) and quotes escaped (\\\").",
    "3. Dates must be formatted as YYYY-MM-DD.",
    "4. Do NOT wrap the JSON in markdown fences (```json) or include conversational commentary before/after.",
    "",
    "EXACT JSON RESPONSE TEMPLATE:",
    stableStringify(spec.exampleOutput),
    "",
    "RULES & CONSTRAINTS:",
    ...spec.rules.map((rule) => `- ${rule}`),
  ].join("\n");
}

export function buildAiUserPrompt(action: AiActionId, context: Record<string, unknown>) {
  return [
    `Complete the "${action}" action using this request context JSON:`,
    stableStringify(compactContext(context)),
  ].join("\n\n");
}

export function createSchemaParser<T>(
  schema: z.ZodType<T>,
  normalizer?: (val: unknown) => unknown,
) {
  return (raw: string): T | null => {
    return parseAndValidateAiJson(raw, schema, normalizer);
  };
}

export function createMarkdownResponseParser() {
  const parseJson = createSchemaParser(MarkdownResponseSchema, normalizeMarkdownResponse);

  return (raw: string) => {
    const parsedJson = parseJson(raw);
    if (parsedJson) return parsedJson;

    const cleaned = stripReasoningTags(raw).trim();
    if (!cleaned) return null;

    // Fallback: If output is raw markdown without JSON structure
    const fallbackResult = MarkdownResponseSchema.safeParse({ contentMd: cleaned });
    return fallbackResult.success ? fallbackResult.data : null;
  };
}

export function renderProjectPlanMarkdown(plan: z.infer<typeof ProjectPlanSchema>) {
  const lines: string[] = [`# ${plan.title}`, ""];
  if (plan.targetDueDate) {
    lines.push(`**Target Due Date:** ${plan.targetDueDate}`, "");
  }
  lines.push(plan.summary);

  if (plan.milestones.length > 0) {
    lines.push("", "## Milestones");
    for (const [index, milestone] of plan.milestones.entries()) {
      const dateBadge = milestone.targetDate ? ` *(Target: ${milestone.targetDate})*` : "";
      lines.push("", `${index + 1}. **${milestone.title}**${dateBadge}`, `${milestone.description}`);
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
