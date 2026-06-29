"use server";

import { revalidatePath } from "next/cache";
import { createNoteFromPrompt } from "@/server/ai/create-note-from-prompt";
import { createNote } from "@/server/notes/service";

export async function quickCaptureAction(content: string) {
  const firstLine = content.split("\n")[0]?.trim() || "Untitled";
  const title = firstLine.length > 80 ? firstLine.slice(0, 80) + "..." : firstLine;

  const note = await createNote({ title, contentMd: content });
  revalidatePath("/dashboard");
  revalidatePath("/notes");
  return { id: note.id };
}

export async function generateQuickCaptureNoteAction(prompt: string) {
  const result = await createNoteFromPrompt(prompt);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const note = await createNote({
    title: result.output.title,
    contentMd: result.output.contentMd,
  });

  revalidatePath("/dashboard");
  revalidatePath("/notes");
  return { id: note.id };
}
