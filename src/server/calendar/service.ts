import { and, asc, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_SCOPE = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GoogleCalendarApiEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  updated?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
};

async function getContext() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) throw new Error("NO_WORKSPACE");

  return { user, workspace };
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatMonthKey(date: Date) {
  return formatDateKey(date).slice(0, 7);
}

export function parseDateKey(dateKey?: string | null) {
  if (!dateKey || !DATE_KEY_RE.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function parseMonthKey(monthKey?: string | null) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return null;
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, amount: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function getGoogleCalendarConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const appUrl = process.env.NEXTAUTH_URL;

  if (!clientId || !clientSecret || !appUrl) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    appUrl,
    redirectUri: new URL("/api/calendar/google/callback", appUrl).toString(),
  };
}

async function getConnectionRow(userId: string) {
  const rows = await db
    .select()
    .from(schema.googleCalendarConnections)
    .where(eq(schema.googleCalendarConnections.userId, userId))
    .limit(1);

  return rows[0] ?? null;
}

async function exchangeCodeForTokens(code: string) {
  const config = getGoogleCalendarConfig();
  if (!config) throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function refreshAccessToken(refreshToken: string) {
  const config = getGoogleCalendarConfig();
  if (!config) throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("GOOGLE_TOKEN_REFRESH_FAILED");
  }

  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("GOOGLE_PROFILE_FETCH_FAILED");
  }

  return (await response.json()) as { email?: string };
}

async function getValidAccessToken(
  connection: typeof schema.googleCalendarConnections.$inferSelect,
) {
  const now = Date.now();
  const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0;

  if (connection.accessToken && expiresAt - now > 60_000) {
    return connection.accessToken;
  }

  if (!connection.refreshToken) {
    throw new Error("GOOGLE_CALENDAR_RECONNECT_REQUIRED");
  }

  const refreshed = await refreshAccessToken(connection.refreshToken);
  const accessTokenExpiresAt = refreshed.expires_in
    ? new Date(now + refreshed.expires_in * 1000)
    : connection.accessTokenExpiresAt;

  await db
    .update(schema.googleCalendarConnections)
    .set({
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? connection.refreshToken,
      tokenType: refreshed.token_type ?? connection.tokenType,
      scope: refreshed.scope ?? connection.scope,
      accessTokenExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.googleCalendarConnections.id, connection.id));

  return refreshed.access_token;
}

function eventBoundaryToDate(
  boundary: GoogleCalendarApiEvent["start"] | GoogleCalendarApiEvent["end"],
) {
  if (!boundary) return null;
  if (boundary.dateTime) return new Date(boundary.dateTime);
  if (boundary.date) return parseDateKey(boundary.date);
  return null;
}

async function fetchGoogleCalendarEvents(
  accessToken: string,
  calendarId: string,
  start: Date,
  endExclusive: Date,
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("showDeleted", "true");
  url.searchParams.set("maxResults", "2500");
  url.searchParams.set("timeMin", start.toISOString());
  url.searchParams.set("timeMax", endExclusive.toISOString());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("GOOGLE_CALENDAR_FETCH_FAILED");
  }

  const json = (await response.json()) as { items?: GoogleCalendarApiEvent[] };
  return json.items ?? [];
}

export async function getGoogleCalendarStatus() {
  const configured = Boolean(getGoogleCalendarConfig());

  try {
    const { user } = await getContext();
    const connection = await getConnectionRow(user.id);

    return {
      configured,
      connected: Boolean(connection),
      googleEmail: connection?.googleEmail ?? null,
      lastSyncedAt: connection?.lastSyncedAt ?? null,
      calendarId: connection?.calendarId ?? "primary",
    };
  } catch {
    return {
      configured,
      connected: false,
      googleEmail: null,
      lastSyncedAt: null,
      calendarId: "primary",
    };
  }
}

export async function buildGoogleCalendarAuthUrl(state: string) {
  const config = getGoogleCalendarConfig();
  if (!config) throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function connectGoogleCalendarWithCode(code: string) {
  const { user, workspace } = await getContext();
  const existing = await getConnectionRow(user.id);
  const tokens = await exchangeCodeForTokens(code);
  const profile = await fetchGoogleProfile(tokens.access_token);
  const accessTokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  if (existing) {
    await db
      .update(schema.googleCalendarConnections)
      .set({
        googleEmail: profile.email ?? existing.googleEmail,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existing.refreshToken,
        tokenType: tokens.token_type ?? existing.tokenType,
        scope: tokens.scope ?? existing.scope,
        accessTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.googleCalendarConnections.id, existing.id));
    return existing.id;
  }

  const id = randomId("gcal");
  await db.insert(schema.googleCalendarConnections).values({
    id,
    userId: user.id,
    workspaceId: workspace.id,
    googleEmail: profile.email ?? null,
    calendarId: "primary",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    tokenType: tokens.token_type ?? null,
    scope: tokens.scope ?? null,
    accessTokenExpiresAt,
  });

  return id;
}

export async function syncGoogleCalendarRange(start: Date, endExclusive: Date) {
  const { user, workspace } = await getContext();
  const connection = await getConnectionRow(user.id);
  if (!connection) throw new Error("GOOGLE_CALENDAR_NOT_CONNECTED");

  const accessToken = await getValidAccessToken(connection);
  const googleEvents = await fetchGoogleCalendarEvents(
    accessToken,
    connection.calendarId,
    start,
    endExclusive,
  );
  const syncedAt = new Date();

  await db
    .delete(schema.googleCalendarEvents)
    .where(
      and(
        eq(schema.googleCalendarEvents.userId, user.id),
        eq(schema.googleCalendarEvents.calendarId, connection.calendarId),
        lt(schema.googleCalendarEvents.startsAt, endExclusive),
        gt(schema.googleCalendarEvents.endsAt, start),
      ),
    );

  const rows = googleEvents
    .filter((event) => event.id && event.status !== "cancelled")
    .map((event) => {
      const startsAt = eventBoundaryToDate(event.start);
      const endsAt = eventBoundaryToDate(event.end);
      if (!startsAt || !endsAt) return null;

      return {
        id: randomId("gcalevt"),
        userId: user.id,
        workspaceId: workspace.id,
        connectionId: connection.id,
        externalKey: `${user.id}:${connection.calendarId}:${event.id}`,
        googleEventId: event.id!,
        calendarId: connection.calendarId,
        title: event.summary?.trim() || "Untitled event",
        description: event.description ?? null,
        location: event.location ?? null,
        htmlLink: event.htmlLink ?? null,
        status: event.status ?? null,
        startsAt,
        endsAt,
        allDay: Boolean(event.start?.date && !event.start?.dateTime),
        sourceUpdatedAt: event.updated ?? null,
        syncedAt,
      };
    })
    .filter((event): event is NonNullable<typeof event> => Boolean(event));

  if (rows.length > 0) {
    await db.insert(schema.googleCalendarEvents).values(rows);
  }

  await db
    .update(schema.googleCalendarConnections)
    .set({
      lastSyncedAt: syncedAt,
      updatedAt: syncedAt,
    })
    .where(eq(schema.googleCalendarConnections.id, connection.id));

  return {
    syncedAt,
    importedCount: rows.length,
  };
}

export async function listCalendarEventsForRange(start: Date, endExclusive: Date) {
  const { user } = await getContext();

  return db
    .select()
    .from(schema.googleCalendarEvents)
    .where(
      and(
        eq(schema.googleCalendarEvents.userId, user.id),
        lt(schema.googleCalendarEvents.startsAt, endExclusive),
        gt(schema.googleCalendarEvents.endsAt, start),
      ),
    )
    .orderBy(
      asc(schema.googleCalendarEvents.startsAt),
      asc(schema.googleCalendarEvents.endsAt),
    );
}

export async function listCalendarEventsForDay(date: Date) {
  const { user } = await getContext();
  const start = startOfDay(date);
  const endExclusive = addDays(start, 1);

  return db
    .select()
    .from(schema.googleCalendarEvents)
    .where(
      and(
        eq(schema.googleCalendarEvents.userId, user.id),
        lt(schema.googleCalendarEvents.startsAt, endExclusive),
        gt(schema.googleCalendarEvents.endsAt, start),
      ),
    )
    .orderBy(
      asc(schema.googleCalendarEvents.startsAt),
      asc(schema.googleCalendarEvents.endsAt),
    );
}
