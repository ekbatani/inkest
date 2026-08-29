"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/server/auth";
import { getUserSettings, updateUserSettings } from "@/server/users/settings-service";
import {
  generateTelegramLinkCode,
  getTelegramLinkStatus,
  unlinkTelegram,
} from "@/server/notifications/telegram-link";
import {
  deleteTelegramWebhook,
  getEffectiveTelegramBotToken,
  getTelegramBotInfo,
  getTelegramWebhookInfo,
  registerTelegramWebhook,
  sendTelegramNotification,
  telegramBotToken,
} from "@/server/notifications/telegram";

async function getRequestOrigin(): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    const proto =
      headerList.get("x-forwarded-proto") ||
      (host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https");
    if (host) {
      return `${proto}://${host}`;
    }
  } catch {
    // Fallback if headers cannot be read
  }
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  );
}

export async function getTelegramBotConfigAction() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      botConfigured: false,
      botUsername: null,
      botName: null,
      hasInstanceBot: Boolean(telegramBotToken()),
      webhookConfigured: false,
      webhookUrl: null,
      linked: false,
      chatId: null,
      suggestedWebhookUrl: "http://localhost:3000/api/telegram/webhook",
    };
  }

  const [settings, linkStatus, origin] = await Promise.all([
    getUserSettings(user.id),
    getTelegramLinkStatus(user.id),
    getRequestOrigin(),
  ]);

  const userBotToken = settings.telegram?.botToken?.trim() || null;
  const instanceToken = telegramBotToken();
  const effectiveToken = userBotToken || instanceToken;
  const hasBot = Boolean(effectiveToken);

  let botUsername = settings.telegram?.botUsername || null;
  let botName = settings.telegram?.botName || null;

  // If bot is configured but we haven't cached the username/name yet, fetch it
  if (hasBot && !botUsername && effectiveToken) {
    const info = await getTelegramBotInfo(effectiveToken);
    if (info.ok) {
      botUsername = info.bot.username || null;
      botName = info.bot.firstName || null;
    }
  }

  const suggestedWebhookUrl = `${origin.replace(/\/$/, "")}/api/telegram/webhook?uid=${user.id}`;

  return {
    botConfigured: Boolean(userBotToken),
    botUsername,
    botName,
    hasInstanceBot: Boolean(instanceToken),
    webhookConfigured: Boolean(settings.telegram?.webhookConfiguredAt || settings.telegram?.webhookUrl),
    webhookUrl: settings.telegram?.webhookUrl || null,
    linked: linkStatus.linked,
    chatId: linkStatus.chatId,
    suggestedWebhookUrl,
  };
}

export async function saveTelegramBotTokenAction(botToken: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const cleanToken = botToken.trim();
  if (!cleanToken) {
    return { ok: false as const, error: "Bot token cannot be empty." };
  }

  // Validate the bot token with Telegram
  const botInfo = await getTelegramBotInfo(cleanToken);
  if (!botInfo.ok) {
    return {
      ok: false as const,
      error: `Invalid Telegram Bot Token: ${botInfo.error}`,
    };
  }

  await updateUserSettings({
    telegram: {
      botToken: cleanToken,
      botUsername: botInfo.bot.username,
      botName: botInfo.bot.firstName,
    },
  });

  revalidatePath("/settings");

  return {
    ok: true as const,
    bot: {
      id: botInfo.bot.id,
      username: botInfo.bot.username,
      firstName: botInfo.bot.firstName,
    },
  };
}

export async function registerTelegramWebhookAction(params?: {
  customWebhookUrl?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const token = await getEffectiveTelegramBotToken(user.id);
  if (!token) {
    return {
      ok: false as const,
      error: "Please enter and save a Telegram Bot Token first.",
    };
  }

  const settings = await getUserSettings(user.id);
  const origin = await getRequestOrigin();

  let targetUrl = params?.customWebhookUrl?.trim();
  if (!targetUrl) {
    targetUrl = `${origin.replace(/\/$/, "")}/api/telegram/webhook?uid=${user.id}`;
  }

  // Enforce HTTPS unless localhost
  if (!targetUrl.startsWith("https://") && !targetUrl.includes("localhost") && !targetUrl.includes("127.0.0.1")) {
    return {
      ok: false as const,
      error: "Telegram requires an HTTPS webhook URL (e.g. https://your-domain.com/api/telegram/webhook).",
    };
  }

  // Generate or reuse webhook secret
  let webhookSecret =
    settings.telegram?.webhookSecret?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    webhookSecret = randomBytes(24).toString("hex");
  }

  const registration = await registerTelegramWebhook(token, targetUrl, webhookSecret);
  if (!registration.ok) {
    return { ok: false as const, error: registration.error };
  }

  await updateUserSettings({
    telegram: {
      webhookUrl: targetUrl,
      webhookSecret,
      webhookConfiguredAt: Date.now(),
    },
  });

  revalidatePath("/settings");

  return {
    ok: true as const,
    webhookUrl: targetUrl,
    description: registration.description,
  };
}

export async function getTelegramWebhookStatusAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const token = await getEffectiveTelegramBotToken(user.id);
  if (!token) {
    return { ok: false as const, error: "No Telegram bot token is configured." };
  }

  return getTelegramWebhookInfo(token);
}

export async function removeTelegramBotTokenAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const settings = await getUserSettings(user.id);
  if (settings.telegram?.botToken) {
    try {
      await deleteTelegramWebhook(settings.telegram.botToken);
    } catch {
      // Ignore deletion failure when removing locally
    }
  }

  await updateUserSettings({
    telegram: {
      botToken: "",
      botUsername: "",
      botName: "",
      webhookUrl: "",
      webhookSecret: "",
      webhookConfiguredAt: undefined,
    },
  });

  revalidatePath("/settings");

  return { ok: true as const };
}

export async function generateTelegramLinkCodeAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const result = await generateTelegramLinkCode();
  const settings = await getUserSettings(user.id);

  let botUsername = settings.telegram?.botUsername || null;
  if (!botUsername) {
    const token = await getEffectiveTelegramBotToken(user.id);
    if (token) {
      const info = await getTelegramBotInfo(token);
      if (info.ok && info.bot.username) {
        botUsername = info.bot.username;
      }
    }
  }

  const deepLink = botUsername
    ? `https://t.me/${botUsername}?start=${result.code}`
    : null;

  return {
    code: result.code,
    expiresAt: result.expiresAt.toISOString(),
    botUsername,
    deepLink,
  };
}

export async function getTelegramLinkStatusAction() {
  return getTelegramLinkStatus();
}

export async function unlinkTelegramAction() {
  await unlinkTelegram();
  revalidatePath("/settings");
}

export async function sendTelegramTestAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const link = await getTelegramLinkStatus(user.id);
  if (!link.linked || !link.chatId) {
    return { ok: false as const, error: "No Telegram account is linked yet." };
  }

  const result = await sendTelegramNotification(
    {
      title: "🔔 Inkest Test Notification",
      body: "Your Telegram bot is successfully connected and receiving notifications from Inkest!",
      metadata: {
        Status: "Connected",
        Time: new Date().toLocaleTimeString(),
      },
    },
    { chatId: link.chatId, userId: user.id },
  );

  return result;
}

