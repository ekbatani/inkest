import { and, desc, eq, isNull } from "drizzle-orm";
import { randomId } from "@/lib/slug";
import { getCurrentUser } from "@/server/auth";
import { db, schema } from "@/server/db/client";

type CreateNotificationInput = {
  userId: string;
  type: "task_due" | "delivery_failed";
  title: string;
  body: string;
  href?: string;
  dedupeKey: string;
};

export type InboxNotification = {
  id: string;
  type: "task_due" | "delivery_failed";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function createNotification(input: CreateNotificationInput) {
  await db.insert(schema.notifications).values({ id: randomId("notification"), ...input }).onConflictDoNothing();
}

export async function listInboxNotifications(limit = 8): Promise<InboxNotification[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, user.id)).orderBy(desc(schema.notifications.createdAt)).limit(limit);
  return rows.map((row) => ({ id: row.id, type: row.type, title: row.title, body: row.body, href: row.href, readAt: row.readAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }));
}

export async function markNotificationRead(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  await db.update(schema.notifications).set({ readAt: new Date() }).where(and(eq(schema.notifications.id, id), eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
}
