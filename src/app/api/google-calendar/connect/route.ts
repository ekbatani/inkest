import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getGoogleCalendarAuthUrl } from "@/server/calendar/google-calendar";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("google-calendar-oauth-state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });

  try {
    return NextResponse.redirect(getGoogleCalendarAuthUrl(state));
  } catch {
    return NextResponse.redirect(new URL("/calendar?google=not-configured", request.url));
  }
}
