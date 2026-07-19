export const DIAGNOSTIC_RETENTION_DAYS = Number.parseInt(
  process.env.DIAGNOSTICS_RETENTION_DAYS ?? "30",
  10,
);

export type ClientDiagnostic = {
  surface: "app" | "note" | "project";
  digest?: string;
};

function safeRetentionDays() {
  return Number.isSafeInteger(DIAGNOSTIC_RETENTION_DAYS) &&
    DIAGNOSTIC_RETENTION_DAYS >= 1 &&
    DIAGNOSTIC_RETENTION_DAYS <= 365
    ? DIAGNOSTIC_RETENTION_DAYS
    : 30;
}

export function createDiagnosticEvent(diagnostic: ClientDiagnostic) {
  return {
    event: "inkest.client_error",
    occurredAt: new Date().toISOString(),
    surface: diagnostic.surface,
    digest: diagnostic.digest?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128) || undefined,
    retentionDays: safeRetentionDays(),
  };
}

function getWebhookUrl() {
  const value = process.env.DIAGNOSTICS_WEBHOOK_URL;
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Emits a privacy-safe event to container stderr and, when configured, an
 * operator-owned webhook. The payload deliberately has no user IDs, URLs,
 * note content, attachment paths, error messages, stacks, or credentials.
 */
export async function reportClientDiagnostic(diagnostic: ClientDiagnostic) {
  const event = createDiagnosticEvent(diagnostic);
  console.error(JSON.stringify(event));

  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return event;

  const token = process.env.DIAGNOSTICS_WEBHOOK_TOKEN;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // The primary stderr event remains available when alert delivery fails.
  }

  return event;
}
