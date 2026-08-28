import { getServerSession as _getServerSession } from "next-auth";
import { authOptions } from "./config";
import type { Session } from "next-auth";

export async function getServerSession(): Promise<Session | null> {
  return _getServerSession(authOptions);
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  name?: string | null;
  role?: "admin" | "user";
  status?: "active" | "suspended";
} | null> {
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
