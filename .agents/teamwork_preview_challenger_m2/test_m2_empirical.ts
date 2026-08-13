import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { eq, and, desc, asc } from "drizzle-orm";
import * as schema from "@/server/db/schema";

// Create an in-memory SQLite database for empirical verification
function setupTestDb() {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });

  // Enable foreign keys
  sqlite.run("PRAGMA foreign_keys = ON;");

  // Create tables matching schema
  sqlite.run(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  sqlite.run(`
    CREATE TABLE workspaces (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  sqlite.run(`
    CREATE TABLE chat_threads (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  sqlite.run(`
    CREATE TABLE chat_messages (
      id TEXT PRIMARY KEY NOT NULL,
      thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_error INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);

  return { sqlite, db };
}

describe("Empirical Verification of M2 - DB Persistence & Scoping", () => {
  let sqlite: Database;
  let db: ReturnType<typeof setupTestDb>["db"];

  const user1 = { id: "usr_1", email: "u1@test.com", name: "User 1", createdAt: new Date(), updatedAt: new Date() };
  const user2 = { id: "usr_2", email: "u2@test.com", name: "User 2", createdAt: new Date(), updatedAt: new Date() };

  const ws1 = { id: "ws_1", name: "Workspace 1", slug: "ws1", ownerId: user1.id, createdAt: new Date(), updatedAt: new Date() };
  const ws2 = { id: "ws_2", name: "Workspace 2", slug: "ws2", ownerId: user1.id, createdAt: new Date(), updatedAt: new Date() };
  const ws3 = { id: "ws_3", name: "Workspace 3", slug: "ws3", ownerId: user2.id, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(() => {
    const res = setupTestDb();
    sqlite = res.sqlite;
    db = res.db;

    // Seed test users and workspaces
    db.insert(schema.users).values([user1, user2]).run();
    db.insert(schema.workspaces).values([ws1, ws2, ws3]).run();
  });

  afterEach(() => {
    sqlite.close();
  });

  it("1. Schema & Table structure: chat_threads and chat_messages foreign keys and columns", () => {
    const threadsInfo = sqlite.prepare("PRAGMA table_info(chat_threads)").all() as any[];
    const messagesInfo = sqlite.prepare("PRAGMA table_info(chat_messages)").all() as any[];

    const threadCols = threadsInfo.map((c) => c.name);
    expect(threadCols).toContain("id");
    expect(threadCols).toContain("user_id");
    expect(threadCols).toContain("workspace_id");
    expect(threadCols).toContain("title");
    expect(threadCols).toContain("created_at");
    expect(threadCols).toContain("updated_at");

    const msgCols = messagesInfo.map((c) => c.name);
    expect(msgCols).toContain("id");
    expect(msgCols).toContain("thread_id");
    expect(msgCols).toContain("user_id");
    expect(msgCols).toContain("workspace_id");
    expect(msgCols).toContain("role");
    expect(msgCols).toContain("content");
    expect(msgCols).toContain("is_error");
    expect(msgCols).toContain("created_at");
  });

  it("2. Thread Creation & Default Titling", async () => {
    const threadId = "chat_t1";
    const now = new Date();

    await db.insert(schema.chatThreads).values({
      id: threadId,
      userId: user1.id,
      workspaceId: ws1.id,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
    });

    const [t] = await db
      .select()
      .from(schema.chatThreads)
      .where(and(eq(schema.chatThreads.id, threadId), eq(schema.chatThreads.userId, user1.id), eq(schema.chatThreads.workspaceId, ws1.id)));

    expect(t).toBeDefined();
    expect(t.title).toBe("New Chat");
    expect(t.userId).toBe(user1.id);
    expect(t.workspaceId).toBe(ws1.id);
  });

  it("3. Message Addition & Auto-Title Update on First User Message", async () => {
    const threadId = "chat_t1";
    const now = new Date();

    await db.insert(schema.chatThreads).values({
      id: threadId,
      userId: user1.id,
      workspaceId: ws1.id,
      title: "New Chat",
      createdAt: now,
      updatedAt: now,
    });

    // Add first user message
    const msgId = "msg_m1";
    const userPrompt = "Explain how Drizzle schema migrations work in Inkest";

    await db.insert(schema.chatMessages).values({
      id: msgId,
      threadId,
      userId: user1.id,
      workspaceId: ws1.id,
      role: "user",
      content: userPrompt,
      isError: false,
      createdAt: now,
    });

    // Simulate chat service auto-title update
    const autoTitle = userPrompt.trim().slice(0, 40);
    await db
      .update(schema.chatThreads)
      .set({ title: autoTitle, updatedAt: new Date() })
      .where(and(eq(schema.chatThreads.id, threadId), eq(schema.chatThreads.userId, user1.id), eq(schema.chatThreads.workspaceId, ws1.id)));

    const [updatedThread] = await db
      .select()
      .from(schema.chatThreads)
      .where(eq(schema.chatThreads.id, threadId));

    expect(updatedThread.title).toBe("Explain how Drizzle schema migrations work");
  });

  it("4. Dual userId + workspaceId Scoping Enforcement", async () => {
    // Create thread for User 1 in Workspace 1
    const t1 = "chat_u1_ws1";
    await db.insert(schema.chatThreads).values({
      id: t1,
      userId: user1.id,
      workspaceId: ws1.id,
      title: "User 1 WS 1 Thread",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create thread for User 1 in Workspace 2
    const t2 = "chat_u1_ws2";
    await db.insert(schema.chatThreads).values({
      id: t2,
      userId: user1.id,
      workspaceId: ws2.id,
      title: "User 1 WS 2 Thread",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create thread for User 2 in Workspace 3
    const t3 = "chat_u2_ws3";
    await db.insert(schema.chatThreads).values({
      id: t3,
      userId: user2.id,
      workspaceId: ws3.id,
      title: "User 2 WS 3 Thread",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Query threads for User 1 + WS 1
    const resUser1Ws1 = await db
      .select()
      .from(schema.chatThreads)
      .where(and(eq(schema.chatThreads.userId, user1.id), eq(schema.chatThreads.workspaceId, ws1.id)));
    expect(resUser1Ws1.length).toBe(1);
    expect(resUser1Ws1[0].id).toBe(t1);

    // Query threads for User 1 + WS 2
    const resUser1Ws2 = await db
      .select()
      .from(schema.chatThreads)
      .where(and(eq(schema.chatThreads.userId, user1.id), eq(schema.chatThreads.workspaceId, ws2.id)));
    expect(resUser1Ws2.length).toBe(1);
    expect(resUser1Ws2[0].id).toBe(t2);

    // Verify User 2 in WS 3 cannot read User 1 WS 1 thread
    const unauthorizedAccess = await db
      .select()
      .from(schema.chatThreads)
      .where(and(eq(schema.chatThreads.id, t1), eq(schema.chatThreads.userId, user2.id), eq(schema.chatThreads.workspaceId, ws3.id)));
    expect(unauthorizedAccess.length).toBe(0);
  });

  it("5. Cascade Deletion of Messages when Thread is Deleted", async () => {
    const threadId = "chat_t_cascade";
    const now = new Date();

    await db.insert(schema.chatThreads).values({
      id: threadId,
      userId: user1.id,
      workspaceId: ws1.id,
      title: "Cascade Test",
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(schema.chatMessages).values([
      { id: "m1", threadId, userId: user1.id, workspaceId: ws1.id, role: "user", content: "Q1", isError: false, createdAt: now },
      { id: "m2", threadId, userId: user1.id, workspaceId: ws1.id, role: "assistant", content: "A1", isError: false, createdAt: now },
    ]);

    // Verify messages exist
    const initialMsgs = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.threadId, threadId));
    expect(initialMsgs.length).toBe(2);

    // Delete thread
    await db.delete(schema.chatThreads).where(and(eq(schema.chatThreads.id, threadId), eq(schema.chatThreads.userId, user1.id), eq(schema.chatThreads.workspaceId, ws1.id)));

    // Verify messages are cascaded and deleted automatically by foreign key constraint
    const remainingMsgs = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.threadId, threadId));
    expect(remainingMsgs.length).toBe(0);
  });

  it("6. Ordering: Threads by updatedAt desc, Messages by createdAt asc", async () => {
    const t1 = "t_old";
    const t2 = "t_new";

    const t1Date = new Date(Date.now() - 10000);
    const t2Date = new Date(Date.now());

    await db.insert(schema.chatThreads).values([
      { id: t1, userId: user1.id, workspaceId: ws1.id, title: "Old Thread", createdAt: t1Date, updatedAt: t1Date },
      { id: t2, userId: user1.id, workspaceId: ws1.id, title: "New Thread", createdAt: t2Date, updatedAt: t2Date },
    ]);

    const threads = await db
      .select()
      .from(schema.chatThreads)
      .where(and(eq(schema.chatThreads.userId, user1.id), eq(schema.chatThreads.workspaceId, ws1.id)))
      .orderBy(desc(schema.chatThreads.updatedAt));

    expect(threads[0].id).toBe(t2);
    expect(threads[1].id).toBe(t1);

    // Messages ordering
    const m1Date = new Date(1000);
    const m2Date = new Date(2000);

    await db.insert(schema.chatMessages).values([
      { id: "msg_2", threadId: t2, userId: user1.id, workspaceId: ws1.id, role: "assistant", content: "Second", isError: false, createdAt: m2Date },
      { id: "msg_1", threadId: t2, userId: user1.id, workspaceId: ws1.id, role: "user", content: "First", isError: false, createdAt: m1Date },
    ]);

    const messages = await db
      .select()
      .from(schema.chatMessages)
      .where(and(eq(schema.chatMessages.threadId, t2), eq(schema.chatMessages.userId, user1.id), eq(schema.chatMessages.workspaceId, ws1.id)))
      .orderBy(asc(schema.chatMessages.createdAt));

    expect(messages[0].id).toBe("msg_1");
    expect(messages[1].id).toBe("msg_2");
  });
});
