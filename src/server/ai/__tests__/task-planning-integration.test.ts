import { describe, it, expect } from "bun:test";
import {
  ExtractedTaskSchema,
  ProjectPlanSchema,
  AI_ACTION_SPECS,
  renderProjectPlanMarkdown,
} from "@/server/ai/specs";
import { aiProviderSettingsSchema, DEFAULTS } from "@/server/users/settings-service";
import { AGENT_TOOLS } from "@/server/agent/tools";

describe("AI Task & Project Planning Architecture Integration", () => {
  describe("Task Extraction & Timing Schema", () => {
    it("validates extracted tasks with start dates and due dates", () => {
      const validTask = {
        title: "Implement OAuth integration",
        description: "Set up Google and GitHub OAuth flow",
        priority: "high" as const,
        startDate: "2026-09-01",
        dueDate: "2026-09-08",
      };

      const parsed = ExtractedTaskSchema.parse(validTask);
      expect(parsed.title).toBe("Implement OAuth integration");
      expect(parsed.startDate).toBe("2026-09-01");
      expect(parsed.dueDate).toBe("2026-09-08");
      expect(parsed.priority).toBe("high");
    });

    it("allows optional start and due dates", () => {
      const taskWithoutDates = {
        title: "Refactor task list component",
        priority: "low" as const,
      };

      const parsed = ExtractedTaskSchema.parse(taskWithoutDates);
      expect(parsed.title).toBe("Refactor task list component");
      expect(parsed.startDate).toBeNull();
      expect(parsed.dueDate).toBeNull();
      expect(parsed.description).toBeNull();
    });

    it("validates project plan with milestones and delivery dates", () => {
      const plan = {
        title: "Personal Knowledge Workspace MVP",
        summary: "Build MVP for personal knowledge management",
        targetDueDate: "2026-10-01",
        milestones: [
          {
            title: "Phase 1: Core Notes",
            description: "Editor and storage layer",
            targetDate: "2026-09-15",
            tasks: ["Markdown editor", "SQLite storage"],
          },
          {
            title: "Phase 2: Task Extraction",
            description: "AI extraction and timing",
            targetDate: "2026-09-30",
            tasks: ["AI prompt pipeline", "Kanban integration"],
          },
        ],
        risks: ["Token limit constraints on large documents"],
        nextActions: ["Setup Drizzle schema"],
      };

      const parsed = ProjectPlanSchema.parse(plan);
      expect(parsed.title).toBe("Personal Knowledge Workspace MVP");
      expect(parsed.milestones.length).toBe(2);
      expect(parsed.milestones[0].targetDate).toBe("2026-09-15");

      const md = renderProjectPlanMarkdown(parsed);
      expect(md).toContain("Phase 1: Core Notes");
      expect(md).toContain("2026-09-15");
      expect(md).toContain("Setup Drizzle schema");
    });
  });

  describe("User Settings & Custom Timing Prompts", () => {
    it("provides default timing heuristics and project planning prompts in DEFAULTS", () => {
      expect(DEFAULTS.ai?.taskTimingPrompt).toBeDefined();
      expect(DEFAULTS.ai?.taskTimingPrompt).toContain("due dates and start dates");
      expect(DEFAULTS.ai?.projectPlanningPrompt).toBeDefined();
      expect(DEFAULTS.ai?.projectPlanningPrompt).toContain("phased milestones");
    });

    it("validates custom user timing prompt in aiProviderSettingsSchema", () => {
      const customSettings = {
        provider: "openai" as const,
        taskTimingPrompt: "Schedule all urgent tasks for tomorrow, and low priority tasks for next month.",
        projectPlanningPrompt: "Plan projects with 2-week agile sprints.",
      };

      const parsed = aiProviderSettingsSchema.parse(customSettings);
      expect(parsed.taskTimingPrompt).toBe("Schedule all urgent tasks for tomorrow, and low priority tasks for next month.");
      expect(parsed.projectPlanningPrompt).toBe("Plan projects with 2-week agile sprints.");
    });
  });

  describe("AI Agent Tools Coverage for Workspace Services", () => {
    it("registers all required workspace tools for autonomous operation", () => {
      const toolNames = AGENT_TOOLS.map((t) => t.name);

      expect(toolNames).toContain("read_note");
      expect(toolNames).toContain("search_notes");
      expect(toolNames).toContain("list_notes");
      expect(toolNames).toContain("create_note");
      expect(toolNames).toContain("update_note");
      expect(toolNames).toContain("list_projects");
      expect(toolNames).toContain("create_project");
      expect(toolNames).toContain("update_project");
      expect(toolNames).toContain("list_tasks");
      expect(toolNames).toContain("create_task");
      expect(toolNames).toContain("create_tasks_bulk");
      expect(toolNames).toContain("update_task");
      expect(toolNames).toContain("list_tags");
      expect(toolNames).toContain("get_workspace_overview");
    });

    it("configures create_project tool with hierarchical parentId and target dueDate parameters", () => {
      const createProjectTool = AGENT_TOOLS.find((t) => t.name === "create_project");
      expect(createProjectTool).toBeDefined();
      const props = createProjectTool?.parameters.properties ?? {};
      expect("parentId" in props).toBe(true);
      expect("dueDate" in props).toBe(true);
      expect("priority" in props).toBe(true);
      expect("status" in props).toBe(true);
    });

    it("configures create_tasks_bulk tool with timing parameters", () => {
      const bulkTool = AGENT_TOOLS.find((t) => t.name === "create_tasks_bulk");
      expect(bulkTool).toBeDefined();
      const props = bulkTool?.parameters.properties ?? {};
      expect("noteId" in props).toBe(true);
      expect("tasks" in props).toBe(true);
    });
  });

  describe("AI Action Specs Prompt Formatting", () => {
    it("includes taskTimingPrompt and currentDate instructions in extract-tasks spec", () => {
      const spec = AI_ACTION_SPECS["extract-tasks"];
      const rulesStr = spec.rules.join(" ");
      expect(rulesStr).toContain("YYYY-MM-DD");
      expect(rulesStr).toContain("startDate");
      expect(rulesStr).toContain("dueDate");
      expect(rulesStr).toContain("currentDate");
      expect(rulesStr).toContain("timingPrompt");
    });

    it("includes projectPlanningPrompt instructions in create-project-plan spec", () => {
      const spec = AI_ACTION_SPECS["create-project-plan"];
      const rulesStr = spec.rules.join(" ");
      expect(rulesStr).toContain("milestones");
      expect(rulesStr).toContain("timingPrompt");
      expect(rulesStr).toContain("promptHint");
    });
  });
});

