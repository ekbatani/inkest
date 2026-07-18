"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { openDailyNoteAction } from "./actions";

export function DailyOpener({ date }: { date?: string }) {
  const router = useRouter();
  const dateKey = date ?? "today";
  const [failedDateKey, setFailedDateKey] = React.useState<string | null>(null);
  const error = failedDateKey === dateKey;

  React.useEffect(() => {
    let cancelled = false;

    React.startTransition(async () => {
      try {
        const noteId = await openDailyNoteAction(date);
        if (!cancelled) {
          router.replace(`/notes/${noteId}`);
        }
      } catch {
        if (!cancelled) {
          setFailedDateKey(dateKey);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [date, dateKey, router]);

  if (error) {
    return (
      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
        <div className="max-w-sm rounded-2xl border border-border/70 bg-muted/20 p-5 text-center">
          <h1 className="font-semibold">Daily note could not open</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please retry from Calendar. Your existing notes were not changed.
          </p>
          <a href="/calendar" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
            Open calendar
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-live="polite">
        <CalendarDays className="size-4" />
        <span>Opening daily note...</span>
      </div>
    </main>
  );
}
