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
| Calendar and notifications | Google Calendar sync, durable in-app activity, and Telegram linking/delivery |
| Export/import | Portable Markdown and workspace archive flows |

## Data model

The primary records are `users`, `workspaces`, `notes`, `tags`, `note_tags`,
`tasks`, `attachments`, `note_versions`, `ai_events`, and `notifications`.
Calendar connections and synced events are stored separately. A note belongs to
one user and workspace and may be a regular, project, or daily note. Tasks
belong to both a note and user; attachments, AI events, and notifications are
user-owned. Notification dedupe keys make scheduler retries safe.

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

AI action definitions live in [specs.ts](../src/server/ai/specs.ts). Every
action is initiated explicitly from the authenticated editor or dashboard; there
is no background AI processing and ordinary editing, previewing, searching,
spellcheck, export, and calendar work do not send note text to a provider.

The server sends an OpenAI-compatible provider a system prompt containing the
action goal, JSON response schema, and action rules, plus one user message that
contains the following JSON context. Empty optional values are omitted. The
provider receives the complete context listed below, even where the action rule
instructs it to focus on a selection.

| Action | Context sent to the provider | Result and user-controlled persistence |
| --- | --- | --- |
| Summarize; improve writing; extract tasks | Note title, full note Markdown, and optional selected text | Markdown or structured task suggestions. The editor only inserts/replaces Markdown after the user chooses an action; extracted tasks remain suggestions. |
| Create project plan | Note title, full note Markdown, and optional planning hint | Markdown plan shown for review; the user may insert it. |
| Generate Mermaid | Note title, full note Markdown, optional selected text, and optional guidance | Mermaid Markdown shown for review; the user may insert it. |
| Explain; translate | Note title, selected text, and, for translation, target language | Markdown shown for review; the user may replace the selection or insert it. |
| Comment selection | Note title, full note Markdown, selected text, and optional guidance | An inline `inkest-comment:` annotation shown for review; the user chooses whether to insert it. |
| Apply comments | Note title, full note Markdown containing inline comment annotations, and optional guidance | Revised complete Markdown shown for review; the user chooses whether to replace the note. |
| Create note from prompt | Dashboard prompt only; no existing note data | A title and Markdown draft are immediately saved as a new note after a successful request. |

All current actions use JSON-mode requests with temperature `0.4`. The app does
not currently send an explicit input or output token limit: limits, billing, and
retention at the provider are governed by the selected model/provider account.
The separate `runTextAction` helper uses temperature `0.7`, but no shipped
action currently calls it. New actions must declare an explicit limit before
using that helper or adding provider parameters.

Successful requests write an `ai_events` row with the acting user, optional
note id, action id, SHA-256 hash of the action's primary input, provider, model,
and the generated structured output. The raw input is not retained in this log,
but generated output is. If the user has AI-result Telegram notifications
enabled, the output, note title, action, provider, and model are also sent to
their configured Telegram chat. Failed and invalid-JSON requests return an
error to the caller and do not create an AI-event row; provider error text is
returned without logging provider credentials.

### AI configuration precedence

Provider configuration resolves for the authenticated user only. A personal
provider setting chooses the provider first; otherwise `AI_PROVIDER` chooses
the instance provider, falling back to `openai` when that environment variable
is absent or invalid. For the chosen provider, each field resolves separately:

1. Personal API key, base URL, and model, when non-empty.
2. The selected provider's instance `*_API_KEY`, `*_BASE_URL`, and `*_MODEL`.
   `openai` and `custom` share `OPENAI_*`; OpenRouter, opencode Zen, and Ollama
   use their respective prefixes.
3. The built-in base URL and model in [providers.ts](../src/lib/ai/providers.ts).

A blank personal API key therefore intentionally uses the matching instance key;
it does not clear it. Ollama is the only current key-optional provider and uses
an internal placeholder only to satisfy the OpenAI-compatible client. If no key
is available for a key-required provider, requests return the actionable
not-configured response (HTTP 503 from the AI route); they never switch to a
different provider or key. Personal API keys are encrypted in the user settings
record, decrypted only on the server for provider resolution, and never returned
by the settings action.

### Stored credential encryption and rotation

Personal AI provider keys and Google Calendar access/refresh tokens use
AES-256-GCM with a dedicated, server-only key ring in
`AI_CREDENTIAL_ENCRYPTION_KEYS`. Its comma-separated entries have the form
`key-id:base64-encoded-32-byte-key`; the first is active for encryption and the
others are decrypt-only rotation keys. Ciphertext records include their key id,
but never the key itself. Values are never serialized to the browser, included
in exports, or logged by these services.

Before enabling user credentials, generate a unique key with `openssl rand
-base64 32` and configure, for example, `2026-07:generated-value`. To rotate,
deploy `2026-10:new-value,2026-07:old-value`, leave both keys available while
authenticated settings/calendar reads lazily re-encrypt records, then remove the
old key only after confirming no `enc:v2:2026-07:` records remain in the backup
or database. Do not rotate this key by changing `NEXTAUTH_SECRET`.

The existing JSON settings and calendar-token columns need no schema migration:
legacy plaintext and the earlier `enc:v1` `NEXTAUTH_SECRET`-derived values are
read only to migrate them on the next authenticated use. Take a database backup
before the rollout. If rollback is needed after v2 values have been written,
restore that backup with the prior release; otherwise keep this release and the
full key ring deployed until migration is complete. Missing, corrupt, or
retired-key credentials are treated as unavailable and require the owner to
save a new provider key or reconnect Google Calendar.

Text actions return Markdown; task, project-plan, and Mermaid actions use
structured output before the application renders or inserts it. Add a new action
by adding its schema/specification, documenting its outbound context and
persistence here, reusing the shared prompt and parser, then exposing it through
the existing authenticated AI route and review UI.

## Integration rules

- AI providers are OpenAI-compatible and selected from instance defaults or
  user settings. An unavailable provider must produce a useful setup response,
  not silently fall back.
- Google Calendar credentials are per user and calendar data remains scoped to
  that user/workspace.
- Telegram supports user linking with an instance-level fallback for simple
  self-hosted deployments. Webhooks must validate their configured secret.
- Task due alerts require the user's reminder preference. In-app activity is a
  separate opt-in delivery channel; Telegram delivery is also opt-in and a
  failed Telegram send creates one deduplicated in-app action to check Settings.
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
