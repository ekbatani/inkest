import { describe, it, expect } from "bun:test";
import {
  stripReasoningTags,
  extractJsonCandidates,
  repairTruncatedJson,
  tryParseJson,
  parseAndValidateAiJson,
} from "@/server/ai/json-engine";
import {
  ExtractTasksSchema,
  normalizeExtractTasks,
  normalizeProjectPlan,
  normalizeMermaid,
  normalizeQuickCaptureNote,
  createMarkdownResponseParser,
  buildAiSystemPrompt,
  buildAiUserPrompt,
} from "@/server/ai/specs";

describe("AI Resilient JSON Engine & Templates", () => {
  describe("Reasoning / Thought Tag Stripping", () => {
    it("strips <think> tags containing code and curly braces", () => {
      const raw = `<think>
I need to return JSON:
{ "some_dummy": 123 }
Let's format the response now.
</think>
{
  "contentMd": "# Note Title\\n\\nNote body."
}`;
      const cleaned = stripReasoningTags(raw);
      expect(cleaned).not.toContain("<think>");
      expect(cleaned).not.toContain("some_dummy");
      expect(cleaned).toContain('"contentMd"');
    });

    it("strips <thought> and <reasoning> blocks", () => {
      const raw = `<thought>Thinking deeply about the task...</thought><reasoning>Step 1... Step 2</reasoning>{"tasks":[{"title":"Task 1"}]}`;
      const cleaned = stripReasoningTags(raw);
      expect(cleaned).toBe('{"tasks":[{"title":"Task 1"}]}');
    });

    it("strips ```thought``` code fences", () => {
      const raw = "```thought\nAnalyzing the query...\n```\n```json\n{\"contentMd\":\"Result\"}\n```";
      const cleaned = stripReasoningTags(raw);
      expect(cleaned).not.toContain("Analyzing the query");
      expect(cleaned).toContain('{"contentMd":"Result"}');
    });
  });

  describe("JSON Candidate Extraction", () => {
    it("extracts JSON enclosed in markdown code fences with surrounding prose", () => {
      const raw = `Here is the JSON response you requested for your workspace:

\`\`\`json
{
  "title": "Refactor Data Layer",
  "contentMd": "Detailed plan for refactoring."
}
\`\`\`

Hope this helps! Let me know if you need anything else.`;

      const candidates = extractJsonCandidates(raw);
      expect(candidates.length > 0).toBe(true);
      expect(candidates[0]).toContain('"title": "Refactor Data Layer"');
    });

    it("extracts balanced JSON objects and arrays embedded directly in text", () => {
      const raw = `Sure! I found these tasks: [{"title": "Buy milk"}, {"title": "Call dentist"}] for your note.`;
      const candidates = extractJsonCandidates(raw);
      expect(candidates.some((c) => c.startsWith("[") && c.endsWith("]"))).toBe(true);
    });
  });

  describe("JSON Repair Strategies", () => {
    it("repairs raw unescaped newlines and carriage returns inside string literals", () => {
      const raw = `{\n  "contentMd": "# Heading\n\nThis is a multiline\nparagraph with \\"quotes\\".\n"\n}`;
      const parsed = tryParseJson(raw) as { contentMd: string };
      expect(parsed).toBeDefined();
      expect(parsed.contentMd).toContain("# Heading");
      expect(parsed.contentMd).toContain("This is a multiline");
    });

    it("strips single-line and multi-line comments", () => {
      const raw = `{\n  // This is a comment\n  "title": "Clean Project", /* block comment */\n  "summary": "Summary here"\n}`;
      const parsed = tryParseJson(raw) as { title: string; summary: string };
      expect(parsed.title).toBe("Clean Project");
      expect(parsed.summary).toBe("Summary here");
    });

    it("removes trailing commas in objects and arrays", () => {
      const raw = `{\n  "tasks": [\n    {\n      "title": "Task 1",\n    },\n    {\n      "title": "Task 2",\n    },\n  ],\n}`;
      const parsed = tryParseJson(raw) as { tasks: Array<{ title: string }> };
      expect(parsed.tasks.length).toBe(2);
      expect(parsed.tasks[0].title).toBe("Task 1");
    });

    it("normalizes Python literals (True, False, None)", () => {
      const raw = `{\n  "title": "Test",\n  "active": True,\n  "disabled": False,\n  "dueDate": None\n}`;
      const parsed = tryParseJson(raw) as { active: boolean; disabled: boolean; dueDate: null };
      expect(parsed.active).toBe(true);
      expect(parsed.disabled).toBe(false);
      expect(parsed.dueDate).toBeNull();
    });

    it("repairs truncated JSON responses gracefully", () => {
      const raw = `{"title": "Sprint Planning", "milestones": [{"title": "Milestone 1", "tasks": ["Task 1", "Task 2`;
      const repaired = repairTruncatedJson(raw);
      const parsed = JSON.parse(repaired) as { title: string; milestones: Array<{ title: string; tasks: string[] }> };
      expect(parsed.title).toBe("Sprint Planning");
      expect(parsed.milestones[0].tasks.length).toBe(2);
    });
  });

  describe("Schema Normalization & Coercion", () => {
    it("normalizes tasks when AI returns a root array instead of an object", () => {
      const rawArray = [
        { task: "Design API endpoints", priority: "URGENT", due_date: "2026-09-01" },
        { name: "Write test suite", priority: "normal", start_date: "2026-09-02" },
      ];
      const normalized = normalizeExtractTasks(rawArray) as { tasks: Array<{ title: string; priority: string; dueDate: string | null }> };
      expect(normalized.tasks.length).toBe(2);
      expect(normalized.tasks[0].title).toBe("Design API endpoints");
      expect(normalized.tasks[0].priority).toBe("high");
      expect(normalized.tasks[0].dueDate).toBe("2026-09-01");
      expect(normalized.tasks[1].title).toBe("Write test suite");
      expect(normalized.tasks[1].priority).toBe("medium");
    });

    it("normalizes project plan with snake_case and milestone objects", () => {
      const rawPlan = {
        title: "Workspace Redesign",
        summary: "Project plan overview",
        target_due_date: "2026-10-01",
        milestones: [
          {
            title: "Phase 1",
            desc: "Setup core infrastructure",
            target_date: "2026-09-10",
            tasks: [{ title: "Setup database" }, "Deploy container"],
          },
        ],
        risks: ["Risk 1"],
        next_actions: ["Action 1"],
      };

      const normalized = normalizeProjectPlan(rawPlan) as {
        title: string;
        targetDueDate: string;
        milestones: Array<{ title: string; description: string; tasks: string[] }>;
      };

      expect(normalized.title).toBe("Workspace Redesign");
      expect(normalized.targetDueDate).toBe("2026-10-01");
      expect(normalized.milestones[0].tasks).toEqual(["Setup database", "Deploy container"]);
    });

    it("normalizes mermaid output by stripping inner markdown fences", () => {
      const rawMermaid = {
        title: "Authentication Flow",
        diagramType: "sequence",
        mermaidCode: "```mermaid\nsequenceDiagram\n  User->>Server: Login\n  Server-->>User: Token\n```",
        explanation: "Auth flow diagram.",
      };

      const normalized = normalizeMermaid(rawMermaid) as { mermaidCode: string; diagramType: string };
      expect(normalized.mermaidCode).toBe("sequenceDiagram\n  User->>Server: Login\n  Server-->>User: Token");
      expect(normalized.diagramType).toBe("sequence");
    });

    it("normalizes quick capture notes from plain text or alternative keys", () => {
      const plain = "# Meeting Notes\n\nDiscussed roadmap and timeline.";
      const normalized = normalizeQuickCaptureNote(plain) as { title: string; contentMd: string };
      expect(normalized.title).toBe("Meeting Notes");
      expect(normalized.contentMd).toBe("Discussed roadmap and timeline.");
    });
  });

  describe("End-to-End Validation with Complex Malformed AI Outputs", () => {
    it("parses ExtractTasksSchema from raw LLM output with reasoning, fences, and trailing commas", () => {
      const messyResponse = `
<think>
Let's extract tasks from the note:
1. Update database
2. Build UI
</think>

Here are the extracted action items:
\`\`\`json
{
  "actionItems": [
    {
      "task": "Update database schema",
      "priority": "HIGH",
      "due_date": "2026-09-15",
      "source_quote": "We need database schema updated by Sep 15",
    },
    {
      "task": "Build UI components",
      "priority": "LOW",
    },
  ]
}
\`\`\`
Hope this matches your workspace needs!
`;

      const result = parseAndValidateAiJson(messyResponse, ExtractTasksSchema, normalizeExtractTasks);
      expect(result).not.toBeNull();
      expect(result?.tasks.length).toBe(2);
      expect(result?.tasks[0].title).toBe("Update database schema");
      expect(result?.tasks[0].priority).toBe("high");
      expect(result?.tasks[0].dueDate).toBe("2026-09-15");
      expect(result?.tasks[0].sourceQuote).toContain("database schema updated");
    });

    it("parses MarkdownResponseSchema using createMarkdownResponseParser with raw markdown fallback", () => {
      const parser = createMarkdownResponseParser();

      // Case 1: Pure Markdown without JSON
      const rawMarkdown = "### Summary of Note\n\n- Key Point 1\n- Key Point 2\n\nNext steps are ready.";
      const res1 = parser(rawMarkdown);
      expect(res1?.contentMd).toBe(rawMarkdown);

      // Case 2: JSON with thinking tags
      const jsonWithThinking = `<think>Drafting summary...</think>{"contentMd": "Polished text."}`;
      const res2 = parser(jsonWithThinking);
      expect(res2?.contentMd).toBe("Polished text.");
    });
  });

  describe("Standardized Prompt Templates", () => {
    it("generates system prompt with workspace domain conventions and exact JSON template", () => {
      const systemPrompt = buildAiSystemPrompt("extract-tasks");
      expect(systemPrompt).toContain("Inkest AI Assistant");
      expect(systemPrompt).toContain("WORKSPACE DOMAIN CONVENTIONS");
      expect(systemPrompt).toContain("EXACT JSON RESPONSE TEMPLATE");
      expect(systemPrompt).toContain("YYYY-MM-DD");
    });

    it("generates user prompt with structured context", () => {
      const userPrompt = buildAiUserPrompt("extract-tasks", {
        noteTitle: "Launch Checklist",
        noteContent: "Deploy app to production.",
      });
      expect(userPrompt).toContain("Launch Checklist");
      expect(userPrompt).toContain("Deploy app to production.");
    });
  });
});
