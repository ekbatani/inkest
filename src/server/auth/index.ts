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
} | null> {
  const session = await getServerSession();
  if (!session?.user) return null;
  const id = (session.user as { id?: string }).id;
  if (!id) return null;
  return {
    id,
    email: session.user.email ?? "",
    name: session.user.name,
  };
}
