"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  listNoteVersions,
  getNoteVersion,
  snapshotNoteIfChanged,
} from "@/server/notes/versions-service";
import { getNoteById, updateNote } from "@/server/notes/service";
import { resolveProjectAccess } from "@/server/projects/access";
import { getCurrentUser } from "@/server/auth";

const noteIdSchema = z.string().min(1);
const restoreSchema = z.object({
  noteId: z.string().min(1),
  versionId: z.string().min(1),
});

export async function listNoteVersionsAction(noteIdInput: string) {
  const noteId = noteIdSchema.parse(noteIdInput);
  return listNoteVersions(noteId);
}

export async function restoreNoteVersionAction(
  noteIdInput: string,
  versionIdInput: string,
) {
  const { noteId, versionId } = restoreSchema.parse({
    noteId: noteIdInput,
    versionId: versionIdInput,
  });

  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized." } as const;
  }

  const access = await resolveProjectAccess(noteId, user.id);
  if (!access || access.role === "viewer") {
    return { error: "You do not have permission to restore this note." } as const;
  }

  const version = await getNoteVersion(noteId, versionId);
  if (!version) {
    return { error: "Version not found." } as const;
  }

  // Snapshot current state before rolling back with force: true, so the rollback
  // itself is guaranteed to be recoverable even if edited moments ago.
  const current = await getNoteById(noteId);
  if (!current) {
    return { error: "Note not found." } as const;
  }
  try {
    await snapshotNoteIfChanged(noteId, current.contentMd, current.title, {
      force: true,
    });
  } catch {
    // best-effort
  }
  await updateNote(noteId, {
    title: version.title,
    contentMd: version.contentMd,
  });
  revalidatePath("/", "layout");
  return { ok: true, version } as const;
}