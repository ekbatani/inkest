"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { openDailyNoteAction } from "./actions";

export function DailyOpener({ date }: { date?: string }) {
  const router = useRouter();

  React.useEffect(() => {
    let cancelled = false;

    React.startTransition(async () => {
      const noteId = await openDailyNoteAction(date);
      if (!cancelled) {
        router.replace(`/notes/${noteId}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [date, router]);

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <CalendarDays className="size-4" />
        <span>Opening daily note...</span>
      </div>
    </main>
  );
}
