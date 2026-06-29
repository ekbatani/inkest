"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createNote,
  updateNote,
  archiveNote,
  unarchiveNote,
  deleteNoteSoft,
  togglePinned,
  getNoteById,
  moveNoteInTree,
} from "./service";
import { syncMarkdownTasks } from "@/server/tasks/service";

export async function createNoteAction() {
  const note = await createNote({ title: "Untitled" });
  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export async function createProjectTaskNoteAction(
  projectId: string,
  title: string,
) {
  const note = await createNote({
    title: title.trim() || "New task",
    parentId: projectId,
    status: "todo",
  });
  revalidatePath("/notes");
  revalidatePath(`/notes/${note.id}`);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return note;
}

export async function updateNoteAction(
  id: string,
  input: Parameters<typeof updateNote>[1],
) {
  await updateNote(id, input);
  if (input.contentMd !== undefined) {
    try {
      await syncMarkdownTasks(id, input.contentMd);
    } catch {
      // Sync failure should not break note editing.
    }
  }
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
  revalidatePath(`/projects`);
  revalidatePath(`/projects/${id}`);
}

export async function archiveNoteAction(id: string) {
  await archiveNote(id);
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
  redirect("/notes");
}

export async function unarchiveNoteAction(id: string) {
  await unarchiveNote(id);
  revalidatePath("/notes");
  revalidatePath("/archive");
}

export async function deleteNoteAction(id: string) {
  await deleteNoteSoft(id);
  revalidatePath("/notes");
  revalidatePath("/archive");
  redirect("/notes");
}

export async function togglePinnedAction(id: string) {
  await togglePinned(id);
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
}

export async function moveNoteInTreeAction(
  noteId: string,
  targetParentId: string | null,
  beforeId: string | null = null,
) {
  const previous = await getNoteById(noteId);
  const note = await moveNoteInTree(noteId, targetParentId, beforeId);
  if (!note) {
    throw new Error("NOTE_NOT_FOUND");
  }

  revalidatePath("/notes");
  revalidatePath("/projects");
  revalidatePath(`/notes/${noteId}`);
  if (previous?.parentId) {
    revalidatePath(`/projects/${previous.parentId}`);
    revalidatePath(`/notes/${previous.parentId}`);
  }
  if (targetParentId) {
    revalidatePath(`/projects/${targetParentId}`);
    revalidatePath(`/notes/${targetParentId}`);
  }

  return note;
}

export type NoteSearchHit = {
  id: string;
  title: string;
  excerpt: string;
  updatedAt: Date;
};

export async function searchNotesAction(
  query: string,
): Promise<NoteSearchHit[]> {
  const { listNotes } = await import("./service");
  const q = (query ?? "").trim();
  if (!q) return [];
  const notes = await listNotes({ search: q, limit: 6 });
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    excerpt: (n.excerpt || n.contentMd || "").replace(/[#*`>\-\[\]()!]/g, "").replace(/\n+/g, " ").trim().slice(0, 90),
    updatedAt: n.updatedAt,
  }));
}

export async function listRecentNotesAction(): Promise<NoteSearchHit[]> {
  const { listNotes } = await import("./service");
  const notes = await listNotes({ limit: 6 });
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    excerpt: (n.excerpt || n.contentMd || "").replace(/[#*`>\-\[\]()!]/g, "").replace(/\n+/g, " ").trim().slice(0, 90),
    updatedAt: n.updatedAt,
  }));
}
