import { eq } from "drizzle-orm";
import { z } from "zod";
import { AI_PROVIDER_IDS } from "@/lib/ai/providers";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import {
  decryptSecret,
  encryptSecret,
  shouldReencryptSecret,
} from "@/server/crypto/secret-box";

const BUILT_IN_PERSONAL_AI_ORIGINS = new Set([
  "https://api.openai.com",
  "https://openrouter.ai",
  "https://opencode.ai",
  "https://integrate.api.nvidia.com",
]);

function isAllowedPersonalAiBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const operatorAllowedOrigins = (process.env.AI_ALLOWED_BASE_URLS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
    return BUILT_IN_PERSONAL_AI_ORIGINS.has(url.origin) || operatorAllowedOrigins.includes(url.origin);
  } catch {
    return false;
  }
}

export const superFocusTrackingModeEnum = z.enum(["pointer", "auto"]);
export const telegramSettingsSchema = z
  .object({
    botToken: z.string().optional(),
    botUsername: z.string().optional(),
    botName: z.string().optional(),
    webhookUrl: z.string().url().optional().or(z.literal("")),
    webhookSecret: z.string().optional(),
    webhookConfiguredAt: z.number().optional(),
  })
  .partial();

export const aiProviderSettingsSchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS).optional(),
    apiKey: z.string().optional(),
    baseURL: z.string().url().optional().or(z.literal("")),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    minInputTokens: z.number().int().min(0).max(32_768).optional(),
    maxInputTokens: z.number().int().min(64).max(128_000).optional(),
    minOutputTokens: z.number().int().min(0).max(8_192).optional(),
    maxOutputTokens: z.number().int().min(16).max(32_768).optional(),
    instructions: z.string().trim().max(4_000).optional(),
    guardrails: z.string().trim().max(4_000).optional(),
    taskTimingPrompt: z.string().trim().max(4_000).optional(),
    projectPlanningPrompt: z.string().trim().max(4_000).optional(),
    onboardingDismissed: z.boolean().optional(),
  })
  .partial();

export const userSettingsSchema = z.object({
  profileCompleted: z.boolean().optional(),
  bio: z.string().max(200).optional(),
  editor: z
    .object({
      autosaveDelayMs: z.number().int().min(0).max(60_000).optional(),
      showLineNumbers: z.boolean().optional(),
      pasteToPreview: z.boolean().optional(),
      spellcheck: z.boolean().optional(),
      spellcheckLanguage: z.enum(["auto", "en", "fa"]).optional(),
    })
    .optional(),
  ai: aiProviderSettingsSchema.optional(),
  theme: z
    .object({
      preference: z.enum(["system", "light", "dark"]).optional(),
      palette: z
        .enum([
          "paper",
          "forest",
          "violet",
          "amber",
          "nord",
          "rose",
          "terracotta",
          "midnight",
        ])
        .optional(),
      font: z
        .enum([
          "sans",
          "serif",
          "mono",
          "persian",
          "persian-sahel",
          "persian-shabnam",
          "persian-samim",
          "persian-amiri",
          "persian-lalezar",
          "persian-nastaliq",
          "persian-noto",
          "slab",
          "typewriter",
          "grotesk",
          "baskerville",
          "persian-serif",
        ])
        .optional(),
    })
    .optional(),
  googleCalendar: z
    .object({
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.number().optional(),
      scope: z.string().optional(),
      connectedEmail: z.string().optional(),
    })
    .optional(),
  superFocus: z
    .object({
      trackingMode: superFocusTrackingModeEnum.optional(),
      // 0 = tight spotlight, 1 = normal, 2 = wide.
      radius: z.number().int().min(0).max(2).optional(),
    })
    .optional(),
  tts: z
    .object({
      rate: z.number().min(0.5).max(2).optional(),
      voiceURI: z.string().optional(),
    })
    .optional(),
  notifications: z
    .object({
      inApp: z.boolean().optional(),
      telegramPush: z.boolean().optional(),
      sharedProjectInvites: z.boolean().optional(),
      sharedNoteUpdates: z.boolean().optional(),
      taskDueReminders: z.boolean().optional(),
      projectDeadlineReminders: z.boolean().optional(),
      dailyMorningBriefing: z.boolean().optional(),
      dailyNoteNudge: z.boolean().optional(),
      weeklyReviewPrompt: z.boolean().optional(),
      aiResults: z.boolean().optional(),
    })
    .optional(),
  telegram: telegramSettingsSchema.optional(),
  agentHarness: z
    .object({
      enabled: z.boolean().optional(),
      apiToken: z.string().optional(),
      maxLoopSteps: z.number().int().min(1).max(15).optional(),
      allowModifyNotes: z.boolean().optional(),
      allowCreateTasks: z.boolean().optional(),
    })
    .optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const DEFAULTS: UserSettings = {
  editor: {
    autosaveDelayMs: 1500,
    showLineNumbers: false,
    pasteToPreview: true,
    spellcheck: true,
    spellcheckLanguage: "auto",
  },
  ai: {
    temperature: 0.4,
    minInputTokens: 0,
    maxInputTokens: 8_000,
    minOutputTokens: 0,
    maxOutputTokens: 1_200,
    instructions: "",
    guardrails: "",
    taskTimingPrompt: "Calculate realistic due dates and start dates relative to the current date. For urgent items, schedule within 1-2 days; medium priority within 1 week; low priority within 2-3 weeks. Sequence tasks logically by dependencies.",
    projectPlanningPrompt: "Break down goals into concrete phased milestones with realistic deliverables, dependencies, and actionable tasks with scheduled timelines.",
    onboardingDismissed: false,
  },
  theme: { preference: "system", palette: "paper", font: "sans" },
  googleCalendar: {},
  telegram: {},
  superFocus: { trackingMode: "pointer", radius: 1 },
  tts: { rate: 1 },
  notifications: {
    inApp: true,
    telegramPush: true,
    sharedProjectInvites: true,
    sharedNoteUpdates: true,
    taskDueReminders: false,
    projectDeadlineReminders: true,
    dailyMorningBriefing: false,
    dailyNoteNudge: false,
    weeklyReviewPrompt: false,
    aiResults: true,
  },
  agentHarness: {
    enabled: true,
    maxLoopSteps: 6,
    allowModifyNotes: true,
    allowCreateTasks: true,
  },
};

function mergeWithDefaults(raw: UserSettings | null): UserSettings {
  if (!raw) return DEFAULTS;
  return {
    editor: { ...DEFAULTS.editor, ...raw.editor },
    ai: { ...DEFAULTS.ai, ...raw.ai },
    theme: { ...DEFAULTS.theme, ...raw.theme },
    googleCalendar: {
      ...DEFAULTS.googleCalendar,
      ...raw.googleCalendar,
    },
    telegram: {
      ...DEFAULTS.telegram,
      ...raw.telegram,
    },
    superFocus: { ...DEFAULTS.superFocus, ...raw.superFocus },
    tts: { ...DEFAULTS.tts, ...raw.tts },
    notifications: { ...DEFAULTS.notifications, ...raw.notifications },
  };
}

function parse(raw: string | null): UserSettings | null {
  if (!raw) return null;
  try {
    const parsed = userSettingsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getUserSettings(userId?: string): Promise<UserSettings> {
  let targetUserId = userId;
  if (!targetUserId) {
    try {
      const user = await getCurrentUser();
      targetUserId = user?.id;
    } catch {
      return DEFAULTS;
    }
  }
  if (!targetUserId) return DEFAULTS;
  const rows = await db
    .select({ settings: schema.users.settings })
    .from(schema.users)
    .where(eq(schema.users.id, targetUserId))
    .limit(1);
  const storedSettings = mergeWithDefaults(parse(rows[0]?.settings ?? null));
  const settings = structuredClone(storedSettings);
  let needsMigration = false;
  if (settings.ai?.apiKey) {
    try {
      settings.ai = { ...settings.ai, apiKey: decryptSecret(settings.ai.apiKey) };
      needsMigration ||= shouldReencryptSecret(storedSettings.ai?.apiKey ?? "");
    } catch {
      // NEXTAUTH_SECRET rotated or the value is corrupt — treat the stored key as unusable
      // rather than crashing the settings page or leaking ciphertext into the UI.
      settings.ai = { ...settings.ai, apiKey: "" };
    }
  }
  if (settings.googleCalendar?.accessToken) {
    try {
      settings.googleCalendar = {
        ...settings.googleCalendar,
        accessToken: decryptSecret(settings.googleCalendar.accessToken),
        refreshToken: settings.googleCalendar.refreshToken
          ? decryptSecret(settings.googleCalendar.refreshToken)
          : undefined,
      };
      needsMigration ||= shouldReencryptSecret(storedSettings.googleCalendar?.accessToken ?? "");
      if (storedSettings.googleCalendar?.refreshToken) {
        needsMigration ||= shouldReencryptSecret(storedSettings.googleCalendar.refreshToken);
      }
    } catch {
      settings.googleCalendar = {
        ...settings.googleCalendar,
        accessToken: undefined,
        refreshToken: undefined,
      };
    }
  }
  if (settings.telegram?.botToken) {
    try {
      settings.telegram = {
        ...settings.telegram,
        botToken: decryptSecret(settings.telegram.botToken),
      };
      needsMigration ||= shouldReencryptSecret(storedSettings.telegram?.botToken ?? "");
    } catch {
      settings.telegram = {
        ...settings.telegram,
        botToken: "",
      };
    }
  }
  if (settings.telegram?.webhookSecret) {
    try {
      settings.telegram = {
        ...settings.telegram,
        webhookSecret: decryptSecret(settings.telegram.webhookSecret),
      };
      needsMigration ||= shouldReencryptSecret(storedSettings.telegram?.webhookSecret ?? "");
    } catch {
      settings.telegram = {
        ...settings.telegram,
        webhookSecret: "",
      };
    }
  }
  if (needsMigration) {
    const migrated: UserSettings = {
      ...settings,
      ai: settings.ai?.apiKey
        ? { ...settings.ai, apiKey: encryptSecret(settings.ai.apiKey) }
        : settings.ai,
      googleCalendar: settings.googleCalendar?.accessToken
        ? {
            ...settings.googleCalendar,
            accessToken: encryptSecret(settings.googleCalendar.accessToken),
            refreshToken: settings.googleCalendar.refreshToken
              ? encryptSecret(settings.googleCalendar.refreshToken)
              : undefined,
          }
        : settings.googleCalendar,
      telegram: settings.telegram
        ? {
            ...settings.telegram,
            botToken: settings.telegram.botToken
              ? encryptSecret(settings.telegram.botToken)
              : undefined,
            webhookSecret: settings.telegram.webhookSecret
              ? encryptSecret(settings.telegram.webhookSecret)
              : undefined,
          }
        : settings.telegram,
    };
    await db
      .update(schema.users)
      .set({ settings: JSON.stringify(migrated), updatedAt: new Date() })
      .where(eq(schema.users.id, targetUserId));
  }
  return settings;
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const parsedPatch = userSettingsSchema.partial().parse(patch);
  if (parsedPatch.ai?.baseURL && !isAllowedPersonalAiBaseUrl(parsedPatch.ai.baseURL)) {
    throw new Error("This AI base URL is not approved by the instance operator.");
  }

  const current = await getUserSettings();
  const next: UserSettings = {
    editor: { ...current.editor, ...parsedPatch.editor },
    ai: { ...current.ai, ...parsedPatch.ai },
    theme: { ...current.theme, ...parsedPatch.theme },
    googleCalendar: {
      ...current.googleCalendar,
      ...parsedPatch.googleCalendar,
    },
    telegram: {
      ...current.telegram,
      ...parsedPatch.telegram,
    },
    superFocus: { ...current.superFocus, ...parsedPatch.superFocus },
    tts: { ...current.tts, ...parsedPatch.tts },
    notifications: { ...current.notifications, ...parsedPatch.notifications },
  };

  const stored: UserSettings = {
    ...next,
    ai: next.ai?.apiKey
      ? { ...next.ai, apiKey: encryptSecret(next.ai.apiKey) }
      : next.ai,
    googleCalendar: next.googleCalendar?.accessToken
      ? {
          ...next.googleCalendar,
          accessToken: encryptSecret(next.googleCalendar.accessToken),
          refreshToken: next.googleCalendar.refreshToken
            ? encryptSecret(next.googleCalendar.refreshToken)
            : undefined,
        }
      : next.googleCalendar,
    telegram: next.telegram
      ? {
          ...next.telegram,
          botToken: next.telegram.botToken
            ? encryptSecret(next.telegram.botToken)
            : undefined,
          webhookSecret: next.telegram.webhookSecret
            ? encryptSecret(next.telegram.webhookSecret)
            : undefined,
        }
      : next.telegram,
  };

  await db
    .update(schema.users)
    .set({ settings: JSON.stringify(stored), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  return next;
}
