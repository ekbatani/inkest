import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { updateUserSettings } from "@/server/users/settings-service";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  await updateUserSettings({
    googleCalendar: {
      accessToken: undefined,
      refreshToken: undefined,
      expiresAt: undefined,
      scope: undefined,
      connectedEmail: undefined,
    },
  });
  revalidatePath("/calendar");
  return NextResponse.redirect(new URL("/calendar?google=disconnected", request.url));
}
