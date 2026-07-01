import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectGoogleCalendarWithCode } from "@/server/calendar/service";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_calendar_oauth_state")?.value;
  const redirectUrl = new URL("/calendar", request.url);

  if (error) {
    redirectUrl.searchParams.set("error", "google-calendar-access-denied");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("google_calendar_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: requestUrl.protocol === "https:",
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    redirectUrl.searchParams.set("error", "google-calendar-invalid-state");
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("google_calendar_oauth_state", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: requestUrl.protocol === "https:",
      maxAge: 0,
      path: "/",
    });
    return response;
  }

  try {
    await connectGoogleCalendarWithCode(code);
    redirectUrl.searchParams.set("connected", "1");
  } catch {
    redirectUrl.searchParams.set("error", "google-calendar-connect-failed");
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("google_calendar_oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: requestUrl.protocol === "https:",
    maxAge: 0,
    path: "/",
  });
  return response;
}
