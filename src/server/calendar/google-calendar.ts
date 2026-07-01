import { updateUserSettings, type UserSettings } from "@/server/users/settings-service";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export type GoogleCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  htmlLink?: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type GoogleEventItem = {
  id?: string;
  summary?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

function getConfig() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

  return { clientId, clientSecret, redirectUri };
}

export function isGoogleCalendarConfigured() {
  const { clientId, clientSecret, redirectUri } = getConfig();
  return Boolean(clientId && clientSecret && redirectUri);
}

export function getGoogleCalendarAuthUrl(state: string) {
  const { clientId, redirectUri } = getConfig();
  if (!clientId || !redirectUri) {
    throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

async function requestToken(body: URLSearchParams) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || json.error || !json.access_token) {
    throw new Error(json.error_description || json.error || "GOOGLE_TOKEN_FAILED");
  }
  return json;
}

async function fetchConnectedEmail(accessToken: string) {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return undefined;
  const json = (await res.json()) as { email?: string };
  return json.email;
}

export async function exchangeGoogleCalendarCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getConfig();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");
  }

  const token = await requestToken(
    new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );
  const connectedEmail = token.access_token
    ? await fetchConnectedEmail(token.access_token)
    : undefined;

  await updateUserSettings({
    googleCalendar: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      scope: token.scope,
      connectedEmail,
    },
  });
}

async function refreshAccessToken(settings: UserSettings) {
  const refreshToken = settings.googleCalendar?.refreshToken;
  const { clientId, clientSecret } = getConfig();
  if (!refreshToken || !clientId || !clientSecret) return null;

  const token = await requestToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  );

  await updateUserSettings({
    googleCalendar: {
      ...settings.googleCalendar,
      accessToken: token.access_token,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      scope: token.scope ?? settings.googleCalendar?.scope,
    },
  });

  return token.access_token ?? null;
}

async function getAccessToken(settings: UserSettings) {
  const accessToken = settings.googleCalendar?.accessToken;
  const expiresAt = settings.googleCalendar?.expiresAt ?? 0;
  if (accessToken && expiresAt > Date.now() + 60_000) return accessToken;
  return refreshAccessToken(settings);
}

function parseGoogleEventDate(value?: { date?: string; dateTime?: string }) {
  if (value?.dateTime) {
    return { date: new Date(value.dateTime), allDay: false };
  }
  if (value?.date) {
    const [year, month, day] = value.date.split("-").map(Number);
    return { date: new Date(year, month - 1, day), allDay: true };
  }
  return null;
}

export async function listGoogleCalendarEvents(
  settings: UserSettings,
  start: Date,
  end: Date,
): Promise<GoogleCalendarEvent[]> {
  if (!isGoogleCalendarConfigured() || !settings.googleCalendar?.refreshToken) {
    return [];
  }

  const accessToken = await getAccessToken(settings);
  if (!accessToken) return [];

  const params = new URLSearchParams({
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(`${GOOGLE_EVENTS_URL}?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return [];

  const json = (await res.json()) as { items?: GoogleEventItem[] };
  return (json.items ?? [])
    .map((event): GoogleCalendarEvent | null => {
      const startDate = parseGoogleEventDate(event.start);
      if (!event.id || !startDate) return null;
      const endDate = parseGoogleEventDate(event.end);
      const mapped: GoogleCalendarEvent = {
        id: event.id,
        title: event.summary || "Untitled event",
        start: startDate.date,
        end: endDate?.date ?? null,
        allDay: startDate.allDay,
      };
      if (event.htmlLink) mapped.htmlLink = event.htmlLink;
      return mapped;
    })
    .filter((event): event is GoogleCalendarEvent => Boolean(event));
}
