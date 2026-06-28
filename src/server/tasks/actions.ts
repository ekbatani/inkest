"use server";

import { revalidatePath } from "next/cache";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  syncMarkdownTasks,
} from "./service";
import type { z } from "zod";
import type {
  createTaskSchema,
  updateTaskSchema,
} from "./validation";

export async function listTasksAction(noteId: string) {
  return listTasks(noteId);
}

export async function createTaskAction(
  input: z.input<typeof createTaskSchema>,
) {
  const task = await createTask(input);
  revalidatePath(`/projects/${input.noteId}`);
  revalidatePath(`/notes/${input.noteId}`);
  return task;
}

export async function updateTaskAction(
  noteId: string,
  id: string,
  input: z.infer<typeof updateTaskSchema>,
) {
  await updateTask(id, input);
  revalidatePath(`/projects/${noteId}`);
  revalidatePath(`/notes/${noteId}`);
}

export async function deleteTaskAction(noteId: string, id: string) {
  await deleteTask(id);
  revalidatePath(`/projects/${noteId}`);
  revalidatePath(`/notes/${noteId}`);
}

export async function syncMarkdownTasksAction(
  noteId: string,
  content: string,
) {
  await syncMarkdownTasks(noteId, content);
  revalidatePath(`/projects/${noteId}`);
}