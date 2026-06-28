"use server";

import { revalidatePath } from "next/cache";
import {
  listTags,
  listTagsForNote,
  createTag,
  updateTag,
  deleteTag,
  setNoteTags,
} from "./service";
import type { z } from "zod";
import type { createTagSchema, updateTagSchema } from "./validation";

export async function listTagsAction() {
  return listTags();
}

export async function listTagsForNoteAction(noteId: string) {
  return listTagsForNote(noteId);
}

export async function createTagAction(
  input: z.infer<typeof createTagSchema>,
) {
  const tag = await createTag(input);
  revalidatePath("/tags");
  revalidatePath("/notes");
  return tag;
}

export async function updateTagAction(
  id: string,
  input: z.infer<typeof updateTagSchema>,
) {
  const tag = await updateTag(id, input);
  revalidatePath("/tags");
  revalidatePath("/notes");
  return tag;
}

export async function deleteTagAction(id: string) {
  await deleteTag(id);
  revalidatePath("/tags");
  revalidatePath("/notes");
}

export async function setNoteTagsAction(
  noteId: string,
  tagIds: string[],
) {
  await setNoteTags(noteId, tagIds);
  revalidatePath("/notes");
  revalidatePath(`/notes/${noteId}`);
  revalidatePath("/tags");
}