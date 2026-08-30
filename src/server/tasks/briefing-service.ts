import { and, asc, eq, gt, gte, isNotNull, isNull, lt, ne } from "drizzle-orm";
import { db, schema } from "@/server/db/client";

/**
 * Shared digest data for the AI morning briefing and the weekly review recap.
 * All queries are user-scoped; list fields are capped so prompts stay small.
 */

export type BriefingTask = { title: string; noteTitle: string; dueDate: Date | null };

export type BriefingData = {
  overdue: BriefingTask[];
  overdueCount: number;
  dueToday: BriefingTask[];
  dueTodayCount: number;
  projectDeadlines: { title: string; dueDate: Date; isOverdue: boolean }[];
};

const LIST_CAP = 6;

export async function getDailyBriefingData(userId: string): Promise<BriefingData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const deadlineWindow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const rows = await db
    .select({
      title: schema.tasks.title,
      dueDate: schema.tasks.dueDate,
      noteTitle: schema.notes.title,
    })
    .from(schema.tasks)
    .innerJoin(schema.notes, eq(schema.tasks.noteId, schema.notes.id))
    .where(
      and(
        eq(schema.tasks.userId, userId),
        ne(schema.tasks.status, "done"),
        ne(schema.tasks.status, "canceled"),
        isNotNull(schema.tasks.dueDate),
        isNull(schema.notes.deletedAt),
      ),
    )
    .orderBy(asc(schema.tasks.dueDate))
    .limit(100);

  const overdueAll = rows.filter((t) => t.dueDate && t.dueDate < startOfToday);
  const dueTodayAll = rows.filter(
    (t) => t.dueDate && t.dueDate >= startOfToday && t.dueDate <= endOfToday,
  );

  const deadlineRows = await db
    .select({ title: schema.notes.title, dueDate: schema.notes.dueDate })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, userId),
        eq(schema.notes.type, "project"),
        isNotNull(schema.notes.dueDate),
        lt(schema.notes.dueDate, deadlineWindow),
        gt(schema.notes.dueDate, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
        ne(schema.notes.status, "done"),
        ne(schema.notes.status, "archived"),
      ),
    )
    .orderBy(asc(schema.notes.dueDate))
    .limit(LIST_CAP);

  return {
    overdue: overdueAll.slice(0, LIST_CAP),
    overdueCount: overdueAll.length,
    dueToday: dueTodayAll.slice(0, LIST_CAP),
    dueTodayCount: dueTodayAll.length,
    projectDeadlines: deadlineRows.map((p) => ({
      title: p.title,
      dueDate: p.dueDate as Date,
      isOverdue: (p.dueDate as Date) < now,
    })),
  };
}

export async function getCompletedThisWeekCount(userId: string): Promise<number> {
  const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: schema.tasks.id })
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.userId, userId),
        eq(schema.tasks.status, "done"),
        gte(schema.tasks.updatedAt, startOfWeek),
      ),
    );
  return rows.length;
}

/** Plain-text digest used both as the AI input and the no-AI fallback body. */
export function formatBriefingDigest(data: BriefingData, completedCount: number): string {
  const parts: string[] = [];

  if (data.overdueCount > 0) {
    const titles = data.overdue.map((t) => `“${t.title}” (${t.noteTitle})`).join(", ");
    parts.push(
      `Overdue: ${data.overdueCount} task${data.overdueCount === 1 ? "" : "s"} — ${titles}${data.overdueCount > data.overdue.length ? "…" : ""}`,
    );
  }
  if (data.dueTodayCount > 0) {
    const titles = data.dueToday.map((t) => `“${t.title}”`).join(", ");
    parts.push(
      `Due today: ${data.dueTodayCount} task${data.dueTodayCount === 1 ? "" : "s"} — ${titles}${data.dueTodayCount > data.dueToday.length ? "…" : ""}`,
    );
  }
  for (const project of data.projectDeadlines) {
    parts.push(
      `${project.isOverdue ? "Project overdue" : "Project deadline"}: “${project.title}” was due ${project.dueDate.toLocaleDateString()}`,
    );
  }
  if (completedCount > 0) {
    parts.push(`Completed in the last 7 days: ${completedCount} task${completedCount === 1 ? "" : "s"}`);
  }

  return parts.length > 0 ? parts.join("\n") : "Nothing is due today. Clear runway.";
}
