"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoteError({
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
      <h2 className="text-lg font-semibold">Failed to load note</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        This note could not be loaded. It may have been deleted or you may not
        have access.
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/notes" />}
          className="gap-2"
        >
          <ArrowLeft className="size-4" /> Back to notes
        </Button>
        <Button onClick={unstable_retry} className="gap-2">
          <RotateCcw className="size-4" /> Try again
        </Button>
      </div>
    </div>
  );
}
