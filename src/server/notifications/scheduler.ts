import { and, eq, isNull, isNotNull, lte, ne } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { sendTelegramNotification, telegramBotToken } from "@/server/notifications/telegram";
import { formatDateKey } from "@/server/calendar/service";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

type NotificationPrefs = {
  taskDueReminders?: boolean;
  dailyNoteNudge?: boolean;
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
        isNotNull(schema.users.telegramChatId),
      ),
    );

  for (const row of rows) {
    if (!row.chatId) continue;
    if (parseNotificationPrefs(row.settings).taskDueReminders !== true) continue;

    const result = await sendTelegramNotification(
      {
        title: "⏰ Task due",
        body: row.title,
        metadata: {
          Note: row.noteTitle,
          Due: row.dueDate?.toISOString(),
        },
      },
      { chatId: row.chatId },
    );

    if (result.ok) {
      await db
        .update(schema.tasks)
        .set({ dueReminderSentAt: new Date() })
        .where(eq(schema.tasks.id, row.taskId));
    }
  }
}

// In-memory guard so the daily nudge fires at most once per user per calendar day. Resets
// naturally when the date key changes; a server restart may cause at most one extra nudge,
// which is an acceptable trade-off for not needing a dedicated DB column for this.
const nudgedToday = new Map<string, string>();

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
    if (parseNotificationPrefs(row.settings).dailyNoteNudge !== true) continue;
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

    const result = await sendTelegramNotification(
      {
        title: "📝 Daily note",
        body: "You haven't started today's daily note yet.",
      },
      { chatId: row.chatId },
    );
    if (result.ok) nudgedToday.set(row.userId, todayKey);
  }
}

async function tick() {
  try {
    await checkDueTaskReminders();
  } catch (err) {
    console.warn("[scheduler] task due reminder check failed:", err);
  }
  try {
    await checkDailyNoteNudge();
  } catch (err) {
    console.warn("[scheduler] daily note nudge check failed:", err);
  }
}

declare global {
  var __inkestSchedulerStarted: boolean | undefined;
}

/** Starts the self-host notification scheduler once per server process (safe against dev HMR). */
export function startNotificationScheduler() {
  if (globalThis.__inkestSchedulerStarted) return;
  globalThis.__inkestSchedulerStarted = true;

  if (!telegramBotToken()) return;

  setInterval(() => void tick(), CHECK_INTERVAL_MS);
}
