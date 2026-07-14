# Inkest

Inkest is a calm, private, Markdown-first personal workspace for notes,
projects, tasks, and intentional AI assistance. It is designed to be
self-hosted, portable, and comfortable for daily writing.

## What it includes

- Markdown notes with safe GFM preview, Mermaid diagrams, wiki links,
  backlinks, version history, and Markdown/workspace export.
- Projects, note-backed tasks, checklists, due dates, kanban, tags, folders,
  archive, daily notes, and calendar views.
- Private image and document attachments; browser speech-to-text; and
  text-to-speech, focus, super-focus, RTL, and dark-mode reading support.
- Explicit AI actions for writing, summaries, task extraction, project plans,
  Mermaid generation, explanations, and translation.
- Optional Google Calendar and Telegram integrations.

The durable product, architecture, and operations documentation is in
[docs/](docs/README.md).

## Stack

| Layer | Technology |
| --- | --- |
| Application | Next.js 16 App Router, React 19, TypeScript |
| Runtime and package manager | Bun |
| UI | Tailwind CSS v4, shadcn/ui, CodeMirror 6 |
| Data | Drizzle ORM with local libSQL or Turso |
| Authentication | Auth.js credentials sessions |
| Integrations | OpenAI-compatible AI providers, Google Calendar, Telegram, MinIO/S3-compatible storage |

## Run locally

Prerequisite: [Bun](https://bun.sh/) 1.x.

```bash
bun install
cp .env.example .env.local
```

Set `NEXTAUTH_SECRET` in `.env.local` to a strong value, for example
`openssl rand -base64 32`. The defaults use a local SQLite-compatible libSQL
database and local attachment storage.

```bash
bun run db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and
start writing. On PowerShell, use `Copy-Item .env.example .env.local` instead
of `cp` if that command is unavailable.

### Useful commands

```bash
bun run typecheck
bun run lint
bun run build
bun run db:generate  # create a migration after changing the schema
bun run db:migrate   # apply committed migrations
bun run db:studio
```

## Configuration

Only `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `DATABASE_URL` are needed for a
standard deployment. The rest enable optional integrations or override safe
defaults. Keep all values in your environment or secret store; do not commit
them.

| Group | Variables |
| --- | --- |
| App and database | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL`, `DATABASE_AUTH_TOKEN` |
| AI provider | `AI_PROVIDER` (`openai`, `openrouter`, `opencode`, `ollama`, or `custom`) plus the selected provider's `*_API_KEY`, `*_BASE_URL`, and `*_MODEL` values |
| OpenAI or custom AI | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` |
| OpenRouter AI | `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL`, `OPENROUTER_MODEL` |
| opencode Zen AI | `OPENCODE_API_KEY`, `OPENCODE_BASE_URL`, `OPENCODE_MODEL` |
| Ollama AI | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` (no API key required) |
| Google Calendar | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` (the callback URL is derived as `${NEXTAUTH_URL}/api/calendar/google/callback`) |
| Telegram | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` |
| Attachments | `ATTACHMENT_STORAGE_DRIVER`, `LOCAL_STORAGE_ROOT`, `MAX_UPLOAD_SIZE_MB`, `ALLOWED_UPLOAD_TYPES` |
| MinIO | `MINIO_ENDPOINT`, `MINIO_BUCKET`, `MINIO_REGION`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` |

`DATABASE_URL` defaults to `file:./data/local.db`; use a Turso URL with
`DATABASE_AUTH_TOKEN` for a remote database. `NEXT_PUBLIC_APP_URL` supplies
the canonical public URL for metadata, robots, and the sitemap. AI settings can
also be supplied per user in the application.

Attachments use the local driver by default. Set
`ATTACHMENT_STORAGE_DRIVER=minio` with all `MINIO_*` variables to use an
S3-compatible MinIO server. Files remain private in either mode and are served
only through the authenticated attachment route.

## Docker and self-hosting

Every push to `main` and version tag is built by
[the Docker publishing workflow](.github/workflows/docker-publish.yml) and
published to `ghcr.io/ekbatani/inkest`.

```bash
docker login ghcr.io -u <github-user> # only if the package is private
docker compose pull
docker compose up -d
```

The image applies pending Drizzle migrations at startup. With the default local
storage driver, the named `inkest-data` and `inkest-storage` volumes persist the
database and uploads across redeployments.

The base [docker-compose.yml](docker-compose.yml) exposes the app only to the
Docker network for reverse proxies such as Dokploy. Point the proxy at port
`3000` in the container. For local Docker development, add the included port
override:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

To start the optional MinIO service declared in the same Compose file, add its
profile:

```bash
docker compose --profile storage up -d
```

You can build locally instead of pulling the published image:

```bash
docker build -t inkest .
docker run -p 3000:3000 \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  -e DATABASE_URL=file:/app/data/local.db \
  -v inkest-data:/app/data \
  -v inkest-storage:/app/storage \
  inkest
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+K` | Open command palette |
| `Ctrl+N` | Create a note |
| `Ctrl+D` | Open today's daily note |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+S` | Force save in the editor |
| `Ctrl+E` | Toggle edit/preview in the editor |

## License

Private project.
