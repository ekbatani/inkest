# Operations

## Local development and deployment

The root [README](../README.md) is the canonical source for prerequisites,
environment variables, Docker deployment, storage-driver settings, and keyboard
shortcuts. The normal local loop is:

```bash
bun install
cp .env.example .env.local
bun run db:migrate
bun run dev
```

Production uses the standalone Docker image. Persist `/app/data` and
`/app/storage` when using local storage; the supplied Docker Compose setup does
this with named volumes. Run migrations as part of deployment rather than
altering the database manually.

## Configuration and secrets

Required deployment values are the application URL, authentication secret, and
database location. AI, Telegram, Google Calendar, MinIO, and upload limits are
optional integrations. Set secrets in the deployment platform, never commit
them, and rotate a secret if it is exposed.

Instance-level AI and Telegram variables are suitable for simple self-hosting.
User-specific settings and integrations must remain isolated by user. Before a
hosted offering, encrypt stored provider credentials and review token lifecycle
and deletion behavior.

## Verification

Run the smallest relevant checks before handing off a change:

```bash
bun run typecheck
bun run lint
bun run build
```

For a change to an authenticated flow, manually verify the real flow with a
test account: sign in, perform the action, confirm data persists, and confirm a
different account cannot read it. For attachments and integrations, also test
failure states (wrong owner, invalid file, missing provider configuration, or
expired authorization).

## Performance baseline

The last recorded baseline is **2026-07-03**, using a production build, local
loopback server, Lighthouse 13, and an authenticated seeded test account. These
are comparative local measurements, not field performance.

| Route | Performance | LCP | TBT | Total transfer | Script transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/signin` | 91 | 3.5 s | 30 ms | 426 KiB | 238 KiB |
| `/dashboard` | 88 | 3.9 s | 20 ms | 502 KiB | 308 KiB |
| `/notes/[id]` | 68 | 6.8 s | 360 ms | 997 KiB | 818 KiB |

The editor is the performance priority: CodeMirror, Markdown preview, and
Mermaid currently concentrate too much script on that route. Mermaid is already
loaded client-side; measure code splitting for the editor and preview before
adding further optimization. Re-run the same production-mode measurement after
changes that affect bundles, fonts, editor behavior, or rendering.

Targets: landing page Lighthouse at least 95 with under 100 KiB first-load
JavaScript; substantially narrow the editor gap to the dashboard; validate
editor interactivity on representative hardware and a throttled connection.

## Release readiness

- Confirm migrations, persistent volumes, and environment values in a clean
  deployment.
- Verify signup/signin, notes, private attachment access, export, AI setup,
  and any enabled calendar or Telegram integration.
- Review the license, privacy disclosure, AI disclosure, backup/restore path,
  and dependency/security updates before a public release.
- Keep Docker, README, and environment examples aligned with the shipped image.
