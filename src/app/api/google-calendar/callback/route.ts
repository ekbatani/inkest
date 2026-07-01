import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { exchangeGoogleCalendarCode } from "@/server/calendar/google-calendar";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google-calendar-oauth-state")?.value;
  cookieStore.delete("google-calendar-oauth-state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/calendar?google=failed", request.url));
  }

  try {
    await exchangeGoogleCalendarCode(code);
    return NextResponse.redirect(new URL("/calendar?google=connected", request.url));
  } catch {
    return NextResponse.redirect(new URL("/calendar?google=failed", request.url));
  }
}
