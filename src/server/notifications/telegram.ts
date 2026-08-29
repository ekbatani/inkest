import { getCurrentUser } from "@/server/auth";
import { getUserSettings } from "@/server/users/settings-service";
import { getTelegramChatIdForUser } from "@/server/notifications/telegram-link";

const TELEGRAM_API_BASE_URL = "https://api.telegram.org";
const TELEGRAM_MESSAGE_LIMIT = 4096;
const TELEGRAM_SAFE_MESSAGE_LIMIT = 3900;
const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

export type TelegramNotification = {
  title: string;
  body: string;
  metadata?: Record<string, string | null | undefined>;
};

export type TelegramResult =
  | { ok: true }
  | { ok: false; error: string; notConfigured?: boolean };

export type TelegramBotInfo = {
  id: number;
  isBot: boolean;
  firstName: string;
  username?: string;
  canJoinGroups?: boolean;
  canReadAllGroupMessages?: boolean;
  supportsInlineQueries?: boolean;
};

export type TelegramWebhookInfo = {
  url: string;
  hasCustomCertificate: boolean;
  pendingUpdateCount: number;
  ipAddress?: string;
  lastErrorDate?: number;
  lastErrorMessage?: string;
  maxConnections?: number;
  allowedUpdates?: string[];
};

export function telegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export async function getEffectiveTelegramBotToken(userId?: string): Promise<string | null> {
  try {
    const settings = await getUserSettings(userId);
    if (settings.telegram?.botToken?.trim()) {
      return settings.telegram.botToken.trim();
    }
  } catch {
    // Ignore settings fetch error
  }
  return telegramBotToken();
}

/** Fetches bot details from Telegram Bot API getMe. */
export async function getTelegramBotInfo(
  botToken: string,
): Promise<{ ok: true; bot: TelegramBotInfo } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/getMe`, {
      method: "GET",
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: {
        id: number;
        is_bot: boolean;
        first_name: string;
        username?: string;
        can_join_groups?: boolean;
        can_read_all_group_messages?: boolean;
        supports_inline_queries?: boolean;
      };
      description?: string;
    };

    if (!response.ok || !data.ok || !data.result) {
      return {
        ok: false,
        error: data.description || `Telegram API returned status ${response.status}`,
      };
    }

    return {
      ok: true,
      bot: {
        id: data.result.id,
        isBot: data.result.is_bot,
        firstName: data.result.first_name,
        username: data.result.username,
        canJoinGroups: data.result.can_join_groups,
        canReadAllGroupMessages: data.result.can_read_all_group_messages,
        supportsInlineQueries: data.result.supports_inline_queries,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to connect to Telegram API.",
    };
  }
}

/** Registers a webhook with Telegram setWebhook API. */
export async function registerTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken?: string,
): Promise<{ ok: true; description?: string } | { ok: false; error: string }> {
  try {
    const bodyPayload: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message"],
    };
    if (secretToken && secretToken.trim().length > 0) {
      bodyPayload.secret_token = secretToken.trim();
    }

    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      body: JSON.stringify(bodyPayload),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: boolean;
      description?: string;
    };

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `Telegram setWebhook returned status ${response.status}`,
      };
    }

    return {
      ok: true,
      description: data.description || "Webhook registered successfully.",
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to register webhook with Telegram.",
    };
  }
}

/** Queries current webhook status from Telegram getWebhookInfo API. */
export async function getTelegramWebhookInfo(
  botToken: string,
): Promise<{ ok: true; info: TelegramWebhookInfo } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/getWebhookInfo`, {
      method: "GET",
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });

    const data = (await response.json()) as {
      ok: boolean;
      result?: {
        url: string;
        has_custom_certificate: boolean;
        pending_update_count: number;
        ip_address?: string;
        last_error_date?: number;
        last_error_message?: string;
        max_connections?: number;
        allowed_updates?: string[];
      };
      description?: string;
    };

    if (!response.ok || !data.ok || !data.result) {
      return {
        ok: false,
        error: data.description || `Telegram API returned status ${response.status}`,
      };
    }

    return {
      ok: true,
      info: {
        url: data.result.url,
        hasCustomCertificate: data.result.has_custom_certificate,
        pendingUpdateCount: data.result.pending_update_count,
        ipAddress: data.result.ip_address,
        lastErrorDate: data.result.last_error_date,
        lastErrorMessage: data.result.last_error_message,
        maxConnections: data.result.max_connections,
        allowedUpdates: data.result.allowed_updates,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to query webhook status.",
    };
  }
}

/** Deletes the registered webhook from Telegram. */
export async function deleteTelegramWebhook(
  botToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE_URL}/bot${botToken}/deleteWebhook`, {
      method: "POST",
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
    });

    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
    };

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.description || `Failed to delete webhook (${response.status})`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to delete webhook.",
    };
  }
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
  opts?: { chatId?: string | null; botToken?: string | null; userId?: string },
): Promise<TelegramResult> {
  const botToken = opts?.botToken ?? (await getEffectiveTelegramBotToken(opts?.userId));
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
    { chatId, userId: user.id },
  );

  if (!result.ok && !result.notConfigured) {
    console.warn("[telegram] failed to send AI action result:", result.error);
  }
}
