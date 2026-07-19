import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

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
  await run(process.execPath, ["scripts/migrate.mjs"], { DATABASE_URL: `file:${sourceDb}` });

  const client = createClient({ url: `file:${sourceDb}` });
  try {
    const seed = [
      ["INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, unixepoch(), unixepoch())", ["drill-user", "drill@example.test", "Recovery Drill"]],
      ["INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, unixepoch(), unixepoch())", ["drill-workspace", "drill-user", "Recovery", "recovery",]],
      ["INSERT INTO notes (id, user_id, workspace_id, title, slug, content_md, type, direction, status, priority, pinned, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'note', 'ltr', 'none', 'none', 0, 0, unixepoch(), unixepoch())", ["drill-note", "drill-user", "drill-workspace", "Recovery note", "recovery-note", "# Recovery\n\nPortable Markdown."]],
      ["INSERT INTO tags (id, user_id, workspace_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())", ["drill-tag", "drill-user", "drill-workspace", "recovery", "recovery"]],
      ["INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)", ["drill-note", "drill-tag"]],
      ["INSERT INTO tasks (id, note_id, user_id, title, status, priority, source, created_at, updated_at) VALUES (?, ?, ?, ?, 'todo', 'high', 'manual', unixepoch(), unixepoch())", ["drill-task", "drill-note", "drill-user", "Verify restored data"]],
      ["INSERT INTO note_versions (id, note_id, user_id, title, content_md, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())", ["drill-version", "drill-note", "drill-user", "Recovery note", "# Recovery\n\nEarlier version."]],
      ["INSERT INTO attachments (id, user_id, note_id, file_name, original_name, mime_type, size_bytes, storage_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())", ["drill-attachment", "drill-user", "drill-note", "recovery.txt", "recovery.txt", "text/plain", 16, "attachments/drill-user/2026/07/recovery.txt"]],
    ];
    for (const [sql, args] of seed) await client.execute({ sql, args });
  } finally { client.close(); }

  const attachment = resolve(sourceStorage, "attachments", "drill-user", "2026", "07", "recovery.txt");
  await mkdir(resolve(attachment, ".."), { recursive: true });
  await writeFile(attachment, "recovery payload\n", "utf8");

  await run(process.execPath, ["scripts/backup-local.mjs", "--output", backup, "--database", `file:${sourceDb}`, "--storage", sourceStorage]);
  await run(process.execPath, ["scripts/restore-local.mjs", "--input", backup, "--database", restoredDb, "--storage", restoredStorage]);

  const restored = createClient({ url: `file:${restoredDb}` });
  try {
    for (const table of ["notes", "tags", "note_tags", "tasks", "note_versions", "attachments"]) {
      const result = await restored.execute(`SELECT count(*) AS count FROM ${table}`);
      if (Number(result.rows[0].count) !== 1) throw new Error(`Restore comparison failed for ${table}.`);
    }
    const note = await restored.execute({ sql: "SELECT content_md FROM notes WHERE id = ?", args: ["drill-note"] });
    if (note.rows[0].content_md !== "# Recovery\n\nPortable Markdown.") throw new Error("Restored Markdown differs from source.");
  } finally { restored.close(); }

  const restoredAttachment = resolve(restoredStorage, "attachments", "drill-user", "2026", "07", "recovery.txt");
  if (createHash("sha256").update(await readFile(attachment)).digest("hex") !== createHash("sha256").update(await readFile(restoredAttachment)).digest("hex")) {
    throw new Error("Restored attachment bytes differ from source.");
  }
  console.log("Backup/restore drill passed: notes, tags, tasks, versions, and attachments match.");
} finally {
  await removeDrillDirectory();
}
