import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { AppShell } from "@/components/app-shell/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

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

  return (
    <TooltipProvider delay={300}>
      <AppShell>{children}</AppShell>
    </TooltipProvider>
  );
}
