import { getServerSession as _getServerSession } from "next-auth";
import { authOptions } from "./config";
import type { Session } from "next-auth";
import { getActiveAuthContext } from "./context";
import { db, schema } from "@/server/db/client";
import { eq } from "drizzle-orm";

export async function getServerSession(): Promise<Session | null> {
  try {
    return await _getServerSession(authOptions);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name?: string | null;
  role?: "admin" | "user";
  status?: "active" | "suspended";
} | null> {
  const activeContext = getActiveAuthContext();
  if (activeContext?.userId) {
    const rows = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        status: schema.users.status,
      })
      .from(schema.users)
      .where(eq(schema.users.id, activeContext.userId))
      .limit(1);

    if (rows[0]) {
      return {
        id: rows[0].id,
        email: rows[0].email,
        name: rows[0].name,
        role: rows[0].role ?? "user",
        status: rows[0].status ?? "active",
      };
    }
  }

  const session = await getServerSession();
  if (!session?.user) return null;
  const user = session.user as {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: "admin" | "user";
    status?: "active" | "suspended";
  };
  const id = user.id;
  if (!id) return null;
  return {
    id,
    email: user.email ?? "",
    name: user.name,
    role: user.role ?? "user",
    status: user.status ?? "active",
  };
}
