import {
  createDiagnosticEvent,
  reportClientDiagnostic,
} from "../src/server/diagnostics/service.ts";

const event = createDiagnosticEvent({
  surface: "note",
  digest: "note-content=private-token/path",
});
const serialized = JSON.stringify(event);
const expectedKeys = [
  "digest",
  "event",
  "occurredAt",
  "retentionDays",
  "surface",
];

if (
  event.digest !== "note-contentprivate-tokenpath" ||
  serialized.includes("private-token/path") ||
  JSON.stringify(Object.keys(event).sort()) !== JSON.stringify(expectedKeys)
) {
  throw new Error("Diagnostics event contained unexpected data.");
}

const originalFetch = globalThis.fetch;
const originalWebhookUrl = process.env.DIAGNOSTICS_WEBHOOK_URL;
const originalWebhookToken = process.env.DIAGNOSTICS_WEBHOOK_TOKEN;
let received;

process.env.DIAGNOSTICS_WEBHOOK_URL = "https://alerts.example.test/inkest";
process.env.DIAGNOSTICS_WEBHOOK_TOKEN = "test-token";
globalThis.fetch = async (input, init) => {
  received = { input: String(input), init };
  return new Response(null, { status: 204 });
};

try {
  await reportClientDiagnostic({ surface: "app", digest: "synthetic-error" });
} finally {
  globalThis.fetch = originalFetch;
  process.env.DIAGNOSTICS_WEBHOOK_URL = originalWebhookUrl;
  process.env.DIAGNOSTICS_WEBHOOK_TOKEN = originalWebhookToken;
}

if (
  received?.input !== "https://alerts.example.test/inkest" ||
  received.init?.headers?.Authorization !== "Bearer test-token" ||
  received.init?.body !==
    JSON.stringify({
      event: "inkest.client_error",
      occurredAt: received.init?.body
        ? JSON.parse(received.init.body).occurredAt
        : undefined,
      surface: "app",
      digest: "synthetic-error",
      retentionDays: 30,
    })
) {
  throw new Error("Diagnostics webhook did not receive the expected safe event.");
}

console.log("Privacy-safe diagnostics payload and alert dispatch verified.");
