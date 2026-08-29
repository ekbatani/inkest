import { NextRequest, NextResponse } from "next/server";
import { consumeTelegramLinkCode } from "@/server/notifications/telegram-link";
import {
  getEffectiveTelegramBotToken,
  sendRawTelegramMessage,
  telegramBotToken,
} from "@/server/notifications/telegram";
import { getUserSettings } from "@/server/users/settings-service";

const START_WITH_CODE_RE = /^\/start(?:@[\w_]+)?\s+([A-Za-z0-9]{4,10})\s*$/;
const START_RE = /^\/start(?:@[\w_]+)?\s*$/;

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
};

// Always ack with 200 quickly — Telegram retries (and eventually disables) webhooks that
// don't respond promptly, so we never want a slow/failed downstream call to surface here.
export async function POST(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get("uid")?.trim();
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token")?.trim();

  let botToken: string | null = null;

  if (uid) {
    // Per-user webhook routing
    try {
      const userSettings = await getUserSettings(uid);
      const expectedSecret =
        userSettings.telegram?.webhookSecret?.trim() ||
        process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

      if (expectedSecret && headerSecret !== expectedSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      botToken = userSettings.telegram?.botToken?.trim() || (await getEffectiveTelegramBotToken(uid));
    } catch {
      return NextResponse.json({ error: "Invalid user endpoint" }, { status: 400 });
    }
  } else {
    // Instance-wide webhook routing
    const instanceSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (instanceSecret) {
      if (headerSecret !== instanceSecret) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    botToken = telegramBotToken();
  }

  if (!botToken) {
    return NextResponse.json({ ok: true });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();

  if (chatId != null && text) {
    const codeMatch = text.match(START_WITH_CODE_RE);
    if (codeMatch) {
      const result = await consumeTelegramLinkCode(codeMatch[1].toUpperCase(), String(chatId));
      const targetToken = result.ok
        ? (await getEffectiveTelegramBotToken(result.userId)) || botToken
        : botToken;

      await sendRawTelegramMessage(
        targetToken,
        String(chatId),
        result.ok
          ? "✅ Telegram is now linked to your Inkest account."
          : "That code is invalid, expired, or already used by another account. Generate a new one from Settings → Notifications.",
      );
    } else if (START_RE.test(text)) {
      await sendRawTelegramMessage(
        botToken,
        String(chatId),
        "Send /start followed by the linking code from Settings → Notifications, e.g. /start ABC123.",
      );
    }
  }

  return NextResponse.json({ ok: true });
}
