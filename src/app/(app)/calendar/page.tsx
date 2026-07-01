import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
} from "lucide-react";
import { GoogleCalendarSyncButton } from "@/components/calendar/google-calendar-sync-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GoogleCalendarEvent } from "@/server/db/schema";
import {
  formatDateKey,
  formatMonthKey,
  getGoogleCalendarStatus,
  listCalendarEventsForRange,
  parseDateKey,
  parseMonthKey,
} from "@/server/calendar/service";
import { syncGoogleCalendarMonthAction } from "./actions";

function toDayMap(events: GoogleCalendarEvent[]) {
  const map = new Map<string, GoogleCalendarEvent[]>();

  for (const event of events) {
    const cursor = new Date(event.startsAt);
    cursor.setHours(0, 0, 0, 0);

    const endMarker = new Date(event.endsAt);
    endMarker.setHours(0, 0, 0, 0);
    const inclusiveLast = event.allDay ? addDays(endMarker, -1) : endMarker;

    while (cursor <= inclusiveLast) {
      const key = formatDateKey(cursor);
      const current = map.get(key) ?? [];
      current.push(event);
      map.set(key, current);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return map;
}

function formatEventTime(event: GoogleCalendarEvent) {
  if (event.allDay) return "All day";
  return `${format(event.startsAt, "h:mm a")} - ${format(event.endsAt, "h:mm a")}`;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    date?: string;
    connected?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedDate = parseDateKey(params.date) ?? new Date();
  const monthDate =
    parseMonthKey(params.month) ??
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const [status, events] = await Promise.all([
    getGoogleCalendarStatus(),
    listCalendarEventsForRange(gridStart, addDays(gridEnd, 1)),
  ]);
  const eventsByDay = toDayMap(events);
  const selectedKey = formatDateKey(selectedDate);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const prevMonth = formatMonthKey(subMonths(monthStart, 1));
  const nextMonth = formatMonthKey(addMonths(monthStart, 1));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <span>Calendar</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {format(monthStart, "MMMM yyyy")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sync your Google Calendar, browse the month, and jump straight into
            each day&apos;s note.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status.connected ? (
            <>
              {status.googleEmail && <Badge variant="outline">{status.googleEmail}</Badge>}
              <GoogleCalendarSyncButton
                action={() => syncGoogleCalendarMonthAction(formatMonthKey(monthStart))}
                label="Sync month"
              />
            </>
          ) : status.configured ? (
            <Button
              nativeButton={false}
              render={<a href="/api/calendar/google/connect" />}
              className="gap-1.5"
            >
              <Link2 className="size-4" />
              Connect Google Calendar
            </Button>
          ) : (
            <Badge variant="outline">Google Calendar not configured</Badge>
          )}
        </div>
      </header>

      {params.connected === "1" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Google Calendar connected. Run a sync to pull your latest events into
          InkNest.
        </div>
      )}

      {params.error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {params.error === "google-calendar-not-configured" &&
            "Google Calendar OAuth is not configured yet."}
          {params.error === "google-calendar-access-denied" &&
            "Google Calendar access was cancelled."}
          {params.error === "google-calendar-invalid-state" &&
            "The Google Calendar connection could not be verified. Please try again."}
          {params.error === "google-calendar-connect-failed" &&
            "Google Calendar connection failed. Please retry after checking your OAuth credentials."}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(22rem,1fr)]">
        <Card className="min-h-[38rem]">
          <CardHeader className="border-b border-border/70">
            <div>
              <CardTitle>Month view</CardTitle>
              <CardDescription>
                Pick a day to preview synced events and open its daily note.
              </CardDescription>
            </div>
            <CardAction>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  nativeButton={false}
                  render={<Link href={`/calendar?month=${prevMonth}&date=${selectedKey}`} />}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  nativeButton={false}
                  render={<Link href={`/calendar?month=${nextMonth}&date=${selectedKey}`} />}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1 pt-5">
            <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
                <div key={label} className="py-2">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-2">
              {monthDays.map((day) => {
                const key = formatDateKey(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                const isSelected = isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, monthStart);

                return (
                  <Link
                    key={key}
                    href={`/calendar?month=${formatMonthKey(monthStart)}&date=${key}`}
                    className={cn(
                      "group rounded-2xl border p-3 transition",
                      isSelected
                        ? "border-foreground/25 bg-foreground/[0.04] shadow-sm"
                        : "border-border/70 bg-background hover:border-foreground/15 hover:bg-muted/25",
                      !inMonth && "opacity-55",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{format(day, "d")}</span>
                      {dayEvents.length > 0 && (
                        <Badge variant="outline">{dayEvents.length}</Badge>
                      )}
                    </div>
                    <div className="mt-3 space-y-1.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className="truncate rounded-lg bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground"
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[11px] text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[38rem]">
          <CardHeader className="border-b border-border/70">
            <div>
              <CardTitle>{format(selectedDate, "EEEE, MMMM d")}</CardTitle>
              <CardDescription>
                {status.connected
                  ? "Your synced agenda for the selected day."
                  : "Connect Google Calendar to bring your day into InkNest."}
              </CardDescription>
            </div>
            <CardAction>
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link href={`/daily?date=${selectedKey}`} />}
              >
                <CalendarDays className="size-4" />
                Open daily note
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4 pt-5">
            {status.lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Last synced {format(status.lastSyncedAt, "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}

            {!status.configured && (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                Add `GOOGLE_OAUTH_CLIENT_ID` and
                `GOOGLE_OAUTH_CLIENT_SECRET` to turn on Google Calendar sync.
              </div>
            )}

            {status.configured && !status.connected && (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                Connect your Google account to import calendar events here and
                inside each daily note.
              </div>
            )}

            {status.connected && selectedEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                No synced events for this day yet.
              </div>
            )}

            {selectedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-border/70 bg-muted/15 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">{event.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {formatEventTime(event)}
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
                  <p className="mt-3 text-sm text-muted-foreground">{event.location}</p>
                )}
                {event.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
