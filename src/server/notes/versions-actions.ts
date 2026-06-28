"use server";

import { revalidatePath } from "next/cache";
import {
  listNoteVersions,
  getNoteVersion,
  snapshotNoteIfChanged,
} from "@/server/notes/versions-service";
import { getNoteById, updateNote } from "@/server/notes/service";

export async function listNoteVersionsAction(noteId: string) {
  return listNoteVersions(noteId);
}

export async function restoreNoteVersionAction(
  noteId: string,
  versionId: string,
) {
  const version = await getNoteVersion(noteId, versionId);
  if (!version) {
    return { error: "Version not found." } as const;
  }
  // Snapshot current state before rolling back, so the rollback itself is
  // recoverable.
  const current = await getNoteById(noteId);
  if (!current) {
    return { error: "Note not found." } as const;
  }
  try {
    await snapshotNoteIfChanged(noteId, current.contentMd, current.title);
  } catch {
    // best-effort
  }
  await updateNote(noteId, {
    title: version.title,
    contentMd: version.contentMd,
  });
  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  return { ok: true } as const;
}