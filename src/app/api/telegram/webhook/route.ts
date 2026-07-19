import { NextRequest, NextResponse } from "next/server";
import { consumeTelegramLinkCode } from "@/server/notifications/telegram-link";
import { sendRawTelegramMessage, telegramBotToken } from "@/server/notifications/telegram";

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
  const botToken = telegramBotToken();
  if (!botToken) return NextResponse.json({ ok: true });

  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: "Telegram webhook secret is not configured." }, { status: 503 });
  }

  const header = request.headers.get("x-telegram-bot-api-secret-token");
  if (header !== webhookSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      await sendRawTelegramMessage(
        botToken,
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
