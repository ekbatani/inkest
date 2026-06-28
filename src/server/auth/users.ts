import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { hashPassword, verifyPassword } from "./password";
import { slugify, randomId } from "@/lib/slug";

export async function createUserWithWorkspace(
  email: string,
  password: string,
  name?: string,
) {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    return { error: "An account with this email already exists." } as const;
  }

  const passwordHash = await hashPassword(password);
  const userId = randomId();
  const workspaceId = randomId("ws");

  await db.insert(schema.users).values({
    id: userId,
    email: email.toLowerCase(),
    name: name?.trim() || null,
    passwordHash,
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
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);

  const user = rows[0];
  if (!user || !user.passwordHash) return null;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;

  return user;
}

export async function getWorkspaceForUser(userId: string) {
  const rows = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}
