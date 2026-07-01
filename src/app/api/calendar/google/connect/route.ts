import { NextResponse } from "next/server";
import { randomId } from "@/lib/slug";
import { getCurrentUser } from "@/server/auth";
import { buildGoogleCalendarAuthUrl } from "@/server/calendar/service";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    const signinUrl = new URL("/signin", request.url);
    signinUrl.searchParams.set("callbackUrl", "/calendar");
    return NextResponse.redirect(signinUrl);
  }

  try {
    const state = randomId("gcal_state");
    const authUrl = await buildGoogleCalendarAuthUrl(state);
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("google_calendar_oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      maxAge: 60 * 10,
      path: "/",
    });
    return response;
  } catch {
    const calendarUrl = new URL("/calendar", request.url);
    calendarUrl.searchParams.set("error", "google-calendar-not-configured");
    return NextResponse.redirect(calendarUrl);
  }
}
