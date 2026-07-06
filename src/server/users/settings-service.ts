import { eq } from "drizzle-orm";
import { z } from "zod";
import { AI_PROVIDER_IDS } from "@/lib/ai/providers";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { decryptSecret, encryptSecret } from "@/server/crypto/secret-box";

export const editorModeEnum = z.enum(["edit", "split", "preview", "focus"]);
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
      defaultMode: editorModeEnum.optional(),
      autosaveDelayMs: z.number().int().min(0).max(60_000).optional(),
      showLineNumbers: z.boolean().optional(),
      pasteToPreview: z.boolean().optional(),
    })
    .optional(),
  ai: aiProviderSettingsSchema.optional(),
  theme: z
    .object({
      // "system" | "light" | "dark" hands this to next-themes on mount.
      preference: z.enum(["system", "light", "dark"]).optional(),
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
      aiResults: z.boolean().optional(),
      taskDueReminders: z.boolean().optional(),
      dailyNoteNudge: z.boolean().optional(),
    })
    .optional(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

const DEFAULTS: UserSettings = {
  editor: {
    defaultMode: "edit",
    autosaveDelayMs: 1500,
    showLineNumbers: false,
    pasteToPreview: true,
  },
  ai: {},
  theme: { preference: "system" },
  googleCalendar: {},
  superFocus: { trackingMode: "pointer", radius: 1 },
  tts: { rate: 1 },
  notifications: {
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
  const settings = mergeWithDefaults(parse(rows[0]?.settings ?? null));
  if (settings.ai?.apiKey) {
    try {
      settings.ai = { ...settings.ai, apiKey: decryptSecret(settings.ai.apiKey) };
    } catch {
      // NEXTAUTH_SECRET rotated or the value is corrupt — treat the stored key as unusable
      // rather than crashing the settings page or leaking ciphertext into the UI.
      settings.ai = { ...settings.ai, apiKey: "" };
    }
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

  const stored: UserSettings = next.ai?.apiKey
    ? { ...next, ai: { ...next.ai, apiKey: encryptSecret(next.ai.apiKey) } }
    : next;

  await db
    .update(schema.users)
    .set({ settings: JSON.stringify(stored), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  return next;
}
