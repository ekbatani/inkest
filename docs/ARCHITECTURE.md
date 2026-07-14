# Architecture

## System overview

Inkest is a Bun-run Next.js App Router application. TypeScript UI code lives in
`src/app` and `src/components`; server-side domain logic lives in `src/server`.
Drizzle accesses libSQL/Turso, and attachments use either local private storage
or a MinIO/S3-compatible backend.

```text
Browser
  -> Next.js routes, Server Actions, and API routes
  -> authenticated server services
  -> libSQL database / private attachment storage / optional external APIs
```

Keep domain rules in server services, input contracts in Zod schemas, UI state in
components, and database schema/migrations in `src/server/db` and `drizzle`.

## Domains

| Domain | Responsibility |
| --- | --- |
| Auth and users | Credentials authentication, sessions, profiles, preferences |
| Notes | Markdown content, hierarchy, search, archive, daily notes, versions, wiki links |
| Projects and tasks | Project-note metadata, task lifecycle, checkbox synchronization, kanban |
| Tags | Workspace-scoped classification and OR-based filtering |
| Attachments | Validated private upload, metadata, and authenticated retrieval |
| AI | Provider configuration, action specifications, structured parsing, action history |
| Calendar and notifications | Google Calendar sync and Telegram linking/delivery |
| Export/import | Portable Markdown and workspace archive flows |

## Data model

The primary records are `users`, `workspaces`, `notes`, `tags`, `note_tags`,
`tasks`, `attachments`, `note_versions`, and `ai_events`. Calendar connections
and synced events are stored separately. A note belongs to one user and
workspace and may be a regular, project, or daily note. Tasks belong to both a
note and user; attachments and AI events are user-owned.

The schema is the source of truth: [schema.ts](../src/server/db/schema.ts).
Apply schema changes through Drizzle migrations; do not hand-edit a deployed
database.

## Security boundaries

- Every server action and API route authenticates the session before work.
- Reads and mutations must scope records by the current user (and relevant
  workspace); an identifier alone is never authorization.
- Attachments are not public static files. Upload validates type and size;
  retrieval verifies ownership.
- Markdown is rendered with sanitization. Mermaid runs with a restrictive
  security configuration and failures render an error state rather than
  executing user content.
- Validate external and form input with Zod at the boundary.
- AI is opt-in per action. Persist action metadata for traceability, and treat
  provider keys, OAuth tokens, and Telegram secrets as sensitive configuration.

## Content and AI contracts

Notes are stored as Markdown in `notes.content_md`. Markdown drives preview,
Mermaid fences, checklist tasks, and exports, so transformations must preserve
the user's source whenever possible.

AI action definitions live in [specs.ts](../src/server/ai/specs.ts). Each action
declares the permitted note/selection context and a Zod response schema.
Text actions return Markdown; task, project-plan, and Mermaid actions use
structured output before the application renders or inserts it. Add a new action
by adding its schema/specification, reusing the shared prompt and parser, then
exposing it through the existing authenticated AI route and review UI.

## Integration rules

- AI providers are OpenAI-compatible and selected from instance defaults or
  user settings. An unavailable provider must produce a useful setup response,
  not silently fall back.
- Google Calendar credentials are per user and calendar data remains scoped to
  that user/workspace.
- Telegram supports user linking with an instance-level fallback for simple
  self-hosted deployments. Webhooks must validate their configured secret.
- Storage drivers have the same authorization contract; switching from local
  storage to MinIO must not make files public.

## Engineering conventions

- Read the relevant Next.js documentation under `node_modules/next/dist/docs`
  before changing Next.js behavior; this project uses a version with breaking
  API and convention changes.
- Prefer small, explicit modules and make failures visible to the user.
- Preserve accessible keyboard flows and `prefers-reduced-motion` behavior when
  changing the editor or navigation.
- Run type checking, linting, and proportionate flow verification for every
  change. See [Operations](OPERATIONS.md) for commands and performance checks.
