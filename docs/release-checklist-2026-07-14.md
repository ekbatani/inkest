# Release baseline checklist — 2026-07-14

This dated snapshot is the reproducible starting point for the public
self-hosted release work. It intentionally records the current state, known
gaps, and a safe test setup; it does not claim that the release gates have
passed.

## Snapshot

| Item | Baseline |
| --- | --- |
| Repository | `inkest` |
| Commit | `05bc813553e18a8c0eb11137f6dbd2e6350b2541` (`cleanup the project docs folder.`, 2026-07-14 13:55:25 +03:30) |
| Working tree before this checklist | clean |
| Runtime/package manager | Next.js 16.2.9, React 19.2.4, Bun 1.x |
| Local database | libSQL-compatible SQLite at `file:./data/local.db` (from `.env.local`) |
| Local attachment storage | `./storage`; note that the local file currently uses the legacy `STORAGE_DRIVER` name, while the runtime reads `ATTACHMENT_STORAGE_DRIVER` |
| Container database and storage | `file:/app/data/local.db`, with `inkest-data` and `inkest-storage` named volumes |
| Container image | `ghcr.io/ekbatani/inkest:latest`; the workflow publishes on `main` and `v*` tags |

## Integration state

Do not copy, print, or commit values from `.env.local`; inspect only whether a
variable is present when reproducing this baseline.

| Integration | Baseline state | Repeatable expectation |
| --- | --- | --- |
| Authentication | `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are configured locally | A new local account can sign up and sign in. |
| AI | An OpenAI-compatible local provider is configured | AI actions may be exercised only with the deployment owner’s provider account; otherwise verify the missing-provider message. |
| Google Calendar | No Google Calendar credentials are configured locally | Calendar connection reports its documented unconfigured state and ordinary daily notes remain usable. |
| Telegram | No Telegram credentials are configured locally | Telegram-dependent actions remain unavailable without affecting notes or tasks. |
| MinIO | Disabled locally and in the default Compose profile | Local private attachment storage is the active path. Start the `storage` profile only when testing MinIO. |

## Test-account setup

Use fresh, disposable accounts for each baseline run. No account credentials
belong in this document, `.env.local`, issue reports, or recorded command
output.

1. Copy `.env.example` to `.env.local` and set a unique `NEXTAUTH_SECRET`.
2. Set `DATABASE_URL=file:./data/local.db` and use an empty `./storage`
   directory, or use a separate disposable database and storage root.
3. Run `bun install`, `bun run db:migrate`, then `bun run dev`.
4. Create **Account A** through `/signup`; create **Account B** in a separate
   browser profile or private window for authorization checks.
5. Give Account A one Markdown note, one project task, and one small permitted
   attachment. Do not use personal note text or production credentials.

## Baseline checks

Run these checks against the disposable setup. Record the command result,
browser/OS, and any failure in the release issue or follow-up task; never put
secrets in the result.

- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run build`
- [ ] Account A can sign up/sign in, create a note, edit Markdown, reload, and
      see the saved content.
- [ ] Account A can create and complete a note-backed project task.
- [ ] Account A can upload and download an allowed attachment.
- [ ] Account B and an unauthenticated browser cannot download Account A’s
      attachment or read Account A’s note/export routes.
- [ ] Account A can export one note and the workspace; the exported Markdown
      preserves the authored source.
- [ ] With AI credentials removed, the app communicates that the provider is
      unavailable without losing the note draft.
- [ ] Google Calendar and Telegram disabled states do not block daily notes or
      ordinary task work.
- [ ] In a clean Docker host or equivalent disposable Docker environment,
      follow the README Compose instructions, confirm migrations run, restart
      the container, and confirm the named database/storage volumes persist.

## Known defects and release blockers at this snapshot

- The public release gates listed in `todo.md` are not complete; in particular
  P0-02 through P0-04, P0-10 through P0-13, P0-20, P0-30 through P0-31,
  P0-40 through P0-43, and P0-50 through P0-52 remain open.
- Configuration documentation has factual drift for P0-02: `.env.example`
  defines `STORAGE_DRIVER`, but `src/server/attachments/storage.ts` reads
  `ATTACHMENT_STORAGE_DRIVER`. README and Compose use the latter.
- The tracked environment example uses Google Calendar variable names that
  differ from the README’s Google OAuth names; the server currently reads
  `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and
  `GOOGLE_CALENDAR_REDIRECT_URI`.
- A clean Docker deployment, backup/restore drill, cross-account authorization
  checks, and production-like smoke test have not yet been recorded as passed.
- `bun run lint` currently fails on five pre-existing errors: synchronous state
  updates in `sidebar-toggle-wrapper.tsx` and `mermaid-renderer.tsx`, a
  render-time ref read in `note-editor.tsx`, and unescaped quotes in
  `tag-selector.tsx`. It also reports three `no-img-element` warnings for the
  generated icon routes.
- `bun run build` passes, but reports a CSS parser warning for
  `::highlight(tts-active-sentence)` and a Turbopack trace warning caused by
  filesystem behavior in the attachment/export import path.

## Handoff

A second agent can reproduce this baseline using this checklist together with
the root README and `docs/OPERATIONS.md`. Keep this file immutable as the
2026-07-14 snapshot; record later outcomes in their dated evidence or in the
next release checklist rather than revising the observed state above.
