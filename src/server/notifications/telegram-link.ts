import { and, eq, gt } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";

const LINK_CODE_TTL_MS = 15 * 60 * 1000;
// Excludes visually ambiguous characters (0/O, 1/I).
const LINK_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LINK_CODE_LENGTH = 6;

function randomLinkCode(): string {
  let code = "";
  for (let i = 0; i < LINK_CODE_LENGTH; i++) {
    code += LINK_CODE_ALPHABET[randomInt(LINK_CODE_ALPHABET.length)];
  }
  return code;
}

export async function generateTelegramLinkCode(): Promise<{
  code: string;
  expiresAt: Date;
}> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const code = randomLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  await db
    .update(schema.users)
    .set({ telegramLinkCode: code, telegramLinkCodeExpiresAt: expiresAt })
    .where(eq(schema.users.id, user.id));

  return { code, expiresAt };
}

export async function getTelegramLinkStatus(): Promise<{ linked: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { linked: false };

  const rows = await db
    .select({ chatId: schema.users.telegramChatId })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  return { linked: !!rows[0]?.chatId };
}

export async function unlinkTelegram(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  await db
    .update(schema.users)
    .set({ telegramChatId: null })
    .where(eq(schema.users.id, user.id));
}

/** Called from the Telegram webhook, which has no session — resolves purely by code + chat. */
export async function consumeTelegramLinkCode(
  code: string,
  chatId: string,
): Promise<{ ok: true } | { ok: false }> {
  try {
    const rows = await db
      .update(schema.users)
      .set({
        telegramChatId: chatId,
        telegramLinkCode: null,
        telegramLinkCodeExpiresAt: null,
      })
      .where(and(eq(schema.users.telegramLinkCode, code), gt(schema.users.telegramLinkCodeExpiresAt, new Date())))
      .returning({ id: schema.users.id });
    if (!rows[0]) return { ok: false };
  } catch {
    // Most likely the unique constraint on telegramChatId — this chat is already linked
    // to a different Inkest account.
    return { ok: false };
  }

  return { ok: true };
}

export async function getTelegramChatIdForUser(userId: string): Promise<string | null> {
  const rows = await db
    .select({ chatId: schema.users.telegramChatId })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return rows[0]?.chatId ?? null;
}
