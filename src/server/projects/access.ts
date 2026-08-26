import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import type { Note } from "@/server/db/schema";

export type ProjectRole = "owner" | "editor" | "viewer";

export type ProjectAccess = {
  /** The note access was resolved for (full row). */
  note: Note;
  /**
   * The governing share root: the outermost project-typed ancestor-or-self.
   * Null when the note lives outside any project tree (owner-only).
   */
  projectId: string | null;
  role: ProjectRole;
};

/** Hard cap on ancestor walks so a corrupted parent cycle cannot loop forever. */
const MAX_ANCESTOR_DEPTH = 50;

type ChainRow = { id: string; parentId: string | null; type: string };

/**
 * Pure helper: given the rows of a note chain (any superset works), return the
 * id of the outermost `project`-typed ancestor-or-self — the share root — or
 * null when the chain contains no project.
 */
export function findShareRoot(
  rows: readonly ChainRow[],
  noteId: string,
): string | null {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const chain: string[] = [];
  const seen = new Set<string>();
  let cursor: string | null = noteId;
  while (cursor !== null && !seen.has(cursor) && chain.length <= MAX_ANCESTOR_DEPTH) {
    seen.add(cursor);
    const row = byId.get(cursor);
    if (!row) break;
    chain.push(row.id);
    cursor = row.parentId;
  }

  for (let i = chain.length - 1; i >= 0; i--) {
    if (byId.get(chain[i])?.type === "project") return chain[i];
  }
  return null;
}

/**
 * Resolve what `userId` may do with note `noteId`:
 * - owner: the share root's note owner (or the note's owner outside any project)
 * - editor/viewer: a project_members row on the share root
 * - null: no access (also when the note is missing or soft-deleted)
 */
export async function resolveProjectAccess(
  noteId: string,
  userId: string,
): Promise<ProjectAccess | null> {
  const noteRows = await db
    .select()
    .from(schema.notes)
    .where(and(eq(schema.notes.id, noteId), isNull(schema.notes.deletedAt)))
    .limit(1);
  const note = noteRows[0];
  if (!note) return null;

  const chain: (ChainRow & { userId: string })[] = [
    { id: note.id, parentId: note.parentId, type: note.type, userId: note.userId },
  ];
  const seen = new Set<string>([note.id]);
  let cursor = note.parentId;
  while (
    cursor !== null &&
    !seen.has(cursor) &&
    chain.length <= MAX_ANCESTOR_DEPTH
  ) {
    seen.add(cursor);
    const rows = await db
      .select({
        id: schema.notes.id,
        parentId: schema.notes.parentId,
        type: schema.notes.type,
        userId: schema.notes.userId,
      })
      .from(schema.notes)
      .where(eq(schema.notes.id, cursor))
      .limit(1);
    const row = rows[0];
    if (!row) break;
    chain.push(row);
    cursor = row.parentId;
  }

  let rootId: string | null = null;
  let rootUserId: string | null = null;
  for (let i = chain.length - 1; i >= 0; i--) {
    if (chain[i].type === "project") {
      rootId = chain[i].id;
      rootUserId = chain[i].userId;
      break;
    }
  }

  if (rootId === null) {
    // Standalone note (no project in its chain): owner-only.
    return note.userId === userId
      ? { note, projectId: null, role: "owner" }
      : null;
  }

  if (rootUserId === userId) {
    return { note, projectId: rootId, role: "owner" };
  }

  const memberRows = await db
    .select({ role: schema.projectMembers.role })
    .from(schema.projectMembers)
    .where(
      and(
        eq(schema.projectMembers.projectId, rootId),
        eq(schema.projectMembers.userId, userId),
      ),
    )
    .limit(1);

  const role = memberRows[0]?.role;
  return role ? { note, projectId: rootId, role } : null;
}

/** Project ids shared with `userId` (used to widen project list queries). */
export async function listSharedProjectIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ projectId: schema.projectMembers.projectId })
    .from(schema.projectMembers)
    .where(eq(schema.projectMembers.userId, userId));
  return rows.map((row) => row.projectId);
}
