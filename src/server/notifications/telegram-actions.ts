"use server";

import { revalidatePath } from "next/cache";
import {
  generateTelegramLinkCode,
  getTelegramLinkStatus,
  unlinkTelegram,
} from "@/server/notifications/telegram-link";

export async function generateTelegramLinkCodeAction() {
  const result = await generateTelegramLinkCode();
  return { code: result.code, expiresAt: result.expiresAt.toISOString() };
}

export async function getTelegramLinkStatusAction() {
  return getTelegramLinkStatus();
}

export async function unlinkTelegramAction() {
  await unlinkTelegram();
  revalidatePath("/settings");
}
