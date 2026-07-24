import { eq, and, ne, gte, isNull, desc, asc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import type { Task } from "@/server/db/schema";

export type TaskWithNoteTitle = Task & { noteTitle: string };

export interface PlannerData {
  overdue: TaskWithNoteTitle[];
  today: TaskWithNoteTitle[];
  upcoming: TaskWithNoteTitle[];
  unplanned: TaskWithNoteTitle[];
  completedThisWeekCount: number;
}

export async function getPlannerData(): Promise<PlannerData> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const allActiveRows = await db
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
    .orderBy(asc(schema.tasks.dueDate), desc(schema.tasks.priority));

  const mapped: TaskWithNoteTitle[] = allActiveRows.map((r) => ({
    ...r.task,
    noteTitle: r.noteTitle,
  }));

  const overdue = mapped.filter((t) => t.dueDate && t.dueDate < startOfToday);
  const today = mapped.filter((t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday);
  const upcoming = mapped.filter((t) => t.dueDate && t.dueDate > endOfToday && t.dueDate <= nextWeek);
  const unplanned = mapped.filter((t) => !t.nextAction && !t.ifThenCue && !t.dueDate);

  // Completed in the last 7 days count
  const completedRows = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.userId, user.id),
        eq(schema.tasks.status, "done"),
        gte(schema.tasks.updatedAt, startOfWeek),
      ),
    );

  return {
    overdue,
    today,
    upcoming,
    unplanned,
    completedThisWeekCount: completedRows.length,
  };
}
