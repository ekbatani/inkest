"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getUserSettings,
  updateUserSettings,
  type UserSettings,
} from "@/server/users/settings-service";
import { db, schema } from "@/server/db/client";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { verifyPassword } from "@/server/auth/password";
import { hashPassword } from "@/server/auth/password";
import { z } from "zod";
import { AI_PROVIDER_IDS } from "@/lib/ai/providers";

export async function getUserSettingsAction(): Promise<UserSettings> {
  const settings = await getUserSettings();
  // API keys are only decrypted for server-side provider resolution. Do not
  // return them from a Server Action, even to the account that saved them.
  return { ...settings, ai: { ...settings.ai, apiKey: undefined } };
}

export async function updateUserSettingsAction(patch: Partial<UserSettings>) {
  const next = await updateUserSettings(patch);
  revalidatePath("/settings");
  revalidatePath(`/notes`);
  return next;
}

export async function updateProfileAction(name: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const clean = name.trim().slice(0, 100);
  await db
    .update(schema.users)
    .set({ name: clean || null, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/settings");
}

export async function changePasswordAction(current: string, next: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const rows = await db
    .select({ passwordHash: schema.users.passwordHash })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);
  if (!rows[0]?.passwordHash) throw new Error("No password on account.");
  const ok = await verifyPassword(current, rows[0].passwordHash);
  if (!ok) throw new Error("Current password is incorrect.");
  if (next.length < 8) throw new Error("New password must be ≥ 8 characters.");
  const newHash = await hashPassword(next);
  await db
    .update(schema.users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(schema.users.id, user.id));
  revalidatePath("/settings");
}

export async function deleteAccountAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  // Cascade delete will remove all associated rows (notes, tags, tasks, …)
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  redirect("/");
}

const aiProviderInputSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  baseURL: z.string().trim().url("Enter a valid OpenAI-compatible URL.").optional().or(z.literal("")),
  model: z.string().trim().min(1, "Enter a model name.").max(200).optional().or(z.literal("")),
  apiKey: z.string().trim().max(512, "API key is unexpectedly long.").optional(),
});

export async function updateAiProviderSettingsAction(input: unknown) {
  const parsed = aiProviderInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Check the AI provider settings.");
  }

  const ai = parsed.data;
  const next = await updateUserSettings({
    ai: {
      provider: ai.provider,
      ...(ai.apiKey !== undefined ? { apiKey: ai.apiKey } : {}),
      ...(ai.baseURL ? { baseURL: ai.baseURL } : {}),
      ...(ai.model ? { model: ai.model } : {}),
    },
  });
  revalidatePath("/settings");
  return { provider: next.ai?.provider };
}

export async function clearAiProviderApiKeyAction() {
  await updateUserSettings({ ai: { apiKey: "" } });
  revalidatePath("/settings");
}
