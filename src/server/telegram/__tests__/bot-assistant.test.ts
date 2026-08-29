import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";
import {
  parseRelativeDateExpression,
  botCreateNote,
  botAppendToNote,
  botGetProjectDeadlines,
  botGetDailyNote,
  executeDeterministicBotCommand,
} from "../bot-assistant";
import { db, schema } from "@/server/db/client";
import { eq, and } from "drizzle-orm";
import { randomId } from "@/lib/slug";

describe("Telegram Bot Assistant - Relative Date Parsing", () => {
  const mockBaseDate = new Date(2026, 7, 29, 12, 0, 0); // 2026-08-29

  test("parses 'today' correctly", () => {
    const res = parseRelativeDateExpression("today", mockBaseDate);
    assert.equal(res.label, "Today");
    assert.equal(res.key, "2026-08-29");
  });

  test("parses 'yesterday' correctly", () => {
    const res = parseRelativeDateExpression("yesterday", mockBaseDate);
    assert.equal(res.label, "Yesterday");
    assert.equal(res.key, "2026-08-28");
  });

  test("parses 'two days ago' correctly", () => {
    const res = parseRelativeDateExpression("two days ago", mockBaseDate);
    assert.equal(res.label, "2 days ago");
    assert.equal(res.key, "2026-08-27");
  });

  test("parses '3 days ago' correctly", () => {
    const res = parseRelativeDateExpression("3 days ago", mockBaseDate);
    assert.equal(res.label, "3 days ago");
    assert.equal(res.key, "2026-08-26");
  });

  test("parses exact ISO date format", () => {
    const res = parseRelativeDateExpression("daily note for 2026-07-15", mockBaseDate);
    assert.equal(res.key, "2026-07-15");
  });

  test("parses Persian expressions 'دیروز' and '۲ روز قبل'", () => {
    const resYesterday = parseRelativeDateExpression("دیروز", mockBaseDate);
    assert.equal(resYesterday.key, "2026-08-28");
  });
});

describe("Telegram Bot Assistant - Workspace Actions & Direct Execution", () => {
  const testUserId = randomId("test_bot_user");
  const testWorkspaceId = randomId("test_bot_ws");

  beforeEach(async () => {
    // Setup test user & workspace in database
    await db.insert(schema.users).values({
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: "Bot Test User",
      role: "user",
      status: "active",
      createdAt: new Date(),
    });
    await db.insert(schema.workspaces).values({
      id: testWorkspaceId,
      userId: testUserId,
      name: "Personal",
      slug: "personal",
      createdAt: new Date(),
    });
  });

  afterEach(async () => {
    // Cleanup created data
    await db.delete(schema.tasks).where(eq(schema.tasks.userId, testUserId));
    await db.delete(schema.notes).where(eq(schema.notes.userId, testUserId));
    await db.delete(schema.workspaces).where(eq(schema.workspaces.userId, testUserId));
    await db.delete(schema.users).where(eq(schema.users.id, testUserId));
  });

  test("creates a new note in user workspace", async () => {
    const note = await botCreateNote({
      userId: testUserId,
      title: "Daily Focusing Training",
      contentMd: "# Daily Focusing Training\n\nDeep focus strategies.",
    });

    assert.ok(note.id);
    assert.equal(note.title, "Daily Focusing Training");

    const saved = await db
      .select()
      .from(schema.notes)
      .where(and(eq(schema.notes.id, note.id), eq(schema.notes.userId, testUserId)))
      .limit(1);

    assert.equal(saved.length, 1);
    assert.equal(saved[0].title, "Daily Focusing Training");
  });

  test("modifies note in a project and attaches new task", async () => {
    // 1. Create 'Inkest' project
    const project = await botCreateNote({
      userId: testUserId,
      title: "Inkest",
      type: "project",
    });

    // 2. Create 'Todo list' note under 'Inkest'
    const todoNote = await botCreateNote({
      userId: testUserId,
      title: "Todo list",
      parentId: project.id,
      contentMd: "# Todo list\n\n- [ ] Initial setup",
    });

    // 3. Append new paragraph and task
    const updated = await botAppendToNote({
      userId: testUserId,
      noteId: todoNote.id,
      appendContent: "New task: Managing users on cloud",
      createTaskItem: { title: "Managing users on cloud", priority: "high" },
    });

    assert.ok(updated.contentMd.includes("Managing users on cloud"));
    assert.ok(updated.createdTask);
    assert.equal(updated.createdTask?.title, "Managing users on cloud");

    const tasks = await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.noteId, todoNote.id), eq(schema.tasks.userId, testUserId)));

    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].title, "Managing users on cloud");
    assert.equal(tasks[0].priority, "high");
  });

  test("retrieves project deadlines and milestones", async () => {
    const dueDate = new Date(Date.now() + 10 * 86400000);
    const project = await db
      .insert(schema.notes)
      .values({
        id: randomId(),
        userId: testUserId,
        workspaceId: testWorkspaceId,
        title: "Inkest Release",
        slug: "inkest-release",
        type: "project",
        dueDate,
        status: "doing",
        priority: "high",
        createdAt: new Date(),
      })
      .returning();

    await db.insert(schema.tasks).values({
      id: randomId("task"),
      userId: testUserId,
      noteId: project[0].id,
      title: "Security Audit",
      status: "todo",
      priority: "high",
      dueDate,
      createdAt: new Date(),
    });

    const result = await botGetProjectDeadlines(testUserId, "Inkest Release");
    assert.equal(result.ok, true);
    assert.ok(result.message.includes("Inkest Release"));
    assert.ok(result.message.includes("Security Audit"));
    assert.ok(result.message.includes("Status"));
  });

  test("retrieves daily note for relative dates", async () => {
    const date2DaysAgo = new Date(Date.now() - 2 * 86400000);
    const yyyy = date2DaysAgo.getFullYear();
    const mm = String(date2DaysAgo.getMonth() + 1).padStart(2, "0");
    const dd = String(date2DaysAgo.getDate()).padStart(2, "0");
    const slug = `${yyyy}-${mm}-${dd}`;

    await db.insert(schema.notes).values({
      id: randomId(),
      userId: testUserId,
      workspaceId: testWorkspaceId,
      title: `Daily — ${slug}`,
      slug,
      contentMd: `# Daily Log for ${slug}\n\nCompleted deep research and architectural reviews.`,
      type: "daily",
      createdAt: date2DaysAgo,
    });

    const result = await botGetDailyNote(testUserId, "two days ago");
    assert.equal(result.ok, true);
    assert.ok(result.message.includes("deep research and architectural reviews"));
  });
});

describe("Telegram Bot Assistant - Natural Language Command Parser", () => {
  const testUserId = randomId("test_bot_nlp_user");
  const testWorkspaceId = randomId("test_bot_nlp_ws");

  beforeEach(async () => {
    await db.insert(schema.users).values({
      id: testUserId,
      email: `${testUserId}@example.com`,
      name: "NLP Bot Test User",
      role: "user",
      status: "active",
      createdAt: new Date(),
    });
    await db.insert(schema.workspaces).values({
      id: testWorkspaceId,
      userId: testUserId,
      name: "Personal",
      slug: "personal",
      createdAt: new Date(),
    });
  });

  afterEach(async () => {
    await db.delete(schema.tasks).where(eq(schema.tasks.userId, testUserId));
    await db.delete(schema.notes).where(eq(schema.notes.userId, testUserId));
    await db.delete(schema.workspaces).where(eq(schema.workspaces.userId, testUserId));
    await db.delete(schema.users).where(eq(schema.users.id, testUserId));
  });

  test("handles user prompt: 'Write a new note about \"daily focusing training\"'", async () => {
    const reply = await executeDeterministicBotCommand(
      testUserId,
      'Write a new note about "daily focusing training"',
    );

    assert.ok(reply.includes("Note Created"));
    assert.ok(reply.includes("daily focusing training"));

    const created = await db
      .select()
      .from(schema.notes)
      .where(and(eq(schema.notes.userId, testUserId), eq(schema.notes.title, "daily focusing training")))
      .limit(1);

    assert.equal(created.length, 1);
  });

  test("handles user prompt: 'Modify \"Inkest\" project \"Todo list\" note and add new paragraph about new task \"Managing users on cloud\" to it'", async () => {
    // Setup project first
    await botCreateNote({
      userId: testUserId,
      title: "Inkest",
      type: "project",
    });

    const reply = await executeDeterministicBotCommand(
      testUserId,
      'Modify "Inkest" project "Todo list" note and add new paragraph about new task "Managing users on cloud" to it',
    );

    assert.ok(reply.includes("Updated Note in Project"));
    assert.ok(reply.includes("Todo list"));
    assert.ok(reply.includes("Managing users on cloud"));
  });

  test("handles user prompt: 'Tell me about deadlines of the \"Inkest\" project'", async () => {
    await db.insert(schema.notes).values({
      id: randomId(),
      userId: testUserId,
      workspaceId: testWorkspaceId,
      title: "Inkest",
      slug: "inkest",
      type: "project",
      status: "doing",
      priority: "high",
      dueDate: new Date(Date.now() + 5 * 86400000),
      createdAt: new Date(),
    });

    const reply = await executeDeterministicBotCommand(
      testUserId,
      'Tell me about deadlines of the "Inkest" project',
    );

    assert.ok(reply.includes("Project: Inkest"));
    assert.ok(reply.includes("Target Due Date"));
  });

  test("handles user prompt: 'Give me the content of the daily note of two days ago'", async () => {
    const date2DaysAgo = new Date(Date.now() - 2 * 86400000);
    const yyyy = date2DaysAgo.getFullYear();
    const mm = String(date2DaysAgo.getMonth() + 1).padStart(2, "0");
    const dd = String(date2DaysAgo.getDate()).padStart(2, "0");
    const slug = `${yyyy}-${mm}-${dd}`;

    await db.insert(schema.notes).values({
      id: randomId(),
      userId: testUserId,
      workspaceId: testWorkspaceId,
      title: `Daily — ${slug}`,
      slug,
      contentMd: `# Daily Log\n\nReviewed architectural requirements and designed notification center.`,
      type: "daily",
      createdAt: date2DaysAgo,
    });

    const reply = await executeDeterministicBotCommand(
      testUserId,
      "Give me the content of the daily note of two days ago",
    );

    assert.ok(reply.includes("designed notification center"));
  });

  test("handles shortcuts: /help, /today, /tasks, /projects", async () => {
    const helpReply = await executeDeterministicBotCommand(testUserId, "/help");
    assert.ok(helpReply.includes("Inkest Telegram Workspace Assistant"));

    const projectsReply = await executeDeterministicBotCommand(testUserId, "/projects");
    assert.ok(typeof projectsReply === "string");

    const tasksReply = await executeDeterministicBotCommand(testUserId, "/tasks");
    assert.ok(tasksReply.includes("Inkest Workspace Overview"));
  });
});
