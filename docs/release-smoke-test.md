# Release smoke test

This runbook verifies the release-critical user journeys on a disposable local
or container deployment. It combines a safe HTTP preflight with short browser
checks; the browser steps are deliberate because they exercise the real Auth.js
session, editor, file picker, and download behavior.

Do not use a personal workspace, production notes, or production credentials.
Use a new database and storage directory/volume for every run. The current
release baseline and clean-environment setup are recorded in
[release-checklist-2026-07-14.md](release-checklist-2026-07-14.md).

## Prepare a disposable deployment

1. Copy `.env.example` to `.env.local`, set a unique `NEXTAUTH_SECRET`, and
   use an empty local database and attachment directory. Leave AI, Google
   Calendar, and Telegram credentials unset for the disabled-integration
   checks.
2. Install and migrate: `bun install` then `bun run db:migrate`.
3. Start the app with `bun run dev`, or use the documented Compose path with
   new named volumes.
4. Open the app in a normal browser profile for Account A and a private window
   or separate profile for Account B.

## Run the HTTP preflight

```bash
bun run smoke
```

For a container or non-default host, pass its base URL explicitly:

```bash
bun run smoke -- --base-url http://localhost:3000
```

Expected result: every check prints `PASS`; the dashboard and Google Calendar
connect route redirect an unauthenticated request to `/signin`. This preflight
does not create data and is safe to repeat.

## Browser smoke checklist

Use a unique marker such as `release-smoke-YYYYMMDD-HHMM` in every title and
note body. Record the marker, browser, app URL, and pass/fail result in the
release issue; do not record passwords, session cookies, provider keys, or
personal content.

### Account and Markdown note

- [ ] In Account A, open `/signup`, create an account with a disposable email
      and a password of at least eight characters. Expected: redirect to the
      dashboard and no error toast.
- [ ] Create a note using **New note** (or `Ctrl+N`), replace its title, and
      enter the marker plus a Markdown heading, checklist item, wiki link, and
      fenced code block. Wait for the saved indicator, reload the page, and
      confirm the exact Markdown source remains.
- [ ] Switch to read/preview with `Ctrl+E`, confirm the heading, checklist, and
      code block render, then switch back and place the caret in the same code
      block. Expected: editing resumes without a route change or lost draft.

### Project task

- [ ] Open **Projects**, create a project, open its **Tasks** tab, create a
      task note, and change it to **Done** using the list or kanban controls.
      Reload the project. Expected: the task remains completed and appears in
      the completed state.

### Private attachment and export

- [ ] In the smoke note, select **Attach** and upload a small allowed file
      (PNG, JPEG, WebP, GIF, SVG, PDF, EPUB, DOC, or DOCX). Expected: a link or
      image reference is inserted, the file opens/downloads while signed in,
      and the response has a private attachment URL.
- [ ] Copy that attachment URL, then request it while signed out and from
      Account B. Expected: neither session receives the file.
- [ ] Download the individual note export from the note menu and **Export
      everything** from Settings. Expected: both downloads succeed; the note
      export contains the marker and the workspace archive contains the note
      Markdown and uploaded attachment.

### Missing optional integrations

- [ ] With no server AI variables and no user AI provider configured, request
      a harmless action such as **Summarize** from the note AI panel. Expected:
      the UI reports that AI is not configured and the editor draft is still
      present.
- [ ] Open **Calendar** and select **Connect Google Calendar**. Expected:
      return to Calendar with the `google-calendar-not-configured` state; daily
      notes still open normally.
- [ ] Open **Settings**. Expected: Telegram remains unlinked/unconfigured and
      normal note and task work remains usable; do not generate a link code or
      call the webhook when credentials are intentionally absent.

## Completion criteria

Mark P0-03 complete only when the HTTP preflight passes and every applicable
browser check passes on a clean local or Compose deployment. If an optional
integration is intentionally configured in the target environment, run the
normal success-path check separately and record that the disabled-state branch
was verified in a clean environment.
