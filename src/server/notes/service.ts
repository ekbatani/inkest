import { eq, and, isNull, desc, ne, asc, sql, or, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { createNoteSchema, updateNoteSchema } from "./validation";
import { slugify, randomId } from "@/lib/slug";
import { getNoteIdsForTags } from "@/server/tags/service";
import { snapshotNoteIfChanged } from "@/server/notes/versions-service";
import type { Note } from "@/server/db/schema";

// Light English/Persian search normalisation: lowercase + unify Persian/Arabic
// forms of ي/ك and Arabic diacritics so user input matches stored text.
function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064A\u0649]/g, "\u06CC") // Arabic ya → Persian ya
    .replace(/\u0643/g, "\u06A9") // Arabic kaf → Persian kaf
    .replace(/[\u064B-\u0652]/g, ""); // strip harakat/diacritics
}

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  return { user, workspace };
}

function siblingConditions(
  parentId: string | null,
  userId: string,
  workspaceId: string,
) {
  const conditions = [
    eq(schema.notes.userId, userId),
    eq(schema.notes.workspaceId, workspaceId),
    isNull(schema.notes.deletedAt),
    eq(schema.notes.archived, false),
  ];

  if (parentId === null) {
    conditions.push(isNull(schema.notes.parentId));
  } else {
    conditions.push(eq(schema.notes.parentId, parentId));
  }

  return conditions;
}

async function getNextSortOrder(
  parentId: string | null,
  userId: string,
  workspaceId: string,
) {
  const rows = await db
    .select({
      maxSortOrder: sql<number>`coalesce(max(${schema.notes.sortOrder}), 0)`,
    })
    .from(schema.notes)
    .where(and(...siblingConditions(parentId, userId, workspaceId)))
    .limit(1);

  return (rows[0]?.maxSortOrder ?? 0) + 1;
}

function siblingSortColumns() {
  return [
    asc(schema.notes.sortOrder),
    asc(schema.notes.createdAt),
    asc(schema.notes.id),
  ] as const;
}

async function fetchSiblingIds(
  parentId: string | null,
  userId: string,
  workspaceId: string,
) {
  const rows = await db
    .select({ id: schema.notes.id })
    .from(schema.notes)
    .where(and(...siblingConditions(parentId, userId, workspaceId)))
    .orderBy(...siblingSortColumns());

  return rows.map((row) => row.id);
}

async function resequenceSiblingGroup(
  parentId: string | null,
  noteIds: string[],
  userId: string,
  workspaceId: string,
  tx: Pick<typeof db, "update"> = db,
) {
  await Promise.all(
    noteIds.map((noteId, index) =>
      tx
        .update(schema.notes)
        .set({ sortOrder: index + 1 })
        .where(
          and(
            eq(schema.notes.id, noteId),
            eq(schema.notes.userId, userId),
            eq(schema.notes.workspaceId, workspaceId),
            isNull(schema.notes.deletedAt),
            eq(schema.notes.archived, false),
            parentId === null
              ? isNull(schema.notes.parentId)
              : eq(schema.notes.parentId, parentId),
          ),
        ),
    ),
  );
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
  const parentId = input.parentId ?? null;
  const sortOrder = await getNextSortOrder(parentId, user.id, workspace.id);

  await db.insert(schema.notes).values({
    id,
    userId: user.id,
    workspaceId: workspace.id,
    parentId,
    title,
    slug,
    contentMd: parsed.contentMd,
    type: parsed.type,
    direction: parsed.direction,
    status: parsed.status,
    priority: parsed.priority,
    dueDate: parsed.dueDate ?? null,
    sortOrder,
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
  tagIds?: string[];
  type?: "note" | "project" | "daily";
  parentId?: string | null;
  /** Set true to fetch only notes that have no parent (top-level). */
  topLevelOnly?: boolean;
  limit?: number;
} = {}): Promise<Note[]> {
  const { user, workspace } = await getContext();
  const {
    archived = false,
    search,
    pinnedOnly,
    tagIds,
    type,
    parentId,
    topLevelOnly,
    limit = 100,
  } = options;

  const conditions = [
    eq(schema.notes.userId, user.id),
    eq(schema.notes.workspaceId, workspace.id),
    isNull(schema.notes.deletedAt),
    eq(schema.notes.archived, archived),
  ];

  if (pinnedOnly) {
    conditions.push(eq(schema.notes.pinned, true));
  }

  if (type) {
    conditions.push(eq(schema.notes.type, type));
  }

  if (topLevelOnly) {
    conditions.push(isNull(schema.notes.parentId));
  } else if (parentId !== undefined) {
    if (parentId === null) {
      conditions.push(isNull(schema.notes.parentId));
    } else {
      conditions.push(eq(schema.notes.parentId, parentId));
    }
  }

  let rows = await db
    .select()
    .from(schema.notes)
    .where(and(...conditions))
    .orderBy(
      parentId !== undefined || topLevelOnly
        ? asc(schema.notes.sortOrder)
        : desc(schema.notes.updatedAt),
      asc(schema.notes.createdAt),
      asc(schema.notes.id),
    )
    .limit(limit);

  if (search) {
    const needle = normalizeSearch(search);
    rows = rows.filter((n) => {
      const title = normalizeSearch(n.title);
      const content = normalizeSearch(n.contentMd);
      return title.includes(needle) || content.includes(needle);
    });
  }

  if (tagIds && tagIds.length > 0) {
    const allowed = await getNoteIdsForTags(tagIds);
    rows = rows.filter((n) => allowed.has(n.id));
  }

  return rows;
}

export async function updateNote(
  id: string,
  input: z.infer<typeof updateNoteSchema>,
): Promise<Note | null> {
  const { user } = await getContext();

  const parsed = updateNoteSchema.parse(input);
  const current = await db
    .select({
      title: schema.notes.title,
      contentMd: schema.notes.contentMd,
      type: schema.notes.type,
    })
    .from(schema.notes)
    .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, user.id)))
    .limit(1);

  // Snapshot the current note state before overwriting, when content or title
  // are about to change. Failure is swallowed — version history is best-effort
  // and must not block editing.
  if (
    (parsed.contentMd !== undefined || parsed.title !== undefined) &&
    Object.keys(parsed).length > 0
  ) {
    try {
      if (current[0]) {
        await snapshotNoteIfChanged(id, current[0].contentMd, current[0].title);
      }
    } catch {
      // best-effort snapshot
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.title !== undefined) {
    updates.title = parsed.title;
    const nextType = parsed.type ?? current[0]?.type;
    if (nextType !== "daily") {
      updates.slug = slugify(parsed.title) || `note-${id.slice(0, 8)}`;
    }
  }
  if (parsed.contentMd !== undefined) updates.contentMd = parsed.contentMd;
  if (parsed.type !== undefined) updates.type = parsed.type;
  if (parsed.direction !== undefined) updates.direction = parsed.direction;
  if (parsed.status !== undefined) updates.status = parsed.status;
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.dueDate !== undefined) updates.dueDate = parsed.dueDate;
  if (parsed.pinned !== undefined) updates.pinned = parsed.pinned;
  if (parsed.archived !== undefined) updates.archived = parsed.archived;
  if (parsed.parentId !== undefined) updates.parentId = parsed.parentId;

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

// ── Backlinks ─────────────────────────────────────────────────────────────

/**
 * Find notes whose content references this note via `[[slug]]` or
 * `[[title]]`. Matches are case-insensitive and stripped of section anchors.
 */
export async function getBacklinks(noteId: string): Promise<Note[]> {
  const target = await getNoteById(noteId);
  if (!target) return [];

  const candidates = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, target.userId),
        eq(schema.notes.workspaceId, target.workspaceId),
        isNull(schema.notes.deletedAt),
        ne(schema.notes.id, noteId),
      ),
    )
    .limit(500);

  const slugNeedle = normalizeSearch(target.slug);
  const titleNeedle = normalizeSearch(target.title);

  return candidates.filter((n) => {
    if (!n.contentMd.includes("[[")) return false;
    // Pull every `[[...]]` token, normalise, and compare against our note.
    const tokens = extractWikiTokens(n.contentMd);
    for (const t of tokens) {
      const name = t.split("#")[0]?.trim() ?? "";
      if (!name) continue;
      const norm = normalizeSearch(name);
      if (norm === slugNeedle || norm === titleNeedle) {
        return true;
      }
    }
    return false;
  });
}

const WIKI_TOKEN_RE = /\[\[([^\]\n]+?)\]\]/g;
function extractWikiTokens(content: string): string[] {
  // Skip fenced code blocks where wiki syntax should stay literal.
  const lines = content.split("\n");
  let inFence = false;
  const tokens: string[] = [];
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    let match: RegExpExecArray | null;
    WIKI_TOKEN_RE.lastIndex = 0;
    while ((match = WIKI_TOKEN_RE.exec(line)) !== null) {
      tokens.push(match[1]);
    }
  }
  return tokens;
}

// ── Daily notes ────────────────────────────────────────────────────────────

/**
 * Find or create the user's daily note for a given date. The slug is the
 * ISO date (YYYY-MM-DD, in the user's local timezone), type is "daily".
 */
export async function getOrCreateDailyNote(date: Date): Promise<Note> {
  const { user, workspace } = await getContext();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const slug = `${yyyy}-${mm}-${dd}`;

  const existing = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        eq(schema.notes.type, "daily"),
        isNull(schema.notes.deletedAt),
        or(
          eq(schema.notes.slug, slug),
          and(
            gte(schema.notes.createdAt, start),
            lt(schema.notes.createdAt, end),
          ),
        ),
      ),
    )
    .orderBy(asc(schema.notes.createdAt))
    .limit(1);

  if (existing[0]) return existing[0];

  const id = randomId();
  const sortOrder = await getNextSortOrder(null, user.id, workspace.id);
  const title = `Daily — ${yyyy}-${mm}-${dd}`;
  await db.insert(schema.notes).values({
    id,
    userId: user.id,
    workspaceId: workspace.id,
    title,
    slug,
    contentMd: "",
    type: "daily",
    sortOrder,
  });

  const fetched = await getNoteById(id);
  return fetched!;
}

export type NoteTreeNode = Pick<
  Note,
  "id" | "title" | "slug" | "type" | "updatedAt" | "createdAt"
> & {
  children: Pick<Note, "id" | "title" | "slug" | "type" | "updatedAt" | "createdAt">[];
};

/**
 * Build a 2-level tree of notes for the sidebar: top-level notes with their
 * child notes (parentId = topLevel.id). Stays shallow to keep navigation
 * predictable. Sorted by tree order with creation time as the fallback.
 */
export async function listNotesTree(): Promise<NoteTreeNode[]> {
  const topLevel = await listNotes({
    topLevelOnly: true,
    archived: false,
    limit: 60,
  });

  const childKeys = (n: Note) =>
    ({
      id: n.id,
      title: n.title,
      slug: n.slug,
      type: n.type,
      updatedAt: n.updatedAt,
      createdAt: n.createdAt,
    }) as const;

  // For each top-level note, fetch its children in parallel.
  const withChildren = await Promise.all(
    topLevel.map(async (parent) => {
      const children = await db
        .select({
          id: schema.notes.id,
          title: schema.notes.title,
          slug: schema.notes.slug,
          type: schema.notes.type,
          updatedAt: schema.notes.updatedAt,
          createdAt: schema.notes.createdAt,
        })
        .from(schema.notes)
        .where(
          and(
            eq(schema.notes.userId, parent.userId),
            eq(schema.notes.parentId, parent.id),
            isNull(schema.notes.deletedAt),
            eq(schema.notes.archived, false),
          ),
        )
        .orderBy(...siblingSortColumns())
        .limit(40);
      return {
        ...childKeys(parent),
        children,
      } as NoteTreeNode;
    }),
  );

  return withChildren;
}

/**
 * Returns notes that can be a parent for the given note (top-level notes
 * excluding the note itself and its descendants to avoid cycles). For the MVP
 * we keep it shallow: a note can only be parented to other top-level notes
 * (no nested nesting) — keeps the tree two levels deep and predictable.
 */
export async function listParentCandidates(noteId: string): Promise<Note[]> {
  const { user, workspace } = await getContext();
  const rows = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
        isNull(schema.notes.parentId),
        ne(schema.notes.id, noteId),
      ),
    )
    .orderBy(...siblingSortColumns())
    .limit(200);
  return rows;
}

export function isTaskNote(note: Pick<Note, "status">): boolean {
  return note.status !== "none";
}

export async function listProjectTaskNotes(projectId: string): Promise<Note[]> {
  const note = await getNoteById(projectId);
  if (!note) return [];

  const childNotes = await listNotes({ parentId: projectId, limit: 200 });
  return childNotes
    .filter(
      (childNote) =>
        childNote.status === "todo" ||
        childNote.status === "doing" ||
        childNote.status === "paused" ||
        childNote.status === "done",
    )
    .sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
}

export async function moveNoteInTree(
  noteId: string,
  targetParentId: string | null,
  beforeId: string | null = null,
): Promise<Note | null> {
  const { user, workspace } = await getContext();

  const noteRows = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.id, noteId),
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    )
    .limit(1);

  const note = noteRows[0];
  if (!note) return null;

  if (targetParentId === noteId) {
    throw new Error("INVALID_PARENT");
  }

  if (targetParentId !== null) {
    const parentRows = await db
      .select({
        id: schema.notes.id,
        parentId: schema.notes.parentId,
      })
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.id, targetParentId),
          eq(schema.notes.userId, user.id),
          eq(schema.notes.workspaceId, workspace.id),
          isNull(schema.notes.deletedAt),
          eq(schema.notes.archived, false),
        ),
      )
      .limit(1);

    const parent = parentRows[0];
    if (!parent || parent.parentId !== null) {
      throw new Error("INVALID_PARENT");
    }
  }

  const sourceParentId = note.parentId ?? null;
  const destinationParentId = targetParentId;

  const sourceIds = await fetchSiblingIds(
    sourceParentId,
    user.id,
    workspace.id,
  );
  const movingIndex = sourceIds.indexOf(noteId);
  if (movingIndex === -1) {
    throw new Error("NOTE_ORDER_MISSING");
  }

  const sameGroup = sourceParentId === destinationParentId;
  const finalSourceIds = sameGroup
    ? []
    : sourceIds.filter((id) => id !== noteId);
  const destinationIds = sameGroup
    ? sourceIds.slice()
    : await fetchSiblingIds(destinationParentId, user.id, workspace.id);
  const destIdsWithoutActive = destinationIds.filter((id) => id !== noteId);

  const insertAt = beforeId ? destIdsWithoutActive.indexOf(beforeId) : -1;
  const nextDestinationIds = destIdsWithoutActive.slice();
  if (insertAt >= 0) {
    nextDestinationIds.splice(insertAt, 0, noteId);
  } else {
    nextDestinationIds.push(noteId);
  }

  if (sameGroup) {
    await resequenceSiblingGroup(
      sourceParentId,
      nextDestinationIds,
      user.id,
      workspace.id,
    );
  } else {
    await db.transaction(async (tx) => {
      await resequenceSiblingGroup(
        sourceParentId,
        finalSourceIds,
        user.id,
        workspace.id,
        tx,
      );
      await resequenceSiblingGroup(
        destinationParentId,
        nextDestinationIds,
        user.id,
        workspace.id,
        tx,
      );
      await tx
        .update(schema.notes)
        .set({
          parentId: destinationParentId,
          sortOrder: nextDestinationIds.indexOf(noteId) + 1,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.notes.id, noteId),
            eq(schema.notes.userId, user.id),
            eq(schema.notes.workspaceId, workspace.id),
            isNull(schema.notes.deletedAt),
            eq(schema.notes.archived, false),
          ),
        );
    });
  }

  return getNoteById(noteId);
}

export type UpcomingTaskNote = Note & { projectTitle: string };

export async function listDueTaskNotes(limit = 10): Promise<{
  overdue: UpcomingTaskNote[];
  upcoming: UpcomingTaskNote[];
}> {
  const { user, workspace } = await getContext();

  const rows = await db
    .select()
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    )
    .orderBy(desc(schema.notes.updatedAt))
    .limit(500);

  const taskNotes = rows.filter(
    (
      note,
    ): note is Note & {
      dueDate: Date;
      parentId: string;
    } =>
      note.parentId !== null &&
      isTaskNote(note) &&
      note.status !== "done" &&
      note.status !== "archived" &&
      note.dueDate !== null,
  );

  if (taskNotes.length === 0) {
    return { overdue: [], upcoming: [] };
  }

  const parentIds = [...new Set(taskNotes.map((note) => note.parentId).filter(Boolean))];
  const parents = await db
    .select({ id: schema.notes.id, title: schema.notes.title })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
      ),
    )
    .limit(500);

  const parentTitles = new Map(
    parents
      .filter((parent) => parentIds.includes(parent.id))
      .map((parent) => [parent.id, parent.title] as const),
  );

  const dueTaskNotes = taskNotes
    .filter((note) => note.parentId && parentTitles.has(note.parentId))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    })
    .map((note) => ({
      ...note,
      projectTitle: parentTitles.get(note.parentId!) ?? "Project",
    }));

  const now = Date.now();

  return {
    overdue: dueTaskNotes
      .filter((note) => note.dueDate.getTime() < now)
      .slice(0, limit),
    upcoming: dueTaskNotes
      .filter((note) => note.dueDate.getTime() >= now)
      .slice(0, limit),
  };
}
