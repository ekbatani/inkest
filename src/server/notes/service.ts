import { eq, and, isNull, desc, like, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { createNoteSchema, updateNoteSchema } from "./validation";
import { slugify, randomId } from "@/lib/slug";
import type { Note } from "@/server/db/schema";

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  return { user, workspace };
}

export async function createNote(
  input: Partial<z.infer<typeof createNoteSchema>> = {},
): Promise<Note> {
  const { user, workspace } = await getContext();

  const parsed = createNoteSchema.parse({
    title: input.title ?? "Untitled",
    contentMd: input.contentMd ?? "",
    type: input.type ?? "note",
    direction: input.direction ?? "auto",
    status: input.status ?? "none",
    priority: input.priority ?? "none",
    dueDate: input.dueDate ?? null,
    pinned: input.pinned ?? false,
  });

  const id = randomId();
  const title = parsed.title;
  const slug = slugify(title) || `note-${id.slice(0, 8)}`;

  await db.insert(schema.notes).values({
    id,
    userId: user.id,
    workspaceId: workspace.id,
    title,
    slug,
    contentMd: parsed.contentMd,
    type: parsed.type,
    direction: parsed.direction,
    status: parsed.status,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
    pinned: parsed.pinned,
  });

  return getNoteById(id) as Promise<Note>;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const { user } = await getContext();

  const rows = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.id, id),
        eq(schema.notes.userId, user.id),
        isNull(schema.notes.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function listNotes(options: {
  archived?: boolean;
  search?: string;
  pinnedOnly?: boolean;
  limit?: number;
} = {}): Promise<Note[]> {
  const { user, workspace } = await getContext();
  const { archived = false, search, pinnedOnly, limit = 50 } = options;

  const conditions = [
    eq(schema.notes.userId, user.id),
    eq(schema.notes.workspaceId, workspace.id),
    isNull(schema.notes.deletedAt),
    eq(schema.notes.archived, archived),
  ];

  if (pinnedOnly) {
    conditions.push(eq(schema.notes.pinned, true));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        like(schema.notes.title, pattern),
        like(schema.notes.contentMd, pattern),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(schema.notes)
    .where(and(...conditions))
    .orderBy(desc(schema.notes.updatedAt))
    .limit(limit);

  return rows;
}

export async function updateNote(
  id: string,
  input: z.infer<typeof updateNoteSchema>,
): Promise<Note | null> {
  const { user } = await getContext();

  const parsed = updateNoteSchema.parse(input);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.title !== undefined) {
    updates.title = parsed.title;
    updates.slug = slugify(parsed.title) || `note-${id.slice(0, 8)}`;
  }
  if (parsed.contentMd !== undefined) updates.contentMd = parsed.contentMd;
  if (parsed.type !== undefined) updates.type = parsed.type;
  if (parsed.direction !== undefined) updates.direction = parsed.direction;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.dueDate !== undefined) updates.dueDate = parsed.dueDate;
  if (parsed.pinned !== undefined) updates.pinned = parsed.pinned;
  if (parsed.archived !== undefined) updates.archived = parsed.archived;

  await db
    .update(schema.notes)
    .set(updates)
    .where(
      and(
        eq(schema.notes.id, id),
        eq(schema.notes.userId, user.id),
        isNull(schema.notes.deletedAt),
      ),
    );

  return getNoteById(id);
}

export async function archiveNote(id: string): Promise<void> {
  const { user } = await getContext();
  await db
    .update(schema.notes)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(
        eq(schema.notes.id, id),
        eq(schema.notes.userId, user.id),
        isNull(schema.notes.deletedAt),
      ),
    );
}

export async function unarchiveNote(id: string): Promise<void> {
  const { user } = await getContext();
  await db
    .update(schema.notes)
    .set({ archived: false, updatedAt: new Date() })
    .where(
      and(
        eq(schema.notes.id, id),
        eq(schema.notes.userId, user.id),
      ),
    );
}

export async function deleteNoteSoft(id: string): Promise<void> {
  const { user } = await getContext();
  await db
    .update(schema.notes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.notes.id, id),
        eq(schema.notes.userId, user.id),
      ),
    );
}

export async function togglePinned(id: string): Promise<void> {
  const { user } = await getContext();
  const note = await getNoteById(id);
  if (!note) return;
  await db
    .update(schema.notes)
    .set({ pinned: !note.pinned, updatedAt: new Date() })
    .where(
      and(
        eq(schema.notes.id, id),
        eq(schema.notes.userId, user.id),
      ),
    );
}

export type NoteListItem = Note;
