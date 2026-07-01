"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GoogleCalendarSyncButton({
  action,
  label = "Sync now",
  variant = "outline",
  size = "sm",
}: {
  action: () => Promise<{ importedCount: number; syncedAt: Date }>;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "xs";
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            const result = await action();
            toast.success(
              `Synced ${result.importedCount} calendar event${result.importedCount === 1 ? "" : "s"}.`,
            );
            router.refresh();
          } catch {
            toast.error(
              "Calendar sync failed. Check your Google connection and try again.",
            );
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      {label}
    </Button>
  );
}
