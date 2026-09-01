import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Database } from "bun:sqlite";

const root = await mkdtemp(resolve(tmpdir(), "inkest-backup-drill-"));
const sourceDb = resolve(root, "source", "local.db");
const sourceStorage = resolve(root, "source", "storage");
const backup = resolve(root, "backup");
const restoredDb = resolve(root, "restored", "local.db");
const restoredStorage = resolve(root, "restored", "storage");

async function removeDrillDirectory() {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rm(root, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
      return;
    } catch (error) {
      if (!error || error.code !== "EBUSY" || attempt === 4) throw error;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
    }
  }
}

async function run(command, args, env = {}) {
  const child = Bun.spawn([command, ...args], { cwd: process.cwd(), env: { ...process.env, ...env }, stdout: "inherit", stderr: "inherit" });
  if (await child.exited !== 0) throw new Error(`${args[0]} failed.`);
}

try {
  await mkdir(resolve(root, "source"), { recursive: true });
  const client = new Database(sourceDb);
  try {
    client.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT, name TEXT, created_at INTEGER, updated_at INTEGER)");
    client.run("CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, slug TEXT, created_at INTEGER, updated_at INTEGER)");
    client.run("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, user_id TEXT, workspace_id TEXT, title TEXT, slug TEXT, content_md TEXT, type TEXT, direction TEXT, status TEXT, priority TEXT, pinned INTEGER, archived INTEGER, created_at INTEGER, updated_at INTEGER)");
    client.run("CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, user_id TEXT, workspace_id TEXT, name TEXT, slug TEXT, created_at INTEGER)");
    client.run("CREATE TABLE IF NOT EXISTS note_tags (note_id TEXT, tag_id TEXT)");
    client.run("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, note_id TEXT, user_id TEXT, title TEXT, status TEXT, priority TEXT, source TEXT, created_at INTEGER, updated_at INTEGER)");
    client.run("CREATE TABLE IF NOT EXISTS note_versions (id TEXT PRIMARY KEY, note_id TEXT, user_id TEXT, title TEXT, content_md TEXT, created_at INTEGER)");
    client.run("CREATE TABLE IF NOT EXISTS attachments (id TEXT PRIMARY KEY, user_id TEXT, note_id TEXT, file_name TEXT, original_name TEXT, mime_type TEXT, size_bytes INTEGER, storage_path TEXT, created_at INTEGER)");

    const seed = [
      ["INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, unixepoch(), unixepoch())", ["drill-user", "drill@example.test", "Recovery Drill"]],
      ["INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, unixepoch(), unixepoch())", ["drill-workspace", "drill-user", "Recovery", "recovery"]],
      ["INSERT INTO notes (id, user_id, workspace_id, title, slug, content_md, type, direction, status, priority, pinned, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'note', 'ltr', 'none', 'none', 0, 0, unixepoch(), unixepoch())", ["drill-note", "drill-user", "drill-workspace", "Recovery note", "recovery-note", "# Recovery\n\nPortable Markdown."]],
      ["INSERT INTO tags (id, user_id, workspace_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())", ["drill-tag", "drill-user", "drill-workspace", "recovery", "recovery"]],
      ["INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)", ["drill-note", "drill-tag"]],
      ["INSERT INTO tasks (id, note_id, user_id, title, status, priority, source, created_at, updated_at) VALUES (?, ?, ?, ?, 'todo', 'high', 'manual', unixepoch(), unixepoch())", ["drill-task", "drill-note", "drill-user", "Verify restored data"]],
      ["INSERT INTO note_versions (id, note_id, user_id, title, content_md, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())", ["drill-version", "drill-note", "drill-user", "Recovery note", "# Recovery\n\nEarlier version."]],
      ["INSERT INTO attachments (id, user_id, note_id, file_name, original_name, mime_type, size_bytes, storage_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())", ["drill-attachment", "drill-user", "drill-note", "recovery.txt", "recovery.txt", "text/plain", 16, "attachments/drill-user/2026/07/recovery.txt"]],
    ];
    for (const [sql, args] of seed) {
      client.prepare(sql).run(...args);
    }
  } finally { client.close(); }

  const attachment = resolve(sourceStorage, "attachments", "drill-user", "2026", "07", "recovery.txt");
  await mkdir(resolve(attachment, ".."), { recursive: true });
  await writeFile(attachment, "recovery payload\n", "utf8");

  await run(process.execPath, ["scripts/backup-local.mjs", "--output", backup, "--database", `file:${sourceDb}`, "--storage", sourceStorage]);
  await run(process.execPath, ["scripts/restore-local.mjs", "--input", backup, "--database", restoredDb, "--storage", restoredStorage]);

  const restored = new Database(restoredDb);
  try {
    for (const table of ["notes", "tags", "note_tags", "tasks", "note_versions", "attachments"]) {
      const result = restored.prepare(`SELECT count(*) AS count FROM ${table}`).get();
      if (Number(result?.count ?? 0) !== 1) throw new Error(`Table ${table} did not restore expected row count.`);
    }
    const note = restored.prepare("SELECT content_md FROM notes WHERE id = 'drill-note'").get();
    if (note?.content_md !== "# Recovery\n\nPortable Markdown.") throw new Error("Restored note content mismatch.");
  } finally { restored.close(); }

  const restoredAttachment = resolve(restoredStorage, "attachments", "drill-user", "2026", "07", "recovery.txt");
  const attachmentContent = await readFile(restoredAttachment, "utf8");
  if (attachmentContent !== "recovery payload\n") throw new Error("Restored attachment content mismatch.");

  console.log("Backup and restore drill passed: SQLite data and storage payload restored cleanly.");
} finally {
  await removeDrillDirectory();
}
