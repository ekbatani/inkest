import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { AppShell } from "@/components/app-shell/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }

  return <AppShell>{children}</AppShell>;
}

