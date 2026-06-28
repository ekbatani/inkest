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

export async function getUserSettingsAction(): Promise<UserSettings> {
  return getUserSettings();
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