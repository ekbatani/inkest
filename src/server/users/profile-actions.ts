"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/server/db/client";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/server/auth";
import { updateUserSettings } from "@/server/users/settings-service";
import { slugify } from "@/lib/slug";

const ProfileSetupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  image: z.string().trim().optional(),
  bio: z.string().trim().max(200).optional(),
  workspaceName: z.string().trim().min(1, "Workspace name is required").max(100),
  themePreference: z.enum(["system", "light", "dark"]).optional(),
  themePalette: z
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
  themeFont: z
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
});

export type ProfileSetupInput = z.infer<typeof ProfileSetupSchema>;

export async function completeProfileSetupAction(
  input: ProfileSetupInput,
): Promise<{ error?: string; success?: boolean }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const parsed = ProfileSetupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid profile setup data.",
    };
  }

  const {
    name,
    image,
    bio,
    workspaceName,
    themePreference,
    themePalette,
    themeFont,
  } = parsed.data;

  // 1. Update user record (name and avatar image)
  await db
    .update(schema.users)
    .set({
      name: name || null,
      image: image || null,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, user.id));

  // 2. Update user's workspace name
  const existingWs = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.userId, user.id))
    .limit(1);

  if (existingWs.length > 0) {
    await db
      .update(schema.workspaces)
      .set({
        name: workspaceName,
        slug: slugify(workspaceName),
        updatedAt: new Date(),
      })
      .where(eq(schema.workspaces.id, existingWs[0].id));
  }

  // 3. Update settings JSON (profileCompleted: true, bio, theme preferences)
  await updateUserSettings({
    profileCompleted: true,
    bio: bio || undefined,
    theme: {
      preference: themePreference || "system",
      palette: themePalette || "paper",
      font: themeFont || "sans",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/notes");
  revalidatePath("/", "layout");

  return { success: true };
}
