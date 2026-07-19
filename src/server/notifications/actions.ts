"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/server/notifications/service";

export async function markNotificationReadAction(id: string) {
  await markNotificationRead(id);
  revalidatePath("/", "layout");
}
