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
} from "./service";

export async function createNoteAction() {
  const note = await createNote({ title: "Untitled" });
  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export async function updateNoteAction(
  id: string,
  input: Parameters<typeof updateNote>[1],
) {
  await updateNote(id, input);
  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
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
