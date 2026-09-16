import { and, desc, eq, isNull } from "drizzle-orm";
import { randomId } from "@/lib/slug";
import { getCurrentUser } from "@/server/auth";
import { db, schema } from "@/server/db/client";

export type NotificationType =
  | "task_due"
  | "delivery_failed"
  | "project_shared"
  | "note_shared_updated"
  | "project_deadline"
  | "daily_nudge"
  | "weekly_review"
  | "morning_briefing"
  | "telegram_action";

type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
  dedupeKey: string;
};

export type InboxNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function createNotification(input: CreateNotificationInput) {
  await db.insert(schema.notifications).values({ id: randomId("notification"), ...input }).onConflictDoNothing();
}

export async function ensureDefaultModelNotification(userId: string) {
  try {
    await db
      .insert(schema.notifications)
      .values({
        id: randomId("notification"),
        userId,
        type: "daily_nudge",
        title: "Default AI Model: OpenRouter Free",
        body: "AI is now set to OpenRouter Free by default. If you want to use more powerful models (like Claude 3.7 Sonnet, GPT-4o, or DeepSeek R1), you can bring your own API key in Settings.",
        href: "/settings?tab=ai",
        dedupeKey: "system:openrouter-free-default-notice",
      })
      .onConflictDoNothing();
  } catch {
    // Non-fatal if DB is during migration or connection failed
  }
}

export async function listInboxNotifications(limit = 8): Promise<InboxNotification[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  await ensureDefaultModelNotification(user.id);
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, user.id)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
  return rows.map((row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, href: row.href, readAt: row.readAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }));
}

export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
}
