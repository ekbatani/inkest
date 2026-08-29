import { and, eq, isNull, desc, asc, lte, gte, or } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { randomId, slugify } from "@/lib/slug";
import { getAiProvider } from "@/server/ai/provider";
import { formatDateKey, parseDateKey } from "@/server/calendar/service";
import { sendRawTelegramMessage } from "@/server/notifications/telegram";

export interface BotContext {
  userId: string;
  chatId: string;
  botToken: string;
}

export interface WorkspaceItemResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

/**
 * Resolves a date string or natural relative expression (e.g. "two days ago", "yesterday", "today", "3 days ago", "2026-08-25").
 */
export function parseRelativeDateExpression(expr: string, baseDate = new Date()): { date: Date; key: string; label: string } {
  const norm = expr.trim().toLowerCase();
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);

  if (norm.includes("today") || norm.includes("امروز")) {
    return { date: d, key: formatDateKey(d), label: "Today" };
  }
  if (norm.includes("yesterday") || norm.includes("دیروز")) {
    d.setDate(d.getDate() - 1);
    return { date: d, key: formatDateKey(d), label: "Yesterday" };
  }

  // "two days ago", "three days ago", "X days ago", "۲ روز قبل"
  const numberWords: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    یک: 1,
    دو: 2,
    سه: 3,
    چهار: 4,
    پنج: 5,
  };

  const daysAgoMatch = norm.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten|یک|دو|سه|چهار|پنج)\s*(?:days?|روز)\s*(?:ago|before|پیش|قبل)/);
  if (daysAgoMatch) {
    const rawVal = daysAgoMatch[1];
    const days = numberWords[rawVal] ?? parseInt(rawVal, 10);
    if (!isNaN(days) && days > 0) {
      d.setDate(d.getDate() - days);
      return { date: d, key: formatDateKey(d), label: `${days} days ago` };
    }
  }

  // Exact ISO date match (YYYY-MM-DD)
  const isoMatch = norm.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const parsed = parseDateKey(isoMatch[1]);
    if (parsed) {
      return { date: parsed, key: formatDateKey(parsed), label: formatDateKey(parsed) };
    }
  }

  return { date: d, key: formatDateKey(d), label: formatDateKey(d) };
}

/**
 * Gets or creates the default workspace for a user.
 */
async function getWorkspaceId(userId: string): Promise<string> {
  const rows = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.userId, userId))
    .limit(1);

  if (rows[0]?.id) return rows[0].id;

  const newId = randomId("ws");
  await db.insert(schema.workspaces).values({
    id: newId,
    userId,
    name: "Personal",
    slug: "personal",
  });
  return newId;
}

/**
 * Creates a new note in the user's workspace.
 */
export async function botCreateNote(params: {
  userId: string;
  title: string;
  contentMd?: string;
  parentId?: string | null;
  type?: "note" | "project" | "daily";
}): Promise<{ id: string; title: string; slug: string }> {
  const workspaceId = await getWorkspaceId(params.userId);
  const id = randomId();
  const title = params.title.trim() || "Untitled Note";
  const slug = `${slugify(title)}-${id.slice(0, 6)}`;
  const contentMd = params.contentMd?.trim() || `# ${title}\n\n*Created via Telegram*\n`;

  await db.insert(schema.notes).values({
    id,
    userId: params.userId,
    workspaceId,
    title,
    slug,
    contentMd,
    type: params.type || "note",
    parentId: params.parentId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { id, title, slug };
}

/**
 * Finds a project by fuzzy or case-insensitive title.
 */
export async function botFindProject(userId: string, query: string) {
  const norm = query.toLowerCase().trim();
  const projects = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, userId),
        eq(schema.notes.type, "project"),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    );

  return (
    projects.find((p) => p.title.toLowerCase() === norm) ||
    projects.find((p) => p.title.toLowerCase().includes(norm) || norm.includes(p.title.toLowerCase())) ||
    projects[0] ||
    null
  );
}

/**
 * Finds a note by title, optionally under a specific project parent.
 */
export async function botFindNote(userId: string, noteTitle: string, parentId?: string | null) {
  const norm = noteTitle.toLowerCase().trim();
  const conditions = [
    eq(schema.notes.userId, userId),
    isNull(schema.notes.deletedAt),
    eq(schema.notes.archived, false),
  ];

  if (parentId) {
    conditions.push(eq(schema.notes.parentId, parentId));
  }

  const notes = await db.select().from(schema.notes).where(and(...conditions));

  let matched = notes.find((n) => n.title.toLowerCase() === norm);
  if (!matched) {
    matched = notes.find((n) => n.title.toLowerCase().includes(norm) || norm.includes(n.title.toLowerCase()));
  }

  // Fallback to searching without parent constraint if not found
  if (!matched && parentId) {
    return botFindNote(userId, noteTitle, null);
  }

  return matched || null;
}

/**
 * Appends text or modifies content in an existing note.
 */
export async function botAppendToNote(params: {
  userId: string;
  noteId: string;
  appendContent: string;
  createTaskItem?: { title: string; dueDate?: Date; priority?: "none" | "low" | "medium" | "high" };
}) {
  const existing = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.id, params.noteId),
        eq(schema.notes.userId, params.userId),
        isNull(schema.notes.deletedAt),
      ),
    )
    .limit(1);

  if (!existing[0]) throw new Error(`Note not found: ${params.noteId}`);

  const updatedContent = `${existing[0].contentMd.trimEnd()}\n\n${params.appendContent.trim()}`;
  await db
    .update(schema.notes)
    .set({ contentMd: updatedContent, updatedAt: new Date() })
    .where(eq(schema.notes.id, params.noteId));

  let createdTask = null;
  if (params.createTaskItem) {
    const taskId = randomId("task");
    await db.insert(schema.tasks).values({
      id: taskId,
      userId: params.userId,
      noteId: params.noteId,
      title: params.createTaskItem.title,
      dueDate: params.createTaskItem.dueDate || null,
      priority: params.createTaskItem.priority || "none",
      status: "todo",
      source: "ai",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    createdTask = { id: taskId, title: params.createTaskItem.title };
  }

  return { note: existing[0], contentMd: updatedContent, createdTask };
}

/**
 * Queries project deadlines, milestones, subprojects, and attached tasks.
 */
export async function botGetProjectDeadlines(userId: string, projectName: string) {
  const project = await botFindProject(userId, projectName);
  if (!project) {
    return { ok: false, message: `Could not find any project matching "${projectName}".` };
  }

  const [subprojects, tasks] = await Promise.all([
    db
      .select()
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.userId, userId),
          eq(schema.notes.parentId, project.id),
          eq(schema.notes.type, "project"),
          isNull(schema.notes.deletedAt),
        ),
      ),
    db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.userId, userId),
          eq(schema.tasks.noteId, project.id),
        ),
      )
      .orderBy(asc(schema.tasks.dueDate)),
  ]);

  const now = new Date();
  const formatDue = (d: Date | null) => {
    if (!d) return "No due date";
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const dateStr = d.toLocaleDateString();
    if (diffDays < 0) return `${dateStr} (⚠️ Overdue by ${Math.abs(diffDays)}d)`;
    if (diffDays === 0) return `${dateStr} (⏰ Due today)`;
    return `${dateStr} (in ${diffDays}d)`;
  };

  const lines = [
    `🎯 *Project: ${project.title}*`,
    `• *Status*: ${project.status || "active"} | *Priority*: ${project.priority || "none"}`,
    `• *Target Due Date*: ${formatDue(project.dueDate)}`,
  ];

  if (tasks.length > 0) {
    lines.push("\n📋 *Project Tasks & Milestones:*");
    for (const t of tasks) {
      const mark = t.status === "done" ? "✅" : t.status === "doing" ? "🔄" : "◻️";
      lines.push(`  ${mark} *${t.title}* — ${formatDue(t.dueDate)} [${t.priority}]`);
    }
  } else {
    lines.push("\n📋 *Tasks*: No direct tasks attached yet.");
  }

  if (subprojects.length > 0) {
    lines.push("\n📁 *Subprojects:*");
    for (const sp of subprojects) {
      lines.push(`  • *${sp.title}* — Due: ${formatDue(sp.dueDate)} (${sp.status})`);
    }
  }

  return { ok: true, message: lines.join("\n") };
}

/**
 * Retrieves daily note content for a specified relative or absolute date.
 */
export async function botGetDailyNote(userId: string, dateExpr: string) {
  const { date, key, label } = parseRelativeDateExpression(dateExpr);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rows = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, userId),
        eq(schema.notes.type, "daily"),
        isNull(schema.notes.deletedAt),
        or(
          eq(schema.notes.slug, key),
          and(gte(schema.notes.createdAt, start), lte(schema.notes.createdAt, end)),
        ),
      ),
    )
    .orderBy(desc(schema.notes.createdAt))
    .limit(1);

  if (!rows[0]) {
    // If today is requested, let's create it
    if (label === "Today") {
      await botCreateNote({
        userId,
        title: `Daily — ${key}`,
        type: "daily",
        contentMd: `# Daily Log — ${key}\n\n*Created from Telegram*\n\n## Priorities & Reflection\n- [ ] `,
      });
      return {
        ok: true,
        message: `📝 *Today's Daily Note Initialized*\n\n**Date**: ${key}\n\nNo previous content was found, so today's daily log has been created.`,
      };
    }

    return {
      ok: false,
      message: `📅 No daily note found for *${label}* (${key}).`,
    };
  }

  const note = rows[0];
  const tasks = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.userId, userId), eq(schema.tasks.noteId, note.id)));

  const lines = [
    `📅 *Daily Note: ${note.title}* (${label})`,
    `_Slug: ${note.slug}_`,
    "",
    note.contentMd ? note.contentMd.slice(0, 2000) : "_(Empty note)_",
  ];

  if (tasks.length > 0) {
    lines.push("\n📋 *Logged Tasks:*");
    for (const t of tasks) {
      const mark = t.status === "done" ? "✅" : "◻️";
      lines.push(`  ${mark} ${t.title}`);
    }
  }

  return { ok: true, message: lines.join("\n") };
}

/**
 * Summarizes workspace overview / tasks for Telegram.
 */
export async function botGetOverview(userId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [allTasks, projects] = await Promise.all([
    db
      .select({
        id: schema.tasks.id,
        title: schema.tasks.title,
        status: schema.tasks.status,
        dueDate: schema.tasks.dueDate,
        priority: schema.tasks.priority,
      })
      .from(schema.tasks)
      .where(and(eq(schema.tasks.userId, userId))),
    db
      .select({
        id: schema.notes.id,
        title: schema.notes.title,
        status: schema.notes.status,
        dueDate: schema.notes.dueDate,
      })
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.userId, userId),
          eq(schema.notes.type, "project"),
          isNull(schema.notes.deletedAt),
          eq(schema.notes.archived, false),
        ),
      )
      .limit(10),
  ]);

  const overdue = allTasks.filter(
    (t) => t.dueDate && t.dueDate < todayStart && t.status !== "done" && t.status !== "canceled",
  );
  const todayTasks = allTasks.filter(
    (t) =>
      t.dueDate &&
      t.dueDate >= todayStart &&
      t.dueDate < todayEnd &&
      t.status !== "done" &&
      t.status !== "canceled",
  );

  const lines = [
    `📊 *Inkest Workspace Overview*`,
    `• Total Projects: ${projects.length}`,
    `• Tasks Due Today: ${todayTasks.length}`,
    `• Overdue Tasks: ${overdue.length}`,
  ];

  if (todayTasks.length > 0) {
    lines.push("\n⏰ *Today's Focus Tasks:*");
    for (const t of todayTasks.slice(0, 5)) {
      lines.push(`  ◻️ ${t.title} [${t.priority}]`);
    }
  }

  if (overdue.length > 0) {
    lines.push("\n⚠️ *Overdue Items:*");
    for (const t of overdue.slice(0, 5)) {
      lines.push(`  🚨 ${t.title} (Due: ${t.dueDate?.toLocaleDateString()})`);
    }
  }

  if (projects.length > 0) {
    lines.push("\n📁 *Active Projects:*");
    for (const p of projects.slice(0, 5)) {
      const due = p.dueDate ? ` — Due ${p.dueDate.toLocaleDateString()}` : "";
      lines.push(`  • *${p.title}* (${p.status})${due}`);
    }
  }

  return { ok: true, message: lines.join("\n") };
}

/**
 * AI-driven workspace agent loop to process natural language Telegram messages.
 */
async function processWithAiAgent(userId: string, userText: string): Promise<string | null> {
  const provider = await getAiProvider(userId);
  if (!provider) return null;

  const systemPrompt = `You are the Inkest Telegram Workspace Assistant.
You can read, search, create, update notes, projects, tasks, and daily logs in the user's workspace.
Today's date is: ${formatDateKey(new Date())}.

When responding to the user's Telegram request:
1. Determine the necessary workspace operations (create note, edit note, read daily note, get project deadlines, list tasks).
2. You must output a JSON action plan if you want to execute tools, or return final formatted Telegram markdown text.

Return a clean JSON object:
{
  "action": "create_note" | "modify_project_note" | "get_deadlines" | "get_daily_note" | "get_overview" | "chat",
  "noteTitle": string (if applicable),
  "projectName": string (if applicable),
  "content": string (if applicable),
  "dateExpr": string (if applicable, e.g. "two days ago", "yesterday", "today"),
  "taskTitle": string (if creating task),
  "replyText": string (friendly message to the user)
}`;

  try {
    const raw = await provider.complete(
      `User Telegram Message: "${userText}"\nIdentify the intended workspace action and parameters.`,
      systemPrompt,
    );

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.action === "create_note" && parsed.noteTitle) {
      const created = await botCreateNote({
        userId,
        title: parsed.noteTitle,
        contentMd: parsed.content || `# ${parsed.noteTitle}\n\n${userText}\n`,
      });
      return `✅ *Note Created!*\n\n**Title**: ${created.title}\n**Slug**: \`${created.slug}\`\n\n${parsed.replyText || "Your note has been added to your workspace."}`;
    }

    if (parsed.action === "modify_project_note" && (parsed.projectName || parsed.noteTitle)) {
      const project = parsed.projectName ? await botFindProject(userId, parsed.projectName) : null;
      const note = await botFindNote(userId, parsed.noteTitle || "Todo list", project?.id);

      if (note) {
        await botAppendToNote({
          userId,
          noteId: note.id,
          appendContent: parsed.content || userText,
          createTaskItem: parsed.taskTitle ? { title: parsed.taskTitle } : undefined,
        });
        return `✏️ *Note Updated!*\n\n**Project**: ${project?.title || "Workspace"}\n**Note**: ${note.title}\n\nAdded: "${parsed.content || userText}"`;
      }
    }

    if (parsed.action === "get_deadlines" && parsed.projectName) {
      const result = await botGetProjectDeadlines(userId, parsed.projectName);
      return result.message;
    }

    if (parsed.action === "get_daily_note" && parsed.dateExpr) {
      const result = await botGetDailyNote(userId, parsed.dateExpr);
      return result.message;
    }

    if (parsed.action === "get_overview") {
      const result = await botGetOverview(userId);
      return result.message;
    }

    if (parsed.replyText) {
      return parsed.replyText;
    }
  } catch (err) {
    console.warn("[bot-assistant] AI processing error:", err);
  }

  return null;
}

/**
 * Deterministic pattern matcher fallback when AI is unavailable or unconfigured.
 */
export async function executeDeterministicBotCommand(userId: string, text: string): Promise<string> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // 1. Help & Start
  if (lower === "/help" || lower === "/start" || lower === "help" || lower === "راهنما") {
    return [
      `🤖 *Inkest Telegram Workspace Assistant*`,
      ``,
      `You can control your workspace directly through this bot:`,
      ``,
      `📝 *Natural Language Commands:*`,
      `• _"Write a new note about 'daily focusing training'"_`,
      `• _"Modify 'Inkest' project 'Todo list' note and add new paragraph about new task 'Managing users on cloud' to it"_`,
      `• _"Tell me about deadlines of the 'Inkest' project"_`,
      `• _"Give me the content of the daily note of two days ago"_`,
      `• _"Show my tasks for today"_`,
      ``,
      `⚡ *Quick Shortcuts:*`,
      `• \`/today\` — Today's daily log & tasks`,
      `• \`/tasks\` — Pending & overdue tasks`,
      `• \`/projects\` — Active projects & deadlines`,
      `• \`/overview\` — Workspace summary`,
      `• \`/new <title>\` — Create a quick note`,
    ].join("\n");
  }

  // 2. Shortcuts
  if (lower === "/today" || lower === "/daily") {
    const res = await botGetDailyNote(userId, "today");
    return res.message;
  }

  if (lower === "/overview" || lower === "/status") {
    const res = await botGetOverview(userId);
    return res.message;
  }

  if (lower === "/tasks") {
    const overview = await botGetOverview(userId);
    return overview.message;
  }

  if (lower === "/projects") {
    const projects = await db
      .select()
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.userId, userId),
          eq(schema.notes.type, "project"),
          isNull(schema.notes.deletedAt),
          eq(schema.notes.archived, false),
        ),
      )
      .limit(15);

    if (projects.length === 0) return "📁 No active projects found in workspace.";
    const lines = ["📁 *Your Projects:*"];
    for (const p of projects) {
      const due = p.dueDate ? ` — Due: ${p.dueDate.toLocaleDateString()}` : "";
      lines.push(`• *${p.title}* [${p.status}]${due}`);
    }
    return lines.join("\n");
  }

  if (lower.startsWith("/new ")) {
    const title = trimmed.slice(5).trim();
    const created = await botCreateNote({ userId, title });
    return `✅ *Note Created!*\n\n**Title**: ${created.title}\n**Slug**: \`${created.slug}\``;
  }

  // 3. Match Pattern: "Write a new note about '...'" / "Create note '...'"
  const writeNoteMatch = trimmed.match(
    /(?:write|create|add|make|start)(?:\s+a)?(?:\s+new)?\s+note\s+(?:about|titled|named|called)?\s*['"“]([^'"”]+)['"”]/i,
  ) || trimmed.match(/(?:یادداشت|نوشتن یادداشت|ایجاد یادداشت)\s+(?:جدید|درباره)?\s*['"«]([^'"»]+)['"»]/i);

  if (writeNoteMatch) {
    const title = writeNoteMatch[1].trim();
    const created = await botCreateNote({
      userId,
      title,
      contentMd: `# ${title}\n\n*Created from Telegram command: "${trimmed}"*\n`,
    });
    return `✅ *Note Created!*\n\n**Title**: ${created.title}\n**Link**: \`/notes/${created.id}\`\n\nYour new note is ready in Inkest.`;
  }

  // 4. Match Pattern: "Modify 'Inkest' project 'Todo list' note and add new paragraph about new task 'Managing users on cloud' to it"
  const modifyProjectNoteMatch = trimmed.match(
    /modify\s+['"“]([^'"”]+)['"”]\s+project\s+['"“]([^'"”]+)['"”]\s+note\s+(?:and\s+)?add\s+(.+)/i,
  ) || trimmed.match(
    /(?:in|on)\s+['"“]([^'"”]+)['"”]\s+project(?:,\s*|\s+)add\s+(.+?)\s+to\s+['"“]([^'"”]+)['"”]\s+note/i,
  );

  if (modifyProjectNoteMatch) {
    const projectName = modifyProjectNoteMatch[1].trim();
    let noteName = modifyProjectNoteMatch[2].trim();
    let rawAddition = modifyProjectNoteMatch[3]?.trim() || "";

    if (!rawAddition && modifyProjectNoteMatch[2] && modifyProjectNoteMatch[3]) {
      rawAddition = modifyProjectNoteMatch[2].trim();
      noteName = modifyProjectNoteMatch[3].trim();
    }

    let addition = rawAddition.replace(/\s+to\s+it$/i, "").trim();
    const quoteInside = addition.match(/['"“]([^'"”]+)['"”]/);
    if (quoteInside) {
      addition = quoteInside[1].trim();
    } else {
      addition = addition
        .replace(/^(?:new\s+)?(?:paragraph|task|entry|text|section)\s+(?:about\s+|for\s+)?(?:new\s+task\s+)?/i, "")
        .trim();
    }

    const project = await botFindProject(userId, projectName);
    let note = await botFindNote(userId, noteName, project?.id);

    if (!note && project) {
      note = (await botCreateNote({
        userId,
        title: noteName,
        parentId: project.id,
      })) as unknown as typeof note;
    }

    if (note) {
      await botAppendToNote({
        userId,
        noteId: note.id,
        appendContent: `### Update\n${addition}\n`,
        createTaskItem: { title: addition },
      });

      return [
        `✏️ *Updated Note in Project "${project?.title || projectName}"*`,
        `**Note**: ${note.title}`,
        `**Added**: ${addition}`,
        `**Task Created**: ✅ Added task "${addition}" attached to note.`,
      ].join("\n");
    }
  }

  // 5. Match Pattern: "Tell me about deadlines of the 'Inkest' project" / "deadlines of project X"
  const deadlineMatch = trimmed.match(
    /(?:tell\s+me\s+about\s+)?deadlines?\s+(?:of|for)(?:\s+the)?\s+['"“]?([^'"”\n?]+)['"”]?\s*(?:project)?/i,
  ) || trimmed.match(/deadlines?\s+project\s+['"“]?([^'"”\n?]+)['"”]?/i) || trimmed.match(/(?:مهلت|ددلاین|موعد)\s+(?:پروژه)?\s*['"«]?([^'"»\n?]+)['"»]?/i);

  if (deadlineMatch) {
    const projectName = deadlineMatch[1].trim().replace(/project$/i, "").trim();
    const result = await botGetProjectDeadlines(userId, projectName);
    return result.message;
  }

  // 6. Match Pattern: "Give me the content of the daily note of two days ago" / "daily note of X"
  const dailyNoteMatch = trimmed.match(
    /(?:give\s+me\s+(?:the\s+)?content\s+of\s+(?:the\s+)?)?daily\s+note\s+(?:of|for|from)?\s+(.+)/i,
  ) || trimmed.match(/(?:محتوای\s+)?یادداشت\s+روزانه\s+(.+)/i);

  if (dailyNoteMatch) {
    const dateExpr = dailyNoteMatch[1].trim();
    const result = await botGetDailyNote(userId, dateExpr);
    return result.message;
  }

  // 7. General search fallback
  const notes = await db
    .select({ id: schema.notes.id, title: schema.notes.title, type: schema.notes.type })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, userId),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    )
    .limit(50);

  const matched = notes.filter((n) => n.title.toLowerCase().includes(lower));
  if (matched.length > 0) {
    const lines = [`🔍 *Found matching notes for "${trimmed}":*`];
    for (const m of matched.slice(0, 5)) {
      lines.push(`• *${m.title}* (${m.type}) — \`/notes/${m.id}\``);
    }
    return lines.join("\n");
  }

  return `🤖 I processed your message: "${trimmed}".\n\nUse \`/help\` to see supported workspace actions (creating notes, updating project notes, checking deadlines, and reading daily logs).`;
}

/**
 * Primary entrypoint called when a Telegram message is received from a linked user.
 */
export async function handleTelegramWorkspaceMessage(params: {
  userId: string;
  chatId: string | number;
  text: string;
  botToken: string;
}) {
  const { userId, chatId, text, botToken } = params;
  const strChatId = String(chatId);

  // Try AI-powered execution first
  const aiResult = await processWithAiAgent(userId, text);
  if (aiResult) {
    await sendRawTelegramMessage(botToken, strChatId, aiResult);
    return;
  }

  // Deterministic fallback
  const fallbackResult = await executeDeterministicBotCommand(userId, text);
  await sendRawTelegramMessage(botToken, strChatId, fallbackResult);
}
