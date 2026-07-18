"use server";

import { revalidatePath } from "next/cache";
import { parseDateKey } from "@/server/calendar/service";
import { getOrCreateDailyNote } from "@/server/notes/service";

function parseDailyDate(date?: string) {
  return parseDateKey(date) ?? new Date();
}

export async function openDailyNoteAction(date?: string) {
  const target = parseDailyDate(date);
  target.setHours(0, 0, 0, 0);

  const note = await getOrCreateDailyNote(target);
  revalidatePath("/notes");
  revalidatePath(`/notes/${note.id}`);

  return note.id;
}
