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

export const superFocusTrackingModeEnum = z.enum(["pointer", "auto"]);
export const aiProviderSettingsSchema = z
  .object({
    provider: z.enum(AI_PROVIDER_IDS).optional(),
    apiKey: z.string().optional(),
    baseURL: z.string().url().optional().or(z.literal("")),
    model: z.string().optional(),
  })
  .partial();

export const userSettingsSchema = z.object({
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
      palette: z.enum(["paper", "forest", "violet"]).optional(),
      font: z.enum(["sans", "serif", "persian"]).optional(),
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
      aiResults: z.boolean().optional(),
      taskDueReminders: z.boolean().optional(),
      dailyNoteNudge: z.boolean().optional(),
    })
    .optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

const DEFAULTS: UserSettings = {
  editor: {
    autosaveDelayMs: 1500,
    showLineNumbers: false,
    pasteToPreview: true,
    spellcheck: true,
    spellcheckLanguage: "auto",
  },
  ai: {},
  theme: { preference: "system", palette: "paper", font: "sans" },
  googleCalendar: {},
  superFocus: { trackingMode: "pointer", radius: 1 },
  tts: { rate: 1 },
  notifications: {
    inApp: true,
    aiResults: true,
    taskDueReminders: false,
    dailyNoteNudge: false,
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

export async function getUserSettings(): Promise<UserSettings> {
  const user = await getCurrentUser();
  if (!user) return DEFAULTS;
  const rows = await db
    .select({ settings: schema.users.settings })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
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
    };
    await db
      .update(schema.users)
      .set({ settings: JSON.stringify(migrated), updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));
  }
  return settings;
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const current = await getUserSettings();
  const next: UserSettings = {
    editor: { ...current.editor, ...patch.editor },
    ai: { ...current.ai, ...patch.ai },
    theme: { ...current.theme, ...patch.theme },
    googleCalendar: {
      ...current.googleCalendar,
      ...patch.googleCalendar,
    },
    superFocus: { ...current.superFocus, ...patch.superFocus },
    tts: { ...current.tts, ...patch.tts },
    notifications: { ...current.notifications, ...patch.notifications },
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
  };

  await db
    .update(schema.users)
    .set({ settings: JSON.stringify(stored), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  return next;
}
