"use server";

import { revalidatePath } from "next/cache";
import {
  formatDateKey,
  syncGoogleCalendarRange,
  parseDateKey,
  parseMonthKey,
} from "@/server/calendar/service";

function monthBounds(monthKey?: string) {
  const anchor = parseMonthKey(monthKey) ?? new Date();
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const endExclusive = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
  return { start, endExclusive };
}

function dayBounds(dateKey?: string) {
  const anchor = parseDateKey(dateKey) ?? new Date();
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  const endExclusive = new Date(
    anchor.getFullYear(),
    anchor.getMonth(),
    anchor.getDate() + 1,
  );
  return { start, endExclusive };
}

export async function syncGoogleCalendarMonthAction(monthKey?: string) {
  const { start, endExclusive } = monthBounds(monthKey);
  const result = await syncGoogleCalendarRange(start, endExclusive);
  revalidatePath("/calendar");
  return {
    ...result,
    month: formatDateKey(start).slice(0, 7),
  };
}

export async function syncGoogleCalendarDayAction(dateKey?: string) {
  const { start, endExclusive } = dayBounds(dateKey);
  const result = await syncGoogleCalendarRange(start, endExclusive);
  revalidatePath("/calendar");
  return {
    ...result,
    date: formatDateKey(start),
  };
}
