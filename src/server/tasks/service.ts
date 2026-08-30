import { eq, and, asc, ne, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { resolveProjectAccess } from "@/server/projects/access";
import { randomId } from "@/lib/slug";
import { createTaskSchema, updateTaskSchema } from "./validation";
import type { Task } from "@/server/db/schema";

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");
  return { user, workspace };
}

/**
 * Tasks live under a note, so access follows the note's project chain: the
 * owner and project members (viewer/editor) can read, only owner/editor can
 * mutate — mirroring the task-note board on the project page.
 */
async function getNoteAccess(noteId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const access = await resolveProjectAccess(noteId, user.id);
  if (!access) return null;
  return { user, role: access.role };
}

function assertCanEdit(role: "owner" | "editor" | "viewer") {
  if (role === "viewer") throw new Error("FORBIDDEN");
}

/** High-priority tasks sort before medium/low regardless of alphabetical TEXT order. */
export const priorityRankSql = sql`CASE ${schema.tasks.priority} WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END`;

export async function listTasks(noteId: string): Promise<Task[]> {
  const access = await getNoteAccess(noteId);
  if (!access) return [];

  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.noteId, noteId))
    .orderBy(asc(schema.tasks.sourceLine), asc(schema.tasks.createdAt));
  return rows;
}

export async function createTask(
  input: z.input<typeof createTaskSchema>,
): Promise<Task> {
  const parsed = createTaskSchema.parse(input);
  const access = await getNoteAccess(parsed.noteId);
  if (!access) throw new Error("NOTE_NOT_FOUND");
  assertCanEdit(access.role);

  const id = randomId("task");
  await db.insert(schema.tasks).values({
    id,
    noteId: parsed.noteId,
    userId: access.user.id,
    title: parsed.title,
    description: parsed.description ?? null,
    status: parsed.status,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
    startDate: parsed.startDate ?? null,
    nextAction: parsed.nextAction ?? null,
    ifThenCue: parsed.ifThenCue ?? null,
    whenWhereHow: parsed.whenWhereHow ?? null,
    source: parsed.source,
    sourceLine: parsed.sourceLine ?? null,
  });

  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id))
    .limit(1);
  if (!rows[0]) throw new Error("TASK_CREATE_FAILED");
  return rows[0];
}

async function getTaskById(id: string) {
  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateTask(
  id: string,
  input: z.infer<typeof updateTaskSchema>,
): Promise<Task | null> {
  const task = await getTaskById(id);
  if (!task) return null;
  const access = await getNoteAccess(task.noteId);
  if (!access) throw new Error("FORBIDDEN");
  assertCanEdit(access.role);

  const parsed = updateTaskSchema.parse(input);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description ?? null;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.dueDate !== undefined) {
    updates.dueDate = parsed.dueDate ?? null;
    updates.dueReminderSentAt = null;
  }
  if (parsed.startDate !== undefined) updates.startDate = parsed.startDate ?? null;
  if (parsed.nextAction !== undefined) updates.nextAction = parsed.nextAction ?? null;
  if (parsed.ifThenCue !== undefined) updates.ifThenCue = parsed.ifThenCue ?? null;
  if (parsed.whenWhereHow !== undefined) updates.whenWhereHow = parsed.whenWhereHow ?? null;

  await db
    .update(schema.tasks)
    .set(updates)
    .where(
      and(eq(schema.tasks.id, id), eq(schema.tasks.noteId, task.noteId)),
    );

  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteTask(id: string): Promise<void> {
  const task = await getTaskById(id);
  if (!task) return;
  const access = await getNoteAccess(task.noteId);
  if (!access) throw new Error("FORBIDDEN");
  assertCanEdit(access.role);

  await db
    .delete(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.noteId, task.noteId)));
}

export type TaskWithNote = Task & { noteTitle: string };

export async function listUpcomingTasks(
  limit = 10,
): Promise<TaskWithNote[]> {
  const { user } = await getContext();

  const rows = await db
    .select({
      task: schema.tasks,
      noteTitle: schema.notes.title,
    })
    .from(schema.tasks)
    .innerJoin(schema.notes, eq(schema.tasks.noteId, schema.notes.id))
    .where(
      and(
        eq(schema.tasks.userId, user.id),
        ne(schema.tasks.status, "done"),
        ne(schema.tasks.status, "canceled"),
        isNull(schema.notes.deletedAt),
      ),
    )
    .orderBy(asc(schema.tasks.dueDate), asc(priorityRankSql), asc(schema.tasks.createdAt))
    .limit(limit);

  return rows.map((r) => ({ ...r.task, noteTitle: r.noteTitle }));
}

// ── Markdown checkbox sync ────────────────────────────────────────────────

export type ParsedCheckbox = {
  line: number;
  checked: boolean;
  title: string;
};

const CHECKBOX_RE = /^(\s*(?:[-*+]|\d+\.)\s+)\[(?:(x| )|X)\]\s+(.+)$/i;

export function parseMarkdownCheckboxes(content: string): ParsedCheckbox[] {
  const out: ParsedCheckbox[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = CHECKBOX_RE.exec(lines[i] ?? "");
    if (!m) continue;
    const checked = (m[2] ?? "").toLowerCase() === "x";
    const rest = (m[3] ?? "").trim();
    if (!rest) continue;
    out.push({ line: i, checked, title: rest });
  }
  return out;
}

/**
 * Pure reconciliation rule for a markdown-sourced task's status:
 * checking a box always completes it; unchecking reopens it, except that
 * workflow statuses markdown cannot express (`doing`, `canceled`) survive.
 */
export function reconcileMarkdownStatus(
  checked: boolean,
  current: Task["status"],
): Task["status"] {
  if (checked) return "done";
  return current === "doing" || current === "canceled" ? current : "todo";
}

/**
 * Sync markdown checkbox rows into the tasks table. Strategy:
 * - Resolve each checkbox line by `sourceLine` exact match; reuse existing row if title hasn't changed.
 * - Checking a box always completes the task. Unchecking reopens it — unless
 *   the row carries a manual/AI workflow status (`doing`, `paused`,
 *   `canceled`), which markdown cannot express and therefore must not clobber.
 *   Statuses only snap back to `todo` from `done` (reopen).
 *
 * Housekeeping:
 *   - Delete prior task rows for this note whose source === "markdown" and whose sourceLine is no longer present.
 *   - Upsert (by sourceLine) task rows from current markdown.
 *   - Manual tasks (source !== "markdown") are left untouched.
 *
 * Returns the number of markdown tasks after sync.
 */
export async function syncMarkdownTasks(
  noteId: string,
  content: string,
): Promise<number> {
  const access = await getNoteAccess(noteId);
  if (!access) throw new Error("NOTE_NOT_FOUND");
  assertCanEdit(access.role);

  const parsed = parseMarkdownCheckboxes(content);

  const existing = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.noteId, noteId));
  const mdExisting = existing.filter((t) => t.source === "markdown");
  const mdByLine = new Map(mdExisting.map((t) => [t.sourceLine ?? -1, t] as const));

  const seenLineIds = new Set<string>();
  let count = 0;
  for (const cb of parsed) {
    const existingRow = mdByLine.get(cb.line);
    const status: Task["status"] = cb.checked ? "done" : "todo";
    if (existingRow) {
      seenLineIds.add(existingRow.id);
      const newStatus = reconcileMarkdownStatus(cb.checked, existingRow.status);
      await db
        .update(schema.tasks)
        .set({
          title: cb.title,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(schema.tasks.id, existingRow.id));
      count++;
    } else {
      const id = randomId("task");
      await db.insert(schema.tasks).values({
        id,
        noteId,
        userId: access.user.id,
        title: cb.title,
        status,
        priority: "none",
        source: "markdown",
        sourceLine: cb.line,
      });
      count++;
    }
  }

  // Delete markdown task rows whose sourceLine disappeared (line removed).
  const toDelete = mdExisting.filter(
    (t) => t.sourceLine !== null && !seenLineIds.has(t.id),
  );
  if (toDelete.length > 0) {
    for (const t of toDelete) {
      await db
        .delete(schema.tasks)
        .where(eq(schema.tasks.id, t.id));
    }
  }

  return count;
}
