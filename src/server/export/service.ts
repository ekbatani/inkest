import { eq, and, isNull } from "drizzle-orm";
import { ZipArchive } from "archiver";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import type { Note, Tag } from "@/server/db/schema";
import { readAttachmentData } from "@/server/attachments/storage";

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const workspace = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.userId, user.id))
    .limit(1);
  if (!workspace[0]) throw new Error("NO_WORKSPACE");
  return { user, workspace: workspace[0] };
}

type ExportNote = Pick<
  Note,
  | "id"
  | "title"
  | "slug"
  | "contentMd"
  | "type"
  | "status"
  | "priority"
  | "direction"
  | "dueDate"
  | "pinned"
  | "archived"
  | "createdAt"
  | "updatedAt"
  | "parentId"
>;

function safeFileName(name: string, fallback: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}

function yamlFrontmatter(note: ExportNote): string {
  const lines: string[] = ["---"];
  lines.push(`id: ${JSON.stringify(note.id)}`);
  lines.push(`title: ${JSON.stringify(note.title)}`);
  lines.push(`type: ${note.type}`);
  lines.push(`status: ${note.status}`);
  lines.push(`priority: ${note.priority}`);
  lines.push(`direction: ${note.direction}`);
  if (note.dueDate) lines.push(`due_date: ${note.dueDate.toISOString()}`);
  lines.push(`pinned: ${String(note.pinned)}`);
  lines.push(`archived: ${String(note.archived)}`);
  lines.push(`created_at: ${note.createdAt.toISOString()}`);
  lines.push(`updated_at: ${note.updatedAt.toISOString()}`);
  if (note.parentId) lines.push(`parent_id: ${JSON.stringify(note.parentId)}`);
  lines.push("---");
  return lines.join("\n");
}

async function getNotesForExport(userId: string, workspaceId: string) {
  return await db
    .select({
      id: schema.notes.id,
      title: schema.notes.title,
      slug: schema.notes.slug,
      contentMd: schema.notes.contentMd,
      type: schema.notes.type,
      status: schema.notes.status,
      priority: schema.notes.priority,
      direction: schema.notes.direction,
      dueDate: schema.notes.dueDate,
      pinned: schema.notes.pinned,
      archived: schema.notes.archived,
      createdAt: schema.notes.createdAt,
      updatedAt: schema.notes.updatedAt,
      parentId: schema.notes.parentId,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, userId),
        eq(schema.notes.workspaceId, workspaceId),
        isNull(schema.notes.deletedAt),
      ),
    );
}

async function getTagsForNotes(userId: string): Promise<Map<string, Tag[]>> {
  const rows = await db
    .select({
      noteId: schema.noteTags.noteId,
      tagId: schema.tags.id,
      tagName: schema.tags.name,
      tagColor: schema.tags.color,
      tagCreatedAt: schema.tags.createdAt,
      tagSlug: schema.tags.slug,
      tagUserId: schema.tags.userId,
      tagWorkspaceId: schema.tags.workspaceId,
    })
    .from(schema.noteTags)
    .innerJoin(
      schema.tags,
      and(eq(schema.tags.id, schema.noteTags.tagId), eq(schema.tags.userId, userId)),
    );
  const byNote = new Map<string, Tag[]>();
  for (const r of rows) {
    const tag: Tag = {
      id: r.tagId,
      name: r.tagName,
      color: r.tagColor,
      slug: r.tagSlug,
      userId: r.tagUserId,
      workspaceId: r.tagWorkspaceId,
      createdAt: r.tagCreatedAt,
    };
    let arr = byNote.get(r.noteId);
    if (!arr) {
      arr = [];
      byNote.set(r.noteId, arr);
    }
    arr.push(tag);
  }
  return byNote;
}

async function getAttachmentsForNotes(userId: string) {
  return await db
    .select({
      id: schema.attachments.id,
      noteId: schema.attachments.noteId,
      fileName: schema.attachments.fileName,
      originalName: schema.attachments.originalName,
      mimeType: schema.attachments.mimeType,
      storagePath: schema.attachments.storagePath,
    })
    .from(schema.attachments)
    .where(eq(schema.attachments.userId, userId));
}

export async function buildExportArchive(): Promise<{
  buffer: Buffer;
  fileName: string;
}> {
  const { user, workspace } = await getContext();

  const [notes, tagsByNote, attachments, allTags] = await Promise.all([
    getNotesForExport(user.id, workspace.id),
    getTagsForNotes(user.id),
    getAttachmentsForNotes(user.id),
    db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.userId, user.id)),
  ]);

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  archive.on("warning", (err: Error) => {
    // zlib warning — not fatal, just log to stderr.
    console.warn("[export] archiver warning:", err.message);
  });

  // Per-note markdown files
  const usedNames = new Set<string>();
  for (const n of notes) {
    const base = safeFileName(n.slug || n.title, n.id);
    let name = `${base}.md`;
    let i = 1;
    while (usedNames.has(name)) {
      name = `${base}-${i}.md`;
      i++;
    }
    usedNames.add(name);
    const tags = (tagsByNote.get(n.id) ?? []).map((t) => t.name);
    const fm = yamlFrontmatter(n);
    let body = `${fm}\n\n`;
    if (tags.length > 0) {
      body += `<p align=\"left\"><em>Tags:</em> ${tags.join(", ")}</p>\n\n`;
    }
    body += n.contentMd + "\n";
    await new Promise<void>((resolve, reject) => {
      archive.append(body, { name: `notes/${name}` });
      archive.once("entry", resolve);
      archive.once("error", reject);
      // archiver appends synchronously for buffers; resolve on next tick.
      setImmediate(resolve);
    });
  }

  // Attachments: include if file exists on disk
  const attachmentsKept: typeof attachments = [];
  for (const a of attachments) {
    try {
      const buf = await readAttachmentData(a.storagePath);
      if (!buf) continue;
      archive.append(buf, { name: `attachments/${a.id}-${a.fileName}` });
      attachmentsKept.push(a);
    } catch {
      // skip missing file
    }
  }

  // metadata.json
  const metadata = {
    exportedAt: new Date().toISOString(),
    app: "inkest",
    version: 1,
    user: { id: user.id, email: user.email, name: user.name ?? null },
    notes: notes.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      dueDate: n.dueDate ? n.dueDate.toISOString() : null,
      tagNames: (tagsByNote.get(n.id) ?? []).map((t) => t.name),
    })),
    tags: allTags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      slug: t.slug,
      createdAt: t.createdAt.toISOString(),
    })),
    attachments: attachmentsKept.map((a) => ({
      id: a.id,
      noteId: a.noteId,
      fileName: a.fileName,
      originalName: a.originalName,
      mimeType: a.mimeType,
      path: `attachments/${a.id}-${a.fileName}`,
    })),
  };
  archive.append(JSON.stringify(metadata, null, 2), {
    name: "metadata.json",
  });

  await archive.finalize();

  // flush all data events before reading the buffer; we collected above in
  // the "data" handler but finalize may flush one more tick later.
  await new Promise<void>((resolve) => setImmediate(resolve));
  const buffer = Buffer.concat(chunks);

  const stamp = new Date().toISOString().slice(0, 10);
  return { buffer, fileName: `inkest-export-${stamp}.zip` };
}

export async function buildSingleNoteMarkdown(
  noteId: string,
): Promise<{ content: string; fileName: string } | null> {
  const { user } = await getContext();

  const note = await db
    .select({
      id: schema.notes.id,
      title: schema.notes.title,
      slug: schema.notes.slug,
      contentMd: schema.notes.contentMd,
      type: schema.notes.type,
      status: schema.notes.status,
      priority: schema.notes.priority,
      direction: schema.notes.direction,
      dueDate: schema.notes.dueDate,
      pinned: schema.notes.pinned,
      archived: schema.notes.archived,
      createdAt: schema.notes.createdAt,
      updatedAt: schema.notes.updatedAt,
      parentId: schema.notes.parentId,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.id, noteId),
        eq(schema.notes.userId, user.id),
        isNull(schema.notes.deletedAt),
      ),
    )
    .limit(1);
  if (!note[0]) return null;

  const tagsRows = await db
    .select({ name: schema.tags.name })
    .from(schema.noteTags)
    .innerJoin(
      schema.tags,
      and(
        eq(schema.tags.id, schema.noteTags.tagId),
        eq(schema.tags.userId, user.id),
      ),
    )
    .where(eq(schema.noteTags.noteId, noteId));

  const n = note[0];
  let body = `${yamlFrontmatter(n)}\n\n`;
  if (tagsRows.length > 0) {
    body += `<p align=\"left\"><em>Tags:</em> ${tagsRows.map((t) => t.name).join(", ")}</p>\n\n`;
  }
  body += n.contentMd + "\n";

  return {
    content: body,
    fileName: `${safeFileName(n.slug || n.title, n.id)}.md`,
  };
}
