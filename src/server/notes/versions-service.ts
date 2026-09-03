import { eq, and, desc, sql } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { randomId } from "@/lib/slug";
import type { NoteVersion } from "@/server/db/schema";
import { resolveProjectAccess } from "@/server/projects/access";

export const MAX_VERSIONS_PER_NOTE = 50;
// Only create a new auto-snapshot if the previous snapshot is older than
// this many milliseconds, to avoid one-version-per-keystroke bloat.
const AUTO_SNAPSHOT_MIN_INTERVAL_MS = 60_000;

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return { user };
}

/**
 * Create a snapshot of the note's CURRENT content + title (i.e. the state
 * before a new update overwrites it). Returns true when a snapshot was
 * actually written.
 *
 * Snapshots are throttled: only one auto-snapshot per minute and only if the
 * current state differs from the last stored snapshot. When `options.force` is
 * true (e.g. before rolling back a version), the time interval is bypassed.
 * We always cap the total number of snapshots per note at MAX_VERSIONS_PER_NOTE,
 * trimming the oldest.
 */
export async function snapshotNoteIfChanged(
  noteId: string,
  prevContent: string,
  prevTitle: string,
  options?: { force?: boolean },
): Promise<boolean> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(noteId, user.id);
  if (!access || access.role === "viewer") return false;

  const latest = await db
    .select()
    .from(schema.noteVersions)
    .where(eq(schema.noteVersions.noteId, noteId))
    .orderBy(desc(schema.noteVersions.createdAt))
    .limit(1);

  const last = latest[0];
  const now = Date.now();

  const contentChanged = !last || last.contentMd !== prevContent;
  const titleChanged = !last || last.title !== prevTitle;
  if (!contentChanged && !titleChanged) return false;

  if (last && !options?.force) {
    const age = now - new Date(last.createdAt).getTime();
    if (age < AUTO_SNAPSHOT_MIN_INTERVAL_MS) return false;
  }

  await db.insert(schema.noteVersions).values({
    id: randomId("ver"),
    noteId,
    userId: user.id,
    title: prevTitle,
    contentMd: prevContent,
    createdAt: new Date(),
  });

  // Trim oldest beyond cap in PostgreSQL.
  await db
    .delete(schema.noteVersions)
    .where(
      and(
        eq(schema.noteVersions.noteId, noteId),
        sql`${schema.noteVersions.id} NOT IN (
          SELECT id FROM note_versions
          WHERE note_id = ${noteId}
          ORDER BY created_at DESC
          LIMIT ${MAX_VERSIONS_PER_NOTE}
        )`,
      ),
    );

  return true;
}

export async function listNoteVersions(noteId: string): Promise<NoteVersion[]> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(noteId, user.id);
  if (!access) return [];

  const rows = await db
    .select()
    .from(schema.noteVersions)
    .where(eq(schema.noteVersions.noteId, noteId))
    .orderBy(desc(schema.noteVersions.createdAt))
    .limit(MAX_VERSIONS_PER_NOTE);
  return rows;
}

export async function getNoteVersion(
  noteId: string,
  versionId: string,
): Promise<NoteVersion | null> {
  const { user } = await getContext();
  const access = await resolveProjectAccess(noteId, user.id);
  if (!access) return null;

  const rows = await db
    .select()
    .from(schema.noteVersions)
    .where(
      and(
        eq(schema.noteVersions.id, versionId),
        eq(schema.noteVersions.noteId, noteId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}