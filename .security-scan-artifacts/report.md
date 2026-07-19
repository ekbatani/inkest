# Security Review: InkNest

## Scope

Repository review of runtime server actions, API routes, authentication, data ownership, attachment storage, exports, AI and Telegram integrations, Calendar OAuth, and Compose deployment configuration. TypeScript typechecking passed. The generated `.next` tree was excluded as non-authoritative build output.

## Result

No reportable vulnerability remains in the current worktree. The scan corrected cross-user tag response leakage, Calendar OAuth credential serialization, user-controlled AI endpoint/credential exfiltration, Telegram webhook/linking controls, deployment session-secret and MinIO defaults, and global Telegram fallback for private AI output.

## Reviewed Surfaces

| Surface | Outcome | Notes |
| --- | --- | --- |
| Authentication, sessions, and object ownership | No issue found | Services scope user-owned data; Compose no longer supplies a known session secret. |
| AI settings and provider requests | No issue found | Personal endpoints require a built-in or operator-approved HTTPS origin; credentials remain server-side. |
| Calendar OAuth and Telegram | No issue found | OAuth tokens are redacted from actions; Telegram webhooks require the configured secret and codes are atomic. |
| Attachments | Needs follow-up | Chunked multipart parsing needs an enforceable platform/streaming body limit. |
| Workspace export | Needs follow-up | Whole-workspace archives are built in memory and need streaming plus quota/concurrency policy. |
| Markdown, Mermaid, and storage paths | No issue found | Existing sanitation, strict Mermaid mode, opaque attachment paths, and ownership controls hold for the private model. |

## Deferred Follow-up

The attachment and export availability findings are retained in `coverage.json` for P0-41 and P0-42. They need deployment-aware runtime testing and design work, not a speculative local workaround.
