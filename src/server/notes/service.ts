import { eq, and, isNull, desc, ne, asc, sql, or, gte, lt, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { createNoteSchema, updateNoteSchema } from "./validation";
import { slugify, randomId } from "@/lib/slug";
import { getNoteIdsForTags } from "@/server/tags/service";
import { snapshotNoteIfChanged } from "@/server/notes/versions-service";
import { indexDocument, purgeDocumentIndex } from "@/server/knowledge/indexing-service";
import { listSharedProjectIds, resolveProjectAccess } from "@/server/projects/access";
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

function collectDescendantIds(
  noteId: string,
  rows: readonly { id: string; parentId: string | null }[],
) {
  const children = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const entries = children.get(row.parentId) ?? [];
    entries.push(row.id);
    children.set(row.parentId, entries);
  }

  const descendants = new Set<string>();
  const pending = [...(children.get(noteId) ?? [])];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (descendants.has(id)) continue;
    descendants.add(id);
    pending.push(...(children.get(id) ?? []));
  }
  return descendants;
}

async function assertValidParentAssignment({
  noteId,
  noteType,
  parentId,
  userId,
  workspaceId,
}: {
  noteId: string;
  noteType: Note["type"];
  parentId: string | null;
  userId: string;
  workspaceId: string;
}) {
  if (!parentId) return;
  if (parentId === noteId) throw new Error("INVALID_PARENT");

  const rows = await db
    .select({
      id: schema.notes.id,
      parentId: schema.notes.parentId,
      type: schema.notes.type,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, userId),
        eq(schema.notes.workspaceId, workspaceId),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    )
    .limit(500);
  const parent = rows.find((row) => row.id === parentId);
  if (!parent || (noteType === "project" && parent.type !== "project")) {
    throw new Error("INVALID_PARENT");
  }
  if (collectDescendantIds(noteId, rows).has(parentId)) {
    throw new Error("INVALID_PARENT_CYCLE");
  }
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
    parentId: input.parentId ?? null,
  });

  const id = randomId();
  const title = parsed.title;
  const slug = slugify(title) || `note-${id.slice(0, 8)}`;
  const parentId = input.parentId ?? null;

  // Notes created inside another note's tree are stamped with that tree's
  // owner scope, so shared project subtrees stay homogeneous and visible to
  // the owner's existing workspace-scoped queries.
  let treeUserId = user.id;
  let treeWorkspaceId = workspace.id;
  if (parentId) {
    const parentAccess = await resolveProjectAccess(parentId, user.id);
    if (!parentAccess || parentAccess.role === "viewer") {
      throw new Error("INVALID_PARENT");
    }
    treeUserId = parentAccess.note.userId;
    treeWorkspaceId = parentAccess.note.workspaceId;
  }
  await assertValidParentAssignment({
    noteId: id,
    noteType: parsed.type,
    parentId,
    userId: treeUserId,
    workspaceId: treeWorkspaceId,
  });
  const sortOrder = await getNextSortOrder(parentId, treeUserId, treeWorkspaceId);

  await db.insert(schema.notes).values({
    id,
    userId: treeUserId,
    workspaceId: treeWorkspaceId,
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

  // Asynchronously index newly created note in Turso knowledge layer
  void indexDocument({
    documentId: id,
    workspaceId: treeWorkspaceId,
    userId: treeUserId,
    title,
    content: parsed.contentMd,
  });

  return getNoteById(id) as Promise<Note>;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const { user } = await getContext();

  const access = await resolveProjectAccess(id, user.id);
  return access?.note ?? null;
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
    isNull(schema.notes.deletedAt),
    eq(schema.notes.archived, archived),
  ];

  // Ownership scoping: shared project trees are visible to their members.
  // - Listing children scopes to the tree owner's ids (subtrees are
  //   homogeneous), so members and owner see the same rows.
  // - Listing projects widens the user's own scope with shared project ids.
  // - Everything else (sidebar, search, daily) stays strictly owner-only.
  const ownerScope = and(
    eq(schema.notes.userId, user.id),
    eq(schema.notes.workspaceId, workspace.id),
  )!;
  let scopeCondition = ownerScope;
  if (parentId != null) {
    const parentAccess = await resolveProjectAccess(parentId, user.id);
    if (!parentAccess) return [];
    scopeCondition = and(
      eq(schema.notes.userId, parentAccess.note.userId),
      eq(schema.notes.workspaceId, parentAccess.note.workspaceId),
    )!;
  } else if (type === "project") {
    const sharedIds = await listSharedProjectIds(user.id);
    if (sharedIds.length > 0) {
      scopeCondition = or(ownerScope, inArray(schema.notes.id, sharedIds))!;
    }
  }
  conditions.push(scopeCondition);

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
  const access = await resolveProjectAccess(id, user.id);
  if (!access) return null;

  // Viewers never write; reshaping a shared tree (type/parent moves) is
  // reserved for the owner.
  if (access.role === "viewer") return null;
  const structuralChange =
    (parsed.type !== undefined && parsed.type !== access.note.type) ||
    (parsed.parentId !== undefined && parsed.parentId !== access.note.parentId);
  if (structuralChange && access.role !== "owner") return null;

  const current = {
    title: access.note.title,
    contentMd: access.note.contentMd,
    type: access.note.type,
    parentId: access.note.parentId,
  };

  // Snapshot the current note state before overwriting, when content or title
  // are about to change. Failure is swallowed — version history is best-effort
  // and must not block editing.
  if (
    (parsed.contentMd !== undefined || parsed.title !== undefined) &&
    Object.keys(parsed).length > 0
  ) {
    try {
      await snapshotNoteIfChanged(id, current.contentMd, current.title);
    } catch {
      // best-effort snapshot
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const nextType = parsed.type ?? current.type;
  const nextParentId =
    parsed.parentId === undefined ? current.parentId ?? null : parsed.parentId;
  if (nextType) {
    await assertValidParentAssignment({
      noteId: id,
      noteType: nextType,
      parentId: nextParentId,
      userId: access.note.userId,
      workspaceId: access.note.workspaceId,
    });
  }
  if (parsed.title !== undefined) {
    updates.title = parsed.title;
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
        isNull(schema.notes.deletedAt),
      ),
    );

  // Trigger background knowledge index sync if content or title changed.
  // Index under the note's real owner scope, which differs from the acting
  // user when a project member edits a shared note.
  if (parsed.contentMd !== undefined || parsed.title !== undefined) {
    void indexDocument({
      documentId: id,
      workspaceId: access.note.workspaceId,
      userId: access.note.userId,
      title: parsed.title ?? current.title,
      content: parsed.contentMd ?? current.contentMd,
    });
  }

  return getNoteById(id);
}

export async function archiveNote(id: string): Promise<void> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(id, user.id);
  if (!access || access.role === "viewer") return;
  // Archiving the shared root hides it for every member: owner only.
  if (access.projectId === id && access.role !== "owner") return;
  await db
    .update(schema.notes)
    .set({ archived: true, updatedAt: new Date() })
    .where(
      and(
        eq(schema.notes.id, id),
        isNull(schema.notes.deletedAt),
      ),
    );
}

export async function unarchiveNote(id: string): Promise<void> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(id, user.id);
  if (!access || access.role === "viewer") return;
  if (access.projectId === id && access.role !== "owner") return;
  await db
    .update(schema.notes)
    .set({ archived: false, updatedAt: new Date() })
    .where(eq(schema.notes.id, id));
}

export async function deleteNoteSoft(id: string): Promise<void> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(id, user.id);
  if (!access || access.role === "viewer") return;
  // Deleting the shared root removes it for every member: owner only.
  if (access.projectId === id && access.role !== "owner") return;
  await db
    .update(schema.notes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.notes.id, id));

  void purgeDocumentIndex(id);
}

export async function togglePinned(id: string): Promise<void> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(id, user.id);
  if (!access || access.role !== "owner") return;
  await db
    .update(schema.notes)
    .set({ pinned: !access.note.pinned, updatedAt: new Date() })
    .where(eq(schema.notes.id, id));
}

export type NoteListItem = Note;

// ── Backlinks ─────────────────────────────────────────────────────────────

export type BacklinkItem = Note & { snippet?: string };

/**
 * Find notes whose content references this note via `[[slug]]` or
 * `[[title]]`. Matches are case-insensitive and stripped of section anchors.
 */
export async function getBacklinks(noteId: string): Promise<BacklinkItem[]> {
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

  const results: BacklinkItem[] = [];

  for (const n of candidates) {
    if (!n.contentMd.includes("[[")) continue;
    const lines = n.contentMd.split("\n");
    let matchSnippet: string | null = null;

    let inFence = false;
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      WIKI_TOKEN_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = WIKI_TOKEN_RE.exec(line)) !== null) {
        const name = match[1].split("#")[0]?.trim() ?? "";
        if (!name) continue;
        const norm = normalizeSearch(name);
        if (norm === slugNeedle || norm === titleNeedle) {
          matchSnippet = line.trim();
          break;
        }
      }
      if (matchSnippet) break;
    }

    if (matchSnippet) {
      results.push({
        ...n,
        snippet: matchSnippet.length > 120 ? `${matchSnippet.slice(0, 117)}...` : matchSnippet,
      });
    }
  }

  return results;
}

const WIKI_TOKEN_RE = /\[\[([^\]\n]+?)\]\]/g;
export function extractWikiTokens(content: string): string[] {
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

export type NoteTreeNode = {
  id: string;
  title: string;
  slug: string;
  type: "note" | "project" | "daily" | "document";
  fileType?: "pdf" | "text" | "markdown";
  documentId?: string;
  updatedAt: Date;
  createdAt: Date;
  children: NoteTreeNode[];
};

/**
 * Build a 2-level tree of notes and documents for the sidebar: top-level notes/documents
 * with their child notes/documents. Stays shallow to keep navigation predictable.
 */
export async function listNotesTree(): Promise<NoteTreeNode[]> {
  const { user, workspace } = await getContext();
  const noteRows = await db
    .select({
      id: schema.notes.id,
      title: schema.notes.title,
      slug: schema.notes.slug,
      type: schema.notes.type,
      parentId: schema.notes.parentId,
      updatedAt: schema.notes.updatedAt,
      createdAt: schema.notes.createdAt,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    )
    .orderBy(...siblingSortColumns())
    .limit(500);

  const docRows = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      fileType: schema.documents.fileType,
      parentId: schema.documents.parentId,
      updatedAt: schema.documents.updatedAt,
      createdAt: schema.documents.createdAt,
    })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, user.id),
        eq(schema.documents.workspaceId, workspace.id),
      ),
    )
    .limit(200);

  const nodes = new Map<string, NoteTreeNode>();
  const childrenByParent = new Map<string | null, string[]>();

  for (const row of noteRows) {
    nodes.set(row.id, { ...row, children: [] });
    const siblings = childrenByParent.get(row.parentId) ?? [];
    siblings.push(row.id);
    childrenByParent.set(row.parentId, siblings);
  }

  for (const doc of docRows) {
    nodes.set(doc.id, {
      id: doc.id,
      title: doc.title,
      slug: doc.id,
      type: "document",
      fileType: doc.fileType,
      documentId: doc.id,
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      children: [],
    });
    const siblings = childrenByParent.get(doc.parentId) ?? [];
    siblings.push(doc.id);
    childrenByParent.set(doc.parentId, siblings);
  }

  const build = (
    parentId: string | null,
    ancestors = new Set<string>(),
  ): NoteTreeNode[] =>
    (childrenByParent.get(parentId) ?? []).flatMap((id) => {
      const node = nodes.get(id);
      if (!node || ancestors.has(id)) return [];
      node.children = build(id, new Set([...ancestors, id]));
      return [node];
    });

  return build(null);
}

/**
 * Returns notes that can be a parent for the given note (top-level notes
 * excluding the note itself and its descendants to avoid cycles). For the MVP
 * we keep it shallow: a note can only be parented to other top-level notes
 * (no nested nesting) — keeps the tree two levels deep and predictable.
 */
export async function listParentCandidates(
  noteId: string,
): Promise<Pick<Note, "id" | "title" | "type">[]> {
  const { user, workspace } = await getContext();
  const rows = await db
    .select({
      id: schema.notes.id,
      title: schema.notes.title,
      type: schema.notes.type,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
        ne(schema.notes.id, noteId),
      ),
    )
    .orderBy(...siblingSortColumns())
    .limit(200);
  const allRows = await db
    .select({ id: schema.notes.id, parentId: schema.notes.parentId })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, user.id),
        eq(schema.notes.workspaceId, workspace.id),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
      ),
    );
  const descendants = collectDescendantIds(noteId, allRows);
  return rows.filter((row) => !descendants.has(row.id));
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
        childNote.type !== "project" &&
        (childNote.status === "todo" ||
          childNote.status === "doing" ||
          childNote.status === "paused" ||
          childNote.status === "done"),
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
  const { user } = await getContext();

  const access = await resolveProjectAccess(noteId, user.id);
  if (!access || access.role === "viewer") return null;
  const note = access.note;

  if (targetParentId === noteId) {
    throw new Error("INVALID_PARENT");
  }

  // Sibling order and parent validation operate on the tree owner's scope,
  // which is the acting user for own notes and the project owner for shared
  // subtrees.
  const scopeUserId = note.userId;
  const scopeWorkspaceId = note.workspaceId;

  if (targetParentId !== null) {
    const parentAccess = await resolveProjectAccess(targetParentId, user.id);
    if (
      !parentAccess ||
      parentAccess.role === "viewer" ||
      parentAccess.note.archived ||
      parentAccess.note.userId !== scopeUserId
    ) {
      throw new Error("INVALID_PARENT");
    }
    await assertValidParentAssignment({
      noteId,
      noteType: note.type,
      parentId: parentAccess.note.id,
      userId: scopeUserId,
      workspaceId: scopeWorkspaceId,
    });
  } else if (access.role !== "owner") {
    // Members cannot detach a note from the shared tree into someone's
    // top level.
    throw new Error("INVALID_PARENT");
  }

  const sourceParentId = note.parentId ?? null;
  const destinationParentId = targetParentId;

  const sourceIds = await fetchSiblingIds(
    sourceParentId,
    scopeUserId,
    scopeWorkspaceId,
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
    : await fetchSiblingIds(destinationParentId, scopeUserId, scopeWorkspaceId);
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
      scopeUserId,
      scopeWorkspaceId,
    );
  } else {
    await db.transaction(async (tx) => {
      await resequenceSiblingGroup(
        sourceParentId,
        finalSourceIds,
        scopeUserId,
        scopeWorkspaceId,
        tx,
      );
      await resequenceSiblingGroup(
        destinationParentId,
        nextDestinationIds,
        scopeUserId,
        scopeWorkspaceId,
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
            eq(schema.notes.userId, scopeUserId),
            eq(schema.notes.workspaceId, scopeWorkspaceId),
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
