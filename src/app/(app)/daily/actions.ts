"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateDailyNote } from "@/server/notes/service";

function parseDailyDate(date?: string) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  return new Date();
}

export async function openDailyNoteAction(date?: string) {
  const target = parseDailyDate(date);
  target.setHours(0, 0, 0, 0);

  const note = await getOrCreateDailyNote(target);
  revalidatePath("/notes");
  revalidatePath(`/notes/${note.id}`);

  return note.id;
}
