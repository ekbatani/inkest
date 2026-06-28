"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        An unexpected error occurred. You can try again or navigate back.
      </p>
      <Button onClick={unstable_retry} className="gap-2">
        <RotateCcw className="size-4" /> Try again
      </Button>
    </div>
  );
}
