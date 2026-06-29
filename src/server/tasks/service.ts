import { eq, and, asc, ne, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
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

async function assertOwnsNote(noteId: string, userId: string) {
  const rows = await db
    .select({ id: schema.notes.id })
    .from(schema.notes)
    .where(
      and(eq(schema.notes.id, noteId), eq(schema.notes.userId, userId)),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export async function listTasks(noteId: string): Promise<Task[]> {
  const { user } = await getContext();
  const ok = await assertOwnsNote(noteId, user.id);
  if (!ok) return [];

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
  const { user } = await getContext();
  const parsed = createTaskSchema.parse(input);
  const ok = await assertOwnsNote(parsed.noteId, user.id);
  if (!ok) throw new Error("NOTE_NOT_FOUND");

  const id = randomId("task");
  await db.insert(schema.tasks).values({
    id,
    noteId: parsed.noteId,
    userId: user.id,
    title: parsed.title,
    description: parsed.description ?? null,
    status: parsed.status,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
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

export async function updateTask(
  id: string,
  input: z.infer<typeof updateTaskSchema>,
): Promise<Task | null> {
  const { user } = await getContext();
  const parsed = updateTaskSchema.parse(input);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined) updates.description = parsed.description ?? null;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.dueDate !== undefined) updates.dueDate = parsed.dueDate ?? null;

  await db
    .update(schema.tasks)
    .set(updates)
    .where(
      and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.id)),
    );

  const rows = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteTask(id: string): Promise<void> {
  const { user } = await getContext();
  await db
    .delete(schema.tasks)
    .where(and(eq(schema.tasks.id, id), eq(schema.tasks.userId, user.id)));
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
    .orderBy(asc(schema.tasks.dueDate), asc(schema.tasks.createdAt))
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
 * Sync markdown checkbox rows into the tasks table. Strategy:
 * - Resolve each checkbox line by `sourceLine` exact match; reuse existing row if title hasn't changed (status keeps manual edits unless checkbox's checked state is newer).
 * - For markdown checkboxes whose checked state changed, push status to done/todo accordingly, but respect manual overrides by tracking lastSeen state when row was inserted.
 *
 * For MVP we use a simpler reconciliation:
 *   - Delete prior task rows for this note whose source === "markdown" and whose sourceLine is no longer present OR whose title differs.
 *   - Upsert (by sourceLine) task rows from current markdown: status=done if checked else todo.
 *   - Manual tasks (source !== "markdown") are left untouched.
 *
 * Returns the number of markdown tasks after sync.
 */
export async function syncMarkdownTasks(
  noteId: string,
  content: string,
): Promise<number> {
  const { user } = await getContext();
  const ok = await assertOwnsNote(noteId, user.id);
  if (!ok) throw new Error("NOTE_NOT_FOUND");

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
      // Update title and status; allow switching todo/doing ↔ done from markdown.
      const newStatus: Task["status"] =
        status === "done"
          ? "done"
          : existingRow.status === "canceled"
            ? "canceled"
            : status;
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
        userId: user.id,
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
