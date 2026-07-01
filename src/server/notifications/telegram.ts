const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const TELEGRAM_MESSAGE_LIMIT = 4096;
const TELEGRAM_SAFE_MESSAGE_LIMIT = 3900;
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

type TelegramNotification = {
  title: string;
  body: string;
  metadata?: Record<string, string | null | undefined>;
};

function telegramConfig() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) return null;
  return { botToken, chatId };
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

export async function sendTelegramNotification(
  notification: TelegramNotification,
): Promise<{ ok: true } | { ok: false; error: string; notConfigured?: boolean }> {
  const config = telegramConfig();
  if (!config) {
    return {
      ok: false,
      error: "Telegram notifications are not configured.",
      notConfigured: true,
    };
  }

  try {
    const response = await fetch(
      `${TELEGRAM_API_BASE_URL}/bot${config.botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
        body: JSON.stringify({
          chat_id: config.chatId,
          text: formatNotification(notification),
          disable_web_page_preview: true,
        }),
      },
    );

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

export async function notifyAiActionResult(args: {
  action: string;
  noteTitle: string;
  output: string;
  model?: string;
  provider?: string;
}) {
  const result = await sendTelegramNotification({
    title: "Inkest AI decision output",
    body: args.output,
    metadata: {
      Action: args.action,
      Note: args.noteTitle,
      Provider: args.provider,
      Model: args.model,
    },
  });

  if (!result.ok && !result.notConfigured) {
    console.warn("[telegram] failed to send AI action result:", result.error);
  }
}
