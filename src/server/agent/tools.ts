import {
  getNoteById,
  createNote,
  updateNote,
  listNotes,
} from "@/server/notes/service";
import type { Note } from "@/server/db/schema";
import {
  listTasks,
  createTask,
  updateTask,
} from "@/server/tasks/service";
import { listTags } from "@/server/tags/service";
import { getPlannerData } from "@/server/tasks/planner-service";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { buildContextPack } from "@/server/knowledge/context-engine";
import type { ContextPack } from "@/lib/document-engine/types";

export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const AGENT_TOOLS: AgentToolDefinition[] = [
  {
    name: "read_note",
    description: "Read a note or project's complete Markdown content, metadata, tags, and attached tasks by its ID.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The unique ID of the note or project to read.",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "search_notes",
    description: "Search workspace notes and projects by title or content keywords.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query or keywords.",
        },
        limit: {
          type: "number",
          description: "Maximum number of items to return (default 5, max 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "list_notes",
    description: "List notes or projects in the workspace with optional filters by type, parent, or search keyword.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["note", "project", "daily"],
          description: "Filter by item type (note, project, daily).",
        },
        parentId: {
          type: "string",
          description: "Filter items nested under a specific parent note or project.",
        },
        search: {
          type: "string",
          description: "Optional keyword search.",
        },
        limit: {
          type: "number",
          description: "Maximum number of notes to return (default 20).",
        },
      },
    },
  },
  {
    name: "create_note",
    description: "Create a new note in the workspace with title and markdown content.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the new note.",
        },
        contentMd: {
          type: "string",
          description: "Markdown body of the note.",
        },
        parentId: {
          type: "string",
          description: "Optional parent project or note ID to nest under.",
        },
      },
      required: ["title", "contentMd"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note's title, markdown body, or status.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The ID of the note to update.",
        },
        title: {
          type: "string",
          description: "Optional new title for the note.",
        },
        appendContent: {
          type: "string",
          description: "Text to append to the existing markdown content.",
        },
        contentMd: {
          type: "string",
          description: "Replacement markdown content (overwrites existing body if specified).",
        },
        status: {
          type: "string",
          enum: ["none", "todo", "doing", "done", "paused", "archived"],
          description: "Optional status update for the note.",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "list_projects",
    description: "List all projects and subprojects in the workspace including their hierarchy (parentId), due dates, priorities, and statuses.",
    parameters: {
      type: "object",
      properties: {
        parentId: {
          type: "string",
          description: "Optional parent project ID to list immediate subprojects.",
        },
      },
    },
  },
  {
    name: "create_project",
    description: "Create a new project or subproject in the workspace with optional parentId, target due date, priority, and description.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title of the project or subproject.",
        },
        contentMd: {
          type: "string",
          description: "Optional initial markdown content/description of the project.",
        },
        parentId: {
          type: "string",
          description: "Optional parent project ID if creating a nested subproject.",
        },
        dueDate: {
          type: "string",
          description: "Optional target due date in YYYY-MM-DD format.",
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high"],
          description: "Priority level of the project (default 'none').",
        },
        status: {
          type: "string",
          enum: ["none", "todo", "doing", "done", "paused", "archived"],
          description: "Project status (default 'todo').",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_project",
    description: "Update project metadata such as title, due date, status, priority, or parent project.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The unique ID of the project to update.",
        },
        title: {
          type: "string",
          description: "Optional updated project title.",
        },
        dueDate: {
          type: "string",
          description: "Optional updated due date in YYYY-MM-DD format (or null to clear).",
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high"],
          description: "Updated priority level.",
        },
        status: {
          type: "string",
          enum: ["none", "todo", "doing", "done", "paused", "archived"],
          description: "Updated project status.",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "list_tasks",
    description: "List all tasks and action items attached to a specific note or project.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The note or project ID to fetch tasks for.",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "create_task",
    description: "Create a single actionable task item attached to a note or project with due date and priority.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The note or project ID to attach the task to.",
        },
        title: {
          type: "string",
          description: "The task title / action description.",
        },
        description: {
          type: "string",
          description: "Optional additional notes or context for the task.",
        },
        dueDate: {
          type: "string",
          description: "Optional due date in YYYY-MM-DD format.",
        },
        startDate: {
          type: "string",
          description: "Optional scheduled start date in YYYY-MM-DD format.",
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high"],
          description: "Priority level (default 'none').",
        },
        status: {
          type: "string",
          enum: ["todo", "doing", "done", "canceled"],
          description: "Initial status (default 'todo').",
        },
      },
      required: ["noteId", "title"],
    },
  },
  {
    name: "create_tasks_bulk",
    description: "Create multiple actionable tasks attached to a note or project with priorities and due dates in a single call.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The note or project ID to attach the tasks to.",
        },
        tasks: {
          type: "array",
          description: "List of task objects to create.",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              priority: { type: "string", enum: ["none", "low", "medium", "high"] },
              dueDate: { type: "string" },
              startDate: { type: "string" },
              status: { type: "string", enum: ["todo", "doing", "done", "canceled"] },
            },
            required: ["title"],
          },
        },
      },
      required: ["noteId", "tasks"],
    },
  },
  {
    name: "update_task",
    description: "Update a task's status, due date, priority, or next action details.",
    parameters: {
      type: "object",
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to update.",
        },
        status: {
          type: "string",
          enum: ["todo", "doing", "done", "canceled"],
          description: "Updated status of the task.",
        },
        priority: {
          type: "string",
          enum: ["none", "low", "medium", "high"],
          description: "Updated priority of the task.",
        },
        dueDate: {
          type: "string",
          description: "Updated due date in YYYY-MM-DD format.",
        },
        nextAction: {
          type: "string",
          description: "Specific immediate next action for this task.",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "list_tags",
    description: "List all tags defined across the workspace.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_workspace_overview",
    description: "Get a comprehensive summary of the workspace: total notes, projects, overdue tasks, today's tasks, upcoming tasks, and planner summary.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "query_project_knowledge",
    description: "Search and retrieve grounded knowledge from a specific project and all its nested notes/sources using hybrid retrieval (lexical BM25, semantic vector similarity, and backlinks). Returns ranked excerpts with document citations.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project note to search within.",
        },
        query: {
          type: "string",
          description: "The search query or question.",
        },
        maxSources: {
          type: "number",
          description: "Maximum number of source excerpts to retrieve (default 6, max 15).",
        },
      },
      required: ["projectId", "query"],
    },
  },
  {
    name: "get_project_tree",
    description: "Get the complete hierarchical structure of a project, including all nested sub-notes, sources, articles, research items, and attached tasks.",
    parameters: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "The ID of the project to inspect.",
        },
      },
      required: ["projectId"],
    },
  },
];

export async function executeAgentTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    switch (toolName) {
      case "read_note": {
        const noteId = String(args.noteId);
        const note = await getNoteById(noteId);
        if (!note) return { success: false, error: `Note not found with ID ${noteId}` };
        const tasks = await listTasks(noteId).catch(() => []);
        return {
          success: true,
          data: {
            id: note.id,
            title: note.title,
            contentMd: note.contentMd,
            type: note.type,
            status: note.status,
            priority: note.priority,
            dueDate: note.dueDate,
            parentId: note.parentId,
            tasks: tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority })),
          },
        };
      }

      case "search_notes": {
        const query = String(args.query ?? "");
        const limit = typeof args.limit === "number" ? Math.min(20, Math.max(1, args.limit)) : 5;
        const results = await listNotes({ search: query, limit });
        return {
          success: true,
          data: results.map((n: Note) => ({
            id: n.id,
            title: n.title,
            type: n.type,
            excerpt: n.excerpt ?? (n.contentMd ? n.contentMd.slice(0, 160) : ""),
          })),
        };
      }

      case "list_notes": {
        const type = (args.type as "note" | "project" | "daily") || undefined;
        const parentId = args.parentId ? String(args.parentId) : undefined;
        const search = args.search ? String(args.search) : undefined;
        const limit = typeof args.limit === "number" ? Math.min(100, Math.max(1, args.limit)) : 20;

        const results = await listNotes({ type, parentId, search, limit });
        return {
          success: true,
          data: results.map((n: Note) => ({
            id: n.id,
            title: n.title,
            type: n.type,
            parentId: n.parentId,
            status: n.status,
            priority: n.priority,
            dueDate: n.dueDate,
            updatedAt: n.updatedAt,
          })),
        };
      }

      case "create_note": {
        const title = String(args.title ?? "Untitled");
        const contentMd = String(args.contentMd ?? "");
        const parentId = args.parentId ? String(args.parentId) : undefined;
        const created = await createNote({
          title,
          contentMd,
          type: "note",
          parentId,
        });
        return {
          success: true,
          data: {
            id: created.id,
            title: created.title,
            slug: created.slug,
            type: created.type,
            parentId: created.parentId,
          },
        };
      }

      case "update_note": {
        const noteId = String(args.noteId);
        const existing = await getNoteById(noteId);
        if (!existing) return { success: false, error: `Note not found with ID ${noteId}` };

        let nextContent = existing.contentMd;
        if (typeof args.contentMd === "string") {
          nextContent = args.contentMd;
        } else if (typeof args.appendContent === "string") {
          nextContent = `${existing.contentMd.trimEnd()}\n\n${args.appendContent.trim()}`;
        }

        const updated = await updateNote(noteId, {
          title: args.title ? String(args.title) : undefined,
          contentMd: nextContent,
          status: args.status ? (args.status as "none" | "todo" | "doing" | "done" | "paused" | "archived") : undefined,
        });

        return {
          success: true,
          data: {
            id: updated?.id,
            title: updated?.title,
            status: updated?.status,
            updatedAt: updated?.updatedAt,
          },
        };
      }

      case "list_projects": {
        const parentId = args.parentId ? String(args.parentId) : undefined;
        const projects = await listNotes({ type: "project", parentId, limit: 500 });
        return {
          success: true,
          data: projects.map((p) => ({
            id: p.id,
            title: p.title,
            parentId: p.parentId,
            status: p.status,
            priority: p.priority,
            dueDate: p.dueDate,
          })),
        };
      }

      case "create_project": {
        const title = String(args.title ?? "Untitled Project");
        const contentMd = String(args.contentMd ?? "");
        const parentId = args.parentId ? String(args.parentId) : undefined;
        const priority = (args.priority as "none" | "low" | "medium" | "high") || "none";
        const status = (args.status as "none" | "todo" | "doing" | "done" | "paused" | "archived") || "todo";
        const dueDate = args.dueDate ? new Date(String(args.dueDate)) : undefined;

        const created = await createNote({
          title,
          contentMd,
          type: "project",
          parentId,
          priority,
          status,
          dueDate,
        });

        return {
          success: true,
          data: {
            id: created.id,
            title: created.title,
            type: "project",
            parentId: created.parentId,
            priority: created.priority,
            status: created.status,
            dueDate: created.dueDate,
          },
        };
      }

      case "update_project": {
        const projectId = String(args.projectId);
        const existing = await getNoteById(projectId);
        if (!existing || existing.type !== "project") {
          return { success: false, error: `Project not found with ID ${projectId}` };
        }

        const dueDate = args.dueDate !== undefined
          ? args.dueDate ? new Date(String(args.dueDate)) : null
          : undefined;

        const updated = await updateNote(projectId, {
          title: args.title ? String(args.title) : undefined,
          priority: args.priority ? (args.priority as "none" | "low" | "medium" | "high") : undefined,
          status: args.status ? (args.status as "none" | "todo" | "doing" | "done" | "paused" | "archived") : undefined,
          dueDate: dueDate ?? undefined,
        });

        return {
          success: true,
          data: {
            id: updated?.id,
            title: updated?.title,
            status: updated?.status,
            priority: updated?.priority,
            dueDate: updated?.dueDate,
          },
        };
      }

      case "list_tasks": {
        const noteId = String(args.noteId);
        const tasks = await listTasks(noteId);
        return {
          success: true,
          data: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            startDate: t.startDate,
          })),
        };
      }

      case "create_task": {
        const noteId = String(args.noteId);
        const title = String(args.title);
        const description = args.description ? String(args.description) : undefined;
        const priority = (args.priority as "none" | "low" | "medium" | "high") || "none";
        const status = (args.status as "todo" | "doing" | "done" | "canceled") || "todo";
        const dueDate = args.dueDate ? new Date(String(args.dueDate)) : undefined;
        const startDate = args.startDate ? new Date(String(args.startDate)) : undefined;

        const created = await createTask({
          noteId,
          title,
          description,
          priority,
          status,
          dueDate,
          startDate,
          source: "ai",
        });

        return {
          success: true,
          data: {
            id: created.id,
            noteId: created.noteId,
            title: created.title,
            status: created.status,
            priority: created.priority,
            dueDate: created.dueDate,
            startDate: created.startDate,
          },
        };
      }

      case "create_tasks_bulk": {
        const noteId = String(args.noteId);
        const rawTasks = Array.isArray(args.tasks) ? args.tasks : [];
        if (rawTasks.length === 0) {
          return { success: false, error: "tasks array cannot be empty" };
        }

        const createdTasks = [];
        for (const t of rawTasks) {
          const item = t as Record<string, unknown>;
          const title = String(item.title || "Untitled Task");
          const description = item.description ? String(item.description) : undefined;
          const priority = (item.priority as "none" | "low" | "medium" | "high") || "none";
          const status = (item.status as "todo" | "doing" | "done" | "canceled") || "todo";
          const dueDate = item.dueDate ? new Date(String(item.dueDate)) : undefined;
          const startDate = item.startDate ? new Date(String(item.startDate)) : undefined;

          const created = await createTask({
            noteId,
            title,
            description,
            priority,
            status,
            dueDate,
            startDate,
            source: "ai",
          });
          createdTasks.push({
            id: created.id,
            title: created.title,
            status: created.status,
            priority: created.priority,
            dueDate: created.dueDate,
            startDate: created.startDate,
          });
        }

        return {
          success: true,
          data: {
            noteId,
            createdCount: createdTasks.length,
            tasks: createdTasks,
          },
        };
      }

      case "update_task": {
        const taskId = String(args.taskId);
        const dueDate = args.dueDate !== undefined
          ? args.dueDate ? new Date(String(args.dueDate)) : null
          : undefined;

        const updated = await updateTask(taskId, {
          status: args.status ? (args.status as "todo" | "doing" | "done" | "canceled") : undefined,
          priority: args.priority ? (args.priority as "none" | "low" | "medium" | "high") : undefined,
          dueDate: dueDate ?? undefined,
          nextAction: args.nextAction ? String(args.nextAction) : undefined,
        });

        return {
          success: true,
          data: {
            id: updated?.id,
            status: updated?.status,
            priority: updated?.priority,
            dueDate: updated?.dueDate,
            nextAction: updated?.nextAction,
          },
        };
      }

      case "list_tags": {
        const tags = await listTags();
        return {
          success: true,
          data: tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, color: t.color })),
        };
      }

      case "get_workspace_overview": {
        const [notes, projects, planner] = await Promise.all([
          listNotes({ type: "note", limit: 500 }),
          listNotes({ type: "project", limit: 500 }),
          getPlannerData().catch(() => null),
        ]);

        return {
          success: true,
          data: {
            totalNotes: notes.length,
            totalProjects: projects.length,
            projects: projects.slice(0, 10).map((p) => ({
              id: p.id,
              title: p.title,
              status: p.status,
              dueDate: p.dueDate,
            })),
            plannerSummary: planner ? {
              overdueCount: planner.overdue.length,
              todayCount: planner.today.length,
              upcomingCount: planner.upcoming.length,
              unplannedCount: planner.unplanned.length,
              completedThisWeekCount: planner.completedThisWeekCount,
            } : null,
          },
        };
      }

      case "query_project_knowledge": {
        const projectId = String(args.projectId);
        const query = String(args.query ?? "");
        const maxSources = typeof args.maxSources === "number" ? Math.min(15, Math.max(1, args.maxSources)) : 6;

        const project = await getNoteById(projectId);
        if (!project) return { success: false, error: `Project not found with ID ${projectId}` };

        // 1. Collect all descendant notes under this project
        const allNotes = await listNotes({ limit: 500 });
        const allowedIds = new Set<string>([projectId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const n of allNotes) {
            if (n.parentId && allowedIds.has(n.parentId) && !allowedIds.has(n.id)) {
              allowedIds.add(n.id);
              changed = true;
            }
          }
        }

        const allowedArray = Array.from(allowedIds);
        const user = await getCurrentUser();
        const workspace = user ? await getWorkspaceForUser(user.id) : null;

        let pack: ContextPack | null = null;
        if (user && workspace) {
          pack = await buildContextPack({
            workspaceId: workspace.id,
            userId: user.id,
            query,
            allowedDocumentIds: allowedArray,
            maxSources,
          });
        }

        // Direct lexical fallback across project notes to ensure non-indexed notes are also found
        const projectNotesMap = new Map(allNotes.filter((n) => allowedIds.has(n.id)).map((n) => [n.id, n]));
        const matchingNotes = Array.from(projectNotesMap.values()).filter((n) => {
          const lq = query.toLowerCase();
          return n.title.toLowerCase().includes(lq) || n.contentMd.toLowerCase().includes(lq);
        });

        const sources = pack?.sources && pack.sources.length > 0 ? [...pack.sources] : [];

        // If context pack didn't yield enough sources, add direct excerpts from matching notes
        if (sources.length < maxSources) {
          for (const note of matchingNotes) {
            if (sources.some((s) => s.documentId === note.id)) continue;
            const idx = note.contentMd.toLowerCase().indexOf(query.toLowerCase());
            const start = Math.max(0, idx - 100);
            const end = Math.min(note.contentMd.length, (idx === -1 ? 0 : idx) + 250);
            const snippet = note.contentMd.slice(start, end).trim() || note.contentMd.slice(0, 200);

            sources.push({
              documentId: note.id,
              documentTitle: note.title,
              type: "fts",
              score: 0.8,
              content: snippet,
              sectionTitle: note.type === "project" ? "Project Overview" : "Document Content",
            });
            if (sources.length >= maxSources) break;
          }
        }

        const formattedSources = sources.map((s) => ({
          documentId: s.documentId,
          title: s.documentTitle || projectNotesMap.get(s.documentId)?.title || "Untitled",
          sectionTitle: s.sectionTitle,
          relevanceScore: s.score,
          type: s.type,
          excerpt: s.content,
        }));

        const contextSummary = formattedSources
          .map((s, i) => `[Source ${i + 1}: "${s.title}" (ID: ${s.documentId})]\n${s.excerpt}`)
          .join("\n\n---\n\n");

        return {
          success: true,
          data: {
            project: { id: project.id, title: project.title },
            totalSourcesFound: formattedSources.length,
            sources: formattedSources,
            contextSummary,
          },
        };
      }

      case "get_project_tree": {
        const projectId = String(args.projectId);
        const project = await getNoteById(projectId);
        if (!project) return { success: false, error: `Project not found with ID ${projectId}` };

        const allNotes = await listNotes({ limit: 500 });
        const descendantIds = new Set<string>([projectId]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const n of allNotes) {
            if (n.parentId && descendantIds.has(n.parentId) && !descendantIds.has(n.id)) {
              descendantIds.add(n.id);
              changed = true;
            }
          }
        }

        const projectNotes = allNotes.filter((n) => descendantIds.has(n.id) && n.id !== projectId);
        const projectTasks = await listTasks(projectId).catch(() => []);

        // Also collect tasks for child notes
        const childTasksList: { id: string; title: string; status: string; priority: string; noteTitle: string }[] = [];
        for (const child of projectNotes.slice(0, 25)) {
          const ct = await listTasks(child.id).catch(() => []);
          if (ct.length > 0) {
            childTasksList.push(...ct.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, noteTitle: child.title })));
          }
        }

        return {
          success: true,
          data: {
            project: {
              id: project.id,
              title: project.title,
              type: project.type,
              status: project.status,
              priority: project.priority,
              dueDate: project.dueDate,
              contentMd: project.contentMd,
            },
            notes: projectNotes.map((n) => ({
              id: n.id,
              parentId: n.parentId,
              title: n.title,
              type: n.type,
              status: n.status,
              priority: n.priority,
              dueDate: n.dueDate,
              excerpt: n.contentMd ? n.contentMd.slice(0, 150) : "",
            })),
            totalNotes: projectNotes.length,
            tasks: [...projectTasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, noteTitle: project.title })), ...childTasksList],
            totalTasks: projectTasks.length + childTasksList.length,
          },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Tool execution failed",
    };
  }
}
