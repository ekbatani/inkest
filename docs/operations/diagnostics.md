# Privacy-safe diagnostics

Inkest reports unexpected authenticated application errors as small structured
events. The baseline is self-host compatible: events are written to container
stderr, so Docker, Dokploy, or a self-hosted log collector can retain and alert
on them without adding a vendor SDK or sending workspace data to a third party.

Set `DIAGNOSTICS_WEBHOOK_URL` to an operator-owned HTTPS endpoint to receive
the same event as an alert webhook. `DIAGNOSTICS_WEBHOOK_TOKEN`, when set, is
sent only as a bearer credential. Do not point this at a shared or public
endpoint. Failed webhook delivery never changes the user-facing error recovery;
the stderr event remains the primary record.

Each event has only an event name, timestamp, error-boundary surface, optional
Next.js digest, and configured retention period. It never includes note text,
titles, user IDs, URLs, attachment paths, error messages, stacks, cookies,
provider keys, OAuth tokens, or the webhook credential. Configure your log
collector and webhook receiver to delete these events after
`DIAGNOSTICS_RETENTION_DAYS` (30 days by default; 1-365 is accepted). Keep
access limited to the instance operator.

## Alert verification

1. On a disposable authenticated deployment, configure an operator-controlled
   webhook receiver and a short-lived `DIAGNOSTICS_WEBHOOK_TOKEN`.
2. Trigger a deliberate error in a disposable note or project route. The user
   sees the normal recovery UI; no error text is posted by the browser.
3. Confirm one `inkest.client_error` event reaches stderr and the receiver,
   with a `surface` of `note`, `project`, or `app` and no sensitive values.
4. Disconnect the receiver and repeat. Recovery must still work and stderr
   must retain the event. Rotate the test token afterwards.

The route accepts reports only from an authenticated same-origin session and
only permits the fixed surfaces and a short digest. It stores no diagnostics in
the Inkest database.
