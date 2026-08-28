import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { hashPassword, verifyPassword } from "./password";
import { slugify, randomId } from "@/lib/slug";
import { getAdminEmails } from "@/server/config/deployment";

export async function createUserWithWorkspace(
  email: string,
  password: string,
  name?: string,
  role: "admin" | "user" = "user",
) {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    return {
      error: "An account with this email already exists. Try signing in instead.",
      code: "email-exists",
    } as const;
  }

  const adminEmails = getAdminEmails();
  const effectiveRole = adminEmails.includes(normalizedEmail) ? "admin" : role;

  const passwordHash = await hashPassword(password);
  const userId = randomId();
  const workspaceId = randomId("ws");

  await db.insert(schema.users).values({
    id: userId,
    email: normalizedEmail,
    name: name?.trim() || null,
    passwordHash,
    role: effectiveRole,
    status: "active",
  });

  await db.insert(schema.workspaces).values({
    id: workspaceId,
    userId,
    name: "Personal",
    slug: slugify("Personal"),
  });

  return { userId, workspaceId } as const;
}

export async function verifyCredentials(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  const user = rows[0];
  if (!user || !user.passwordHash) return null;

  // Block suspended accounts from logging in
  if (user.status === "suspended") {
    return null;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  const adminEmails = getAdminEmails();
  if (adminEmails.includes(normalizedEmail) && user.role !== "admin") {
    // Elevate admin if configured in env
    await db
      .update(schema.users)
      .set({ role: "admin" })
      .where(eq(schema.users.id, user.id));
    user.role = "admin";
  }

  return user;
}

export async function hasAccountWithEmail(email: string) {
  const rows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email.trim().toLowerCase()))
    .limit(1);

  return rows.length > 0;
}

export async function getWorkspaceForUser(userId: string) {
  const rows = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}
