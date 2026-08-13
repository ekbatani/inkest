import { eq, and, desc, asc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";
import type { ChatThread, ChatMessageEntity } from "@/server/db/schema";

async function getAuthContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");
  return { user, workspace };
}

export async function createChatThread(title?: string): Promise<ChatThread> {
  const { user, workspace } = await getAuthContext();
  const threadId = randomId("chat");
  const now = new Date();
  const threadTitle = title?.trim() || "New Chat";

  await db.insert(schema.chatThreads).values({
    id: threadId,
    userId: user.id,
    workspaceId: workspace.id,
    title: threadTitle,
    createdAt: now,
    updatedAt: now,
  });

  const [created] = await db
    .select()
    .from(schema.chatThreads)
    .where(
      and(
        eq(schema.chatThreads.id, threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!created) throw new Error("FAILED_TO_CREATE_THREAD");
  return created;
}

export async function listChatThreads(): Promise<ChatThread[]> {
  const { user, workspace } = await getAuthContext();
  return db
    .select()
    .from(schema.chatThreads)
    .where(
      and(
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    )
    .orderBy(desc(schema.chatThreads.updatedAt));
}

export async function getChatThreadMessages(threadId: string): Promise<ChatMessageEntity[]> {
  const { user, workspace } = await getAuthContext();

  const [thread] = await db
    .select()
    .from(schema.chatThreads)
    .where(
      and(
        eq(schema.chatThreads.id, threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!thread) throw new Error("THREAD_NOT_FOUND");

  return db
    .select()
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.threadId, threadId),
        eq(schema.chatMessages.userId, user.id),
        eq(schema.chatMessages.workspaceId, workspace.id),
      ),
    )
    .orderBy(asc(schema.chatMessages.createdAt));
}

export async function addChatMessage(args: {
  threadId: string;
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}): Promise<ChatMessageEntity> {
  const { user, workspace } = await getAuthContext();

  const [thread] = await db
    .select()
    .from(schema.chatThreads)
    .where(
      and(
        eq(schema.chatThreads.id, args.threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!thread) throw new Error("THREAD_NOT_FOUND");

  const msgId = randomId("msg");
  const now = new Date();

  await db.insert(schema.chatMessages).values({
    id: msgId,
    threadId: args.threadId,
    userId: user.id,
    workspaceId: workspace.id,
    role: args.role,
    content: args.content,
    isError: args.isError ?? false,
    createdAt: now,
  });

  let newTitle = thread.title;
  if (thread.title === "New Chat" && args.role === "user" && args.content.trim()) {
    newTitle = args.content.trim().slice(0, 40);
  }

  await db
    .update(schema.chatThreads)
    .set({
      title: newTitle,
      updatedAt: now,
    })
    .where(
      and(
        eq(schema.chatThreads.id, args.threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    );

  const [inserted] = await db
    .select()
    .from(schema.chatMessages)
    .where(
      and(
        eq(schema.chatMessages.id, msgId),
        eq(schema.chatMessages.userId, user.id),
        eq(schema.chatMessages.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!inserted) throw new Error("FAILED_TO_ADD_MESSAGE");
  return inserted;
}

export async function deleteChatThread(threadId: string): Promise<void> {
  const { user, workspace } = await getAuthContext();

  const [thread] = await db
    .select()
    .from(schema.chatThreads)
    .where(
      and(
        eq(schema.chatThreads.id, threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  if (!thread) return;

  await db
    .delete(schema.chatThreads)
    .where(
      and(
        eq(schema.chatThreads.id, threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    );
}

export async function updateChatThreadTitle(threadId: string, title: string): Promise<void> {
  const { user, workspace } = await getAuthContext();
  await db
    .update(schema.chatThreads)
    .set({
      title: title.trim() || "New Chat",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.chatThreads.id, threadId),
        eq(schema.chatThreads.userId, user.id),
        eq(schema.chatThreads.workspaceId, workspace.id),
      ),
    );
}
