import { getCurrentUser } from "@/server/auth";
import { getUserSettings } from "@/server/users/settings-service";
import { getTelegramChatIdForUser } from "@/server/notifications/telegram-link";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const TELEGRAM_MESSAGE_LIMIT = 4096;
const TELEGRAM_SAFE_MESSAGE_LIMIT = 3900;
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

type TelegramNotification = {
  title: string;
  body: string;
  metadata?: Record<string, string | null | undefined>;
};

type TelegramResult =
  | { ok: true }
  | { ok: false; error: string; notConfigured?: boolean };

export function telegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

function truncateForTelegram(message: string) {
  if (message.length <= TELEGRAM_MESSAGE_LIMIT) return message;
  return `${message.slice(0, TELEGRAM_SAFE_MESSAGE_LIMIT).trimEnd()}\n\n[truncated]`;
}

function formatNotification(notification: TelegramNotification) {
  const metadata = Object.entries(notification.metadata ?? {})
    .filter(([, value]) => value && value.trim().length > 0)
    .map(([key, value]) => `${key}: ${value}`);

  return truncateForTelegram(
    [
      notification.title,
      metadata.length > 0 ? metadata.join("\n") : null,
      notification.body.trim(),
    ]
      .filter(Boolean)
      .join("\n\n"),
  );
}

/** Low-level send, usable both for configured-user notifications and the webhook's replies. */
export async function sendRawTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<TelegramResult> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        ok: false,
        error: `Telegram API returned ${response.status}: ${detail}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Telegram notification failed: ${err.message}`
          : "Telegram notification failed.",
    };
  }
}

/**
 * Sends to an explicit chatId when given (a linked per-user chat); otherwise falls back to the
 * server-wide TELEGRAM_CHAT_ID env var, which keeps single-user self-host deployments working
 * without linking an account.
 */
export async function sendTelegramNotification(
  notification: TelegramNotification,
  opts?: { chatId?: string | null },
): Promise<TelegramResult> {
  const botToken = telegramBotToken();
  if (!botToken) {
    return {
      ok: false,
      error: "Telegram notifications are not configured.",
      notConfigured: true,
    };
  }

  const chatId = opts?.chatId ?? process.env.TELEGRAM_CHAT_ID?.trim();
  if (!chatId) {
    return {
      ok: false,
      error: "No Telegram chat is linked or configured.",
      notConfigured: true,
    };
  }

  return sendRawTelegramMessage(botToken, chatId, formatNotification(notification));
}

export async function notifyAiActionResult(args: {
  action: string;
  noteTitle: string;
  output: string;
  model?: string;
  provider?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return;

  const settings = await getUserSettings();
  if (settings.notifications?.aiResults === false) return;

  const chatId = await getTelegramChatIdForUser(user.id);
  // AI output is user content. Never fall back to the instance-wide chat for
  // an account that has not explicitly linked its own Telegram destination.
  if (!chatId) return;

  const result = await sendTelegramNotification(
    {
      title: "Inkest AI decision output",
      body: args.output,
      metadata: {
        Action: args.action,
        Note: args.noteTitle,
        Provider: args.provider,
        Model: args.model,
      },
    },
    { chatId },
  );

  if (!result.ok && !result.notConfigured) {
    console.warn("[telegram] failed to send AI action result:", result.error);
  }
}
