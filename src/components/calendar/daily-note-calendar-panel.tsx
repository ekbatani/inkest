"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, Clock3, ExternalLink, Link2 } from "lucide-react";
import { syncGoogleCalendarDayAction } from "@/app/(app)/calendar/actions";
import { GoogleCalendarSyncButton } from "@/components/calendar/google-calendar-sync-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GoogleCalendarEvent } from "@/server/db/schema";

type CalendarStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  lastSyncedAt: Date | null;
};

function formatEventTime(event: GoogleCalendarEvent) {
  if (event.allDay) return "All day";
  return `${format(event.startsAt, "h:mm a")} - ${format(event.endsAt, "h:mm a")}`;
}

export function DailyNoteCalendarPanel({
  dateKey,
  events,
  status,
}: {
  dateKey: string;
  events: GoogleCalendarEvent[];
  status: CalendarStatus;
}) {
  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Daily agenda
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Synced events for {dateKey}
          </p>
        </div>
        {status.connected ? (
          <GoogleCalendarSyncButton
            action={() => syncGoogleCalendarDayAction(dateKey)}
            label="Sync day"
            size="xs"
          />
        ) : status.configured ? (
          <Button
            variant="outline"
            size="xs"
            nativeButton={false}
            render={<a href="/api/calendar/google/connect" />}
          >
            <Link2 className="size-3.5" />
            Connect
          </Button>
        ) : null}
      </div>

      {status.connected && status.googleEmail && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{status.googleEmail}</Badge>
          <Link
            href="/calendar"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Open calendar
          </Link>
        </div>
      )}

      {!status.configured && (
        <p className="text-xs text-muted-foreground">
          Add `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` to
          enable Google Calendar sync.
        </p>
      )}

      {status.configured && !status.connected && (
        <p className="text-xs text-muted-foreground">
          Connect your Google account to pull events into this daily note.
        </p>
      )}

      {status.connected && events.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
          No synced events for this day yet.
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-border/70 bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-foreground">{event.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    {event.allDay ? (
                      <CalendarDays className="size-3.5" />
                    ) : (
                      <Clock3 className="size-3.5" />
                    )}
                    <span>{formatEventTime(event)}</span>
                  </div>
                </div>
                {event.htmlLink && (
                  <Link
                    href={event.htmlLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="size-4" />
                  </Link>
                )}
              </div>
              {event.location && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {event.location}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
