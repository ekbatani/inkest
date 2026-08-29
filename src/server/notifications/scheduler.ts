import { and, eq, isNull, isNotNull, lte, ne } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { sendTelegramNotification } from "@/server/notifications/telegram";
import { formatDateKey } from "@/server/calendar/service";
import { createNotification } from "@/server/notifications/service";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

type NotificationPrefs = {
  inApp?: boolean;
  telegramPush?: boolean;
  sharedProjectInvites?: boolean;
  sharedNoteUpdates?: boolean;
  taskDueReminders?: boolean;
  projectDeadlineReminders?: boolean;
  dailyMorningBriefing?: boolean;
  dailyNoteNudge?: boolean;
  weeklyReviewPrompt?: boolean;
  aiResults?: boolean;
};

function parseNotificationPrefs(rawSettings: string | null): NotificationPrefs {
  if (!rawSettings) return {};
  try {
    const parsed = JSON.parse(rawSettings) as { notifications?: NotificationPrefs };
    return parsed.notifications ?? {};
  } catch {
    return {};
  }
}

async function checkDueTaskReminders() {
  const now = new Date();
  const rows = await db
    .select({
      taskId: schema.tasks.id,
      title: schema.tasks.title,
      dueDate: schema.tasks.dueDate,
      userId: schema.tasks.userId,
      noteId: schema.tasks.noteId,
      noteTitle: schema.notes.title,
      chatId: schema.users.telegramChatId,
      settings: schema.users.settings,
    })
    .from(schema.tasks)
    .innerJoin(schema.notes, eq(schema.tasks.noteId, schema.notes.id))
    .innerJoin(schema.users, eq(schema.tasks.userId, schema.users.id))
    .where(
      and(
        isNotNull(schema.tasks.dueDate),
        lte(schema.tasks.dueDate, now),
        isNull(schema.tasks.dueReminderSentAt),
        ne(schema.tasks.status, "done"),
        ne(schema.tasks.status, "canceled"),
      ),
    );

  for (const row of rows) {
    const prefs = parseNotificationPrefs(row.settings);
    if (prefs.taskDueReminders !== true) continue;

    if (prefs.inApp !== false) {
      await createNotification({
        userId: row.userId,
        type: "task_due",
        title: "Task due",
        body: `${row.title} is due${row.dueDate ? ` (${row.dueDate.toLocaleDateString()})` : ""}.`,
        href: `/notes/${row.noteId}`,
        dedupeKey: `task-due:${row.taskId}:${row.dueDate?.getTime() ?? "none"}`,
      });
    }

    if (prefs.telegramPush !== false && row.chatId) {
      const result = await sendTelegramNotification(
        {
          title: "⏰ Task due",
          body: row.title,
          metadata: {
            Note: row.noteTitle,
            Due: row.dueDate?.toISOString(),
          },
        },
        { chatId: row.chatId, userId: row.userId },
      );

      if (result.ok) {
        await db
          .update(schema.tasks)
          .set({ dueReminderSentAt: new Date() })
          .where(eq(schema.tasks.id, row.taskId));
      } else if (prefs.inApp !== false) {
        await createNotification({
          userId: row.userId,
          type: "delivery_failed",
          title: "Telegram reminder was not delivered",
          body: "Check your Telegram connection or server bot configuration, then retry by changing the task due date.",
          href: "/settings",
          dedupeKey: `telegram-task-failed:${row.taskId}:${row.dueDate?.getTime() ?? "none"}`,
        });
      }
    } else {
      await db
        .update(schema.tasks)
        .set({ dueReminderSentAt: new Date() })
        .where(eq(schema.tasks.id, row.taskId));
    }
  }
}

const nudgedToday = new Map<string, string>();
const projectDeadlineNudged = new Map<string, string>();
const weeklyReviewNudged = new Map<string, string>();

async function checkProjectDeadlineReminders() {
  const now = new Date();
  const threshold48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const todayKey = formatDateKey(now);

  const projects = await db
    .select({
      projectId: schema.notes.id,
      title: schema.notes.title,
      dueDate: schema.notes.dueDate,
      userId: schema.notes.userId,
      chatId: schema.users.telegramChatId,
      settings: schema.users.settings,
    })
    .from(schema.notes)
    .innerJoin(schema.users, eq(schema.notes.userId, schema.users.id))
    .where(
      and(
        eq(schema.notes.type, "project"),
        isNotNull(schema.notes.dueDate),
        lte(schema.notes.dueDate, threshold48h),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
        ne(schema.notes.status, "done"),
        ne(schema.notes.status, "archived"),
      ),
    );

  for (const proj of projects) {
    if (!proj.dueDate) continue;
    const prefs = parseNotificationPrefs(proj.settings);
    if (prefs.projectDeadlineReminders === false) continue;

    const guardKey = `${proj.projectId}:${todayKey}`;
    if (projectDeadlineNudged.get(proj.userId) === guardKey) continue;

    const isOverdue = proj.dueDate < now;
    const dueStr = proj.dueDate.toLocaleDateString();
    const alertTitle = isOverdue ? `🚨 Project Overdue: ${proj.title}` : `🎯 Project Deadline Approaching: ${proj.title}`;
    const alertBody = isOverdue
      ? `Project "${proj.title}" was due on ${dueStr}. Review pending milestones and tasks.`
      : `Project "${proj.title}" is due on ${dueStr}.`;

    if (prefs.inApp !== false) {
      await createNotification({
        userId: proj.userId,
        type: "project_deadline",
        title: alertTitle,
        body: alertBody,
        href: `/projects/${proj.projectId}`,
        dedupeKey: `proj-deadline:${proj.projectId}:${guardKey}`,
      });
    }

    if (prefs.telegramPush !== false && proj.chatId) {
      await sendTelegramNotification(
        {
          title: alertTitle,
          body: alertBody,
          metadata: {
            Project: proj.title,
            "Due Date": dueStr,
          },
        },
        { chatId: proj.chatId, userId: proj.userId },
      );
    }

    projectDeadlineNudged.set(proj.userId, guardKey);
  }
}

async function checkDailyNoteNudge() {
  const todayKey = formatDateKey(new Date());

  const rows = await db
    .select({
      userId: schema.users.id,
      chatId: schema.users.telegramChatId,
      settings: schema.users.settings,
    })
    .from(schema.users)
    .where(isNotNull(schema.users.telegramChatId));

  for (const row of rows) {
    if (!row.chatId) continue;
    const prefs = parseNotificationPrefs(row.settings);
    if (prefs.dailyNoteNudge !== true) continue;
    if (nudgedToday.get(row.userId) === todayKey) continue;

    const existing = await db
      .select({ id: schema.notes.id })
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.userId, row.userId),
          eq(schema.notes.type, "daily"),
          eq(schema.notes.slug, todayKey),
        ),
      )
      .limit(1);

    if (existing[0]) {
      nudgedToday.set(row.userId, todayKey);
      continue;
    }

    if (prefs.inApp !== false) {
      await createNotification({
        userId: row.userId,
        type: "daily_nudge",
        title: "📝 Daily Reflection",
        body: "You haven't opened today's daily log yet. Take a mindful moment to reflect and plan.",
        href: "/daily",
        dedupeKey: `daily-nudge:${row.userId}:${todayKey}`,
      });
    }

    if (prefs.telegramPush !== false) {
      const result = await sendTelegramNotification(
        {
          title: "📝 Daily Log Nudge",
          body: "You haven't started today's daily note yet. Take a moment to capture your thoughts and daily focus.",
        },
        { chatId: row.chatId, userId: row.userId },
      );
      if (result.ok) nudgedToday.set(row.userId, todayKey);
    } else {
      nudgedToday.set(row.userId, todayKey);
    }
  }
}

async function checkWeeklyReviewPrompt() {
  const now = new Date();
  const day = now.getDay();
  if (day !== 0 && day !== 5) return;

  const todayKey = formatDateKey(now);

  const rows = await db
    .select({
      userId: schema.users.id,
      chatId: schema.users.telegramChatId,
      settings: schema.users.settings,
    })
    .from(schema.users);

  for (const row of rows) {
    const prefs = parseNotificationPrefs(row.settings);
    if (prefs.weeklyReviewPrompt !== true) continue;
    if (weeklyReviewNudged.get(row.userId) === todayKey) continue;

    if (prefs.inApp !== false) {
      await createNotification({
        userId: row.userId,
        type: "weekly_review",
        title: "🔍 Weekly Review Time",
        body: "Wrap up your week: review accomplished goals, clear backlog tasks, and schedule focus priorities for next week.",
        href: "/review",
        dedupeKey: `weekly-review:${row.userId}:${todayKey}`,
      });
    }

    if (prefs.telegramPush !== false && row.chatId) {
      await sendTelegramNotification(
        {
          title: "🔍 Weekly Reflection & Planning",
          body: "Time for your weekly review. Celebrate completed tasks, update project milestones, and set clear goals for next week.",
        },
        { chatId: row.chatId, userId: row.userId },
      );
    }

    weeklyReviewNudged.set(row.userId, todayKey);
  }
}

async function tick() {
  try {
    await checkDueTaskReminders();
  } catch (err) {
    console.warn("[scheduler] task due reminder check failed:", err);
  }
  try {
    await checkProjectDeadlineReminders();
  } catch (err) {
    console.warn("[scheduler] project deadline reminder check failed:", err);
  }
  try {
    await checkDailyNoteNudge();
  } catch (err) {
    console.warn("[scheduler] daily note nudge check failed:", err);
  }
  try {
    await checkWeeklyReviewPrompt();
  } catch (err) {
    console.warn("[scheduler] weekly review check failed:", err);
  }
}

declare global {
  var __inkestSchedulerStarted: boolean | undefined;
}

export function startNotificationScheduler() {
  if (globalThis.__inkestSchedulerStarted) return;
  globalThis.__inkestSchedulerStarted = true;

  setInterval(() => void tick(), CHECK_INTERVAL_MS);
}
