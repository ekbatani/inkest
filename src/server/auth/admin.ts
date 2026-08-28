import { getCurrentUser } from "@/server/auth";
import { isCloudDeployment, getAdminEmails } from "@/server/config/deployment";
import { db, schema } from "@/server/db/client";
import { eq } from "drizzle-orm";

export class AdminAccessError extends Error {
  constructor(
    message: string = "Admin access restricted",
    public code: "NOT_CLOUD" | "UNAUTHENTICATED" | "FORBIDDEN" | "SUSPENDED" = "FORBIDDEN",
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

/**
 * Checks if the current environment and user allow admin actions.
 */
export async function isAdmin(): Promise<boolean> {
  if (!isCloudDeployment()) {
    return false;
  }

  const user = await getCurrentUser();
  if (!user || user.status === "suspended") {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const adminEmails = getAdminEmails();
  if (adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  // Also double check database if user record was upgraded
  const dbUser = await db
    .select({ role: schema.users.role, status: schema.users.status })
    .from(schema.users)
    .where(eq(schema.users.id, user.id))
    .limit(1);

  if (dbUser[0]?.status === "suspended") {
    return false;
  }

  return dbUser[0]?.role === "admin";
}

/**
 * Asserts that the current session is in a cloud deployment and is an active admin.
 * Throws AdminAccessError if any check fails.
 */
export async function requireAdminUser() {
  if (!isCloudDeployment()) {
    throw new AdminAccessError(
      "Admin user management is only available in cloud environments.",
      "NOT_CLOUD",
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new AdminAccessError("You must be signed in to perform this action.", "UNAUTHENTICATED");
  }

  if (user.status === "suspended") {
    throw new AdminAccessError("Your account has been suspended.", "SUSPENDED");
  }

  const adminEmails = getAdminEmails();
  const isEnvAdmin = adminEmails.includes(user.email.toLowerCase());

  let isDbAdmin = user.role === "admin";
  if (!isDbAdmin) {
    const dbUser = await db
      .select({ role: schema.users.role, status: schema.users.status })
      .from(schema.users)
      .where(eq(schema.users.id, user.id))
      .limit(1);

    if (dbUser[0]?.status === "suspended") {
      throw new AdminAccessError("Your account has been suspended.", "SUSPENDED");
    }

    isDbAdmin = dbUser[0]?.role === "admin";
  }

  if (!isDbAdmin && !isEnvAdmin) {
    throw new AdminAccessError("Forbidden: Administrator privileges required.", "FORBIDDEN");
  }

  return user;
}
