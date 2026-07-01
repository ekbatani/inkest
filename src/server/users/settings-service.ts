import { eq } from "drizzle-orm";
import { z } from "zod";
import { AI_PROVIDER_IDS } from "@/lib/ai/providers";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";

export const editorModeEnum = z.enum(["edit", "split", "preview", "focus"]);
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
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

const DEFAULTS: UserSettings = {
  editor: {
    defaultMode: "edit",
    autosaveDelayMs: 1500,
    showLineNumbers: false,
  },
  ai: {},
  theme: { preference: "system" },
  googleCalendar: {},
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
  return mergeWithDefaults(parse(rows[0]?.settings ?? null));
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
  };

  await db
    .update(schema.users)
    .set({ settings: JSON.stringify(next), updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));

  return next;
}
