import { inflateRawSync } from "node:zlib";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

const root = await mkdtemp(resolve(tmpdir(), "inkest-export-drill-"));
const database = resolve(root, "data", "local.db");
const storage = resolve(root, "storage");

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

function readEntries(buffer) {
  const entries = new Map();
  let cursor = 0;
  while (cursor + 46 <= buffer.length) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      cursor++;
      continue;
    }
    const compression = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Invalid local ZIP header: ${name}`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(start, start + compressedSize);
    entries.set(name, compression === 0 ? compressed : inflateRawSync(compressed));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function runMigration() {
  const child = Bun.spawn([process.execPath, "scripts/migrate.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${database}` },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (await child.exited !== 0) throw new Error("Migration failed.");
}

try {
  await mkdir(resolve(root, "data"), { recursive: true });
  await runMigration();
  const client = createClient({ url: `file:${database}` });
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const statements = [
      ["INSERT INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", ["export-user", "export@example.test", "Export Drill", timestamp, timestamp]],
      ["INSERT INTO workspaces (id, user_id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", ["export-workspace", "export-user", "Export", "export", timestamp, timestamp]],
      ["INSERT INTO notes (id, user_id, workspace_id, title, slug, content_md, type, direction, status, priority, pinned, archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'note', 'ltr', 'none', 'none', 0, 0, ?, ?)", ["export-note", "export-user", "export-workspace", "Portable note", "portable-note", "# Portable\n\nMarkdown survives.", timestamp, timestamp]],
      ["INSERT INTO tags (id, user_id, workspace_id, name, slug, created_at) VALUES (?, ?, ?, ?, ?, ?)", ["export-tag", "export-user", "export-workspace", "portable", "portable", timestamp]],
      ["INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)", ["export-note", "export-tag"]],
      ["INSERT INTO attachments (id, user_id, note_id, file_name, original_name, mime_type, size_bytes, storage_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", ["export-attachment", "export-user", "export-note", "portable.txt", "portable.txt", "text/plain", 18, "attachments/export-user/portable.txt", timestamp]],
    ];
    for (const [sql, args] of statements) await client.execute({ sql, args });
  } finally { client.close(); }

  const attachmentPath = resolve(storage, "attachments", "export-user", "portable.txt");
  await mkdir(resolve(attachmentPath, ".."), { recursive: true });
  await writeFile(attachmentPath, "portable attachment\n", "utf8");

  const archive = resolve(root, "portable-export.zip");
  const exportWorker = Bun.spawn([process.execPath, "scripts/export-portability-worker.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${database}`, LOCAL_STORAGE_ROOT: storage, EXPORT_DRILL_ARCHIVE: archive },
    stdout: "inherit",
    stderr: "inherit",
  });
  if (await exportWorker.exited !== 0) throw new Error("Export worker failed.");
  const buffer = await (await import("node:fs/promises")).readFile(archive);
  const entries = readEntries(buffer);
  const markdown = entries.get("notes/portable-note.md")?.toString("utf8") ?? "";
  const metadata = JSON.parse(entries.get("metadata.json")?.toString("utf8") ?? "{}");
  if (!markdown.includes("# Portable\n\nMarkdown survives.") || !markdown.includes("Tags:</em> portable")) throw new Error("Exported Markdown is incomplete.");
  if (metadata.notes?.length !== 1 || metadata.tags?.[0]?.name !== "portable" || metadata.attachments?.[0]?.path !== "attachments/export-attachment-portable.txt") throw new Error("Exported workspace metadata is incomplete.");
  if (entries.get("attachments/export-attachment-portable.txt")?.toString("utf8") !== "portable attachment\n") throw new Error("Exported attachment bytes differ from source.");
  console.log("Export portability drill passed: Markdown, metadata, tags, and attachment bytes are present.");
} finally {
  await removeDrillDirectory();
}
