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
    description: "Read a note's complete Markdown content, metadata, tags, and attached tasks by its ID.",
    parameters: {
      type: "object",
      properties: {
        noteId: {
          type: "string",
          description: "The unique ID of the note to read.",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "search_notes",
    description: "Search workspace notes by title or content keywords to find relevant context, references, or past plans.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query or keywords.",
        },
        limit: {
          type: "number",
          description: "Maximum number of notes to return (default 5, max 20).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_note",
    description: "Create a new note or project in the workspace with title and markdown content.",
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
        type: {
          type: "string",
          enum: ["note", "project", "daily"],
          description: "Type of the note (default 'note').",
        },
        parentId: {
          type: "string",
          description: "Optional parent project/note ID to nest under.",
        },
      },
      required: ["title", "contentMd"],
    },
  },
  {
    name: "update_note",
    description: "Update an existing note. Can append content or replace content, and update title or status.",
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
    description: "Create a new actionable task item attached to a note or project.",
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
    name: "update_task",
    description: "Update a task's status or details.",
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
        nextAction: {
          type: "string",
          description: "Specific immediate next action for this task.",
        },
      },
      required: ["taskId"],
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

      case "create_note": {
        const title = String(args.title ?? "Untitled");
        const contentMd = String(args.contentMd ?? "");
        const type = (args.type as "note" | "project" | "daily") || "note";
        const parentId = args.parentId ? String(args.parentId) : undefined;
        const created = await createNote({
          title,
          contentMd,
          type,
          parentId,
        });
        return {
          success: true,
          data: {
            id: created.id,
            title: created.title,
            slug: created.slug,
            type: created.type,
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

      case "list_tasks": {
        const noteId = String(args.noteId);
        const tasks = await listTasks(noteId);
        return {
          success: true,
          data: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
          })),
        };
      }

      case "create_task": {
        const noteId = String(args.noteId);
        const title = String(args.title);
        const priority = (args.priority as "none" | "low" | "medium" | "high") || "none";
        const status = (args.status as "todo" | "doing" | "done" | "canceled") || "todo";
        const created = await createTask({
          noteId,
          title,
          priority,
          status,
        });
        return {
          success: true,
          data: {
            id: created.id,
            title: created.title,
            status: created.status,
            priority: created.priority,
          },
        };
      }

      case "update_task": {
        const taskId = String(args.taskId);
        const updated = await updateTask(taskId, {
          status: args.status ? (args.status as "todo" | "doing" | "done" | "canceled") : undefined,
          nextAction: args.nextAction ? String(args.nextAction) : undefined,
        });
        return {
          success: true,
          data: {
            id: updated?.id,
            status: updated?.status,
            nextAction: updated?.nextAction,
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
