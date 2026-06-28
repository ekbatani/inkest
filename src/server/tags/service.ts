import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { slugify, randomId } from "@/lib/slug";
import { createTagSchema, updateTagSchema } from "./validation";
import type { Tag } from "@/server/db/schema";

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  return { user, workspace };
}

export async function listTags(): Promise<Tag[]> {
  const { user, workspace } = await getContext();
  const rows = await db
    .select()
    .from(schema.tags)
    .where(
      and(
        eq(schema.tags.userId, user.id),
        eq(schema.tags.workspaceId, workspace.id),
      ),
    )
    .orderBy(schema.tags.name);
  return rows;
}

export async function listTagsForNote(noteId: string): Promise<Tag[]> {
  const { user } = await getContext();

  const tagIdsRows = await db
    .select({ tagId: schema.noteTags.tagId })
    .from(schema.noteTags)
    .innerJoin(
      schema.notes,
      and(eq(schema.notes.id, schema.noteTags.noteId)),
    )
    .where(
      and(
        eq(schema.noteTags.noteId, noteId),
        eq(schema.notes.userId, user.id),
      ),
    );

  const tagIds = tagIdsRows.map((r) => r.tagId);
  if (tagIds.length === 0) return [];

  const tagsRows = await db
    .select()
    .from(schema.tags)
    .where(
      and(
        eq(schema.tags.userId, user.id),
        inArray(schema.tags.id, tagIds),
      ),
    );
  return tagsRows;
}

export async function createTag(
  input: z.infer<typeof createTagSchema>,
): Promise<Tag> {
  const { user, workspace } = await getContext();
  const parsed = createTagSchema.parse(input);
  const name = parsed.name.trim();

  // Reuse existing tag with same name for this user/workspace to avoid dupes.
  const existing = await db
    .select()
    .from(schema.tags)
    .where(
      and(
        eq(schema.tags.userId, user.id),
        eq(schema.tags.workspaceId, workspace.id),
        eq(schema.tags.name, name),
      ),
    )
    .limit(1);
  if (existing[0]) return existing[0];

  const id = randomId("tag");
  const slug = slugify(name) || `tag-${id.slice(0, 8)}`;
  await db.insert(schema.tags).values({
    id,
    userId: user.id,
    workspaceId: workspace.id,
    name,
    slug,
    color: parsed.color ?? null,
  });

  const rows = await db
    .select()
    .from(schema.tags)
    .where(eq(schema.tags.id, id))
    .limit(1);
  if (!rows[0]) throw new Error("TAG_CREATE_FAILED");
  return rows[0];
}

export async function updateTag(
  id: string,
  input: z.infer<typeof updateTagSchema>,
): Promise<Tag | null> {
  const { user } = await getContext();
  const parsed = updateTagSchema.parse(input);

  const updates: Record<string, unknown> = {};
  if (parsed.name !== undefined) {
    updates.name = parsed.name.trim();
    updates.slug = slugify(parsed.name) || `tag-${id.slice(0, 8)}`;
  }
  if (parsed.color !== undefined) updates.color = parsed.color ?? null;

  if (Object.keys(updates).length === 0) {
    return (
      (await db.select().from(schema.tags).where(eq(schema.tags.id, id)).limit(1))[0] ?? null
    );
  }

  await db
    .update(schema.tags)
    .set(updates)
    .where(and(eq(schema.tags.id, id), eq(schema.tags.userId, user.id)));

  const rows = await db
    .select()
    .from(schema.tags)
    .where(eq(schema.tags.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function deleteTag(id: string): Promise<void> {
  const { user } = await getContext();
  await db
    .delete(schema.tags)
    .where(and(eq(schema.tags.id, id), eq(schema.tags.userId, user.id)));
}

/**
 * Replace the set of tags attached to a note. Called from note editor autosave.
 * Note id and user ownership are validated; tagIds may include ids the user
 * owns (others are silently ignored to avoid leaking data).
 */
export async function setNoteTags(noteId: string, tagIds: string[]): Promise<void> {
  const { user } = await getContext();

  // Validate ownership of the note.
  const noteRow = await db
    .select({ id: schema.notes.id })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.id, noteId),
        eq(schema.notes.userId, user.id),
      ),
    )
    .limit(1);
  if (!noteRow[0]) throw new Error("NOTE_NOT_FOUND");

  // Filter tagIds to ones the user actually owns.
  let ownedTagIds: string[] = [];
  if (tagIds.length > 0) {
    const owned = await db
      .select({ id: schema.tags.id })
      .from(schema.tags)
      .where(
        and(
          eq(schema.tags.userId, user.id),
          inArray(schema.tags.id, tagIds),
        ),
      );
    ownedTagIds = owned.map((r) => r.id);
  }

  await db.transaction(async (tx) => {
    await tx.delete(schema.noteTags).where(eq(schema.noteTags.noteId, noteId));
    if (ownedTagIds.length > 0) {
      await tx.insert(schema.noteTags).values(
        ownedTagIds.map((tagId) => ({ noteId, tagId })),
      );
    }
  });
}

/**
 * Apply a tag filter to a notes list. Returns the set of note ids matching
 * ALL provided tag ids (intersection). Used by listNotes when filtering by tags.
 */
export async function getNoteIdsForTags(
  tagIds: string[],
): Promise<Set<string>> {
  const { user } = await getContext();
  if (tagIds.length === 0) return new Set();

  const rows = await db
    .select({
      noteId: schema.noteTags.noteId,
      tagId: schema.noteTags.tagId,
    })
    .from(schema.noteTags)
    .innerJoin(schema.notes, eq(schema.notes.id, schema.noteTags.noteId))
    .where(
      and(
        eq(schema.notes.userId, user.id),
        inArray(schema.noteTags.tagId, tagIds),
      ),
    );

  const byNote = new Map<string, Set<string>>();
  for (const r of rows) {
    let s = byNote.get(r.noteId);
    if (!s) {
      s = new Set();
      byNote.set(r.noteId, s);
    }
    s.add(r.tagId);
  }

  const wanted = new Set(tagIds);
  const result = new Set<string>();
  for (const [noteId, tagsArr] of byNote) {
    let hasAll = true;
    for (const tid of wanted) {
      if (!tagsArr.has(tid)) {
        hasAll = false;
        break;
      }
    }
    if (hasAll) result.add(noteId);
  }
  return result;
}

export type TagWithCount = Tag & { noteCount: number };

export async function listTagsWithCounts(): Promise<TagWithCount[]> {
  const { user } = await getContext();
  const tags = await listTags();
  if (tags.length === 0) return [];

  const counts = await db
    .select({ tagId: schema.noteTags.tagId })
    .from(schema.noteTags)
    .innerJoin(
      schema.tags,
      eq(schema.tags.id, schema.noteTags.tagId),
    )
    .where(eq(schema.tags.userId, user.id));

  const byTag = new Map<string, number>();
  for (const r of counts) {
    byTag.set(r.tagId, (byTag.get(r.tagId) ?? 0) + 1);
  }

  return tags.map((t) => ({ ...t, noteCount: byTag.get(t.id) ?? 0 }));
}