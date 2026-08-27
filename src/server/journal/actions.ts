"use server";

import type { JournalTemplateType } from "@/lib/journal-templates";
import { revalidatePath } from "next/cache";

export async function createJournalEntryAction(args: {
  templateType: JournalTemplateType;
  customTitle?: string;
  moodTag?: string;
}) {
  const { createJournalEntry } = await import("./journal-service");
  const result = await createJournalEntry(args);
  revalidatePath("/", "layout");
  return result;
}
