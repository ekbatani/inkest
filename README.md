# inkest

A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and lightweight AI actions -- all self-hosted.

## Features

- **Markdown-native** -- notes are stored as plain Markdown with GFM support
- **Mermaid diagrams** -- fenced `mermaid` blocks render inline
- **Projects & tasks** -- project notes with status, priority, due dates, and a kanban board
- **Tags & hierarchy** -- color-coded tags, parent-child note tree
- **Daily notes** -- one note per day, auto-created
- **Calendar sync** -- month view plus Google Calendar events inside daily notes
- **AI actions** -- summarize, improve writing, extract tasks, generate diagrams, translate (OpenAI-compatible)
- **Speech to text** -- record short voice notes and transcribe them with Google Speech-to-Text
- **Private attachments** -- images, PDFs, DOC/DOCX, EPUB via local storage or MinIO
- **Version history** -- automatic snapshots with one-click restore
- **Wiki links** -- `[[Note Title]]` linking with backlinks
- **Export** -- full workspace ZIP or single-note Markdown
- **Command palette** -- Ctrl+K for quick navigation and search
- **RTL support** -- per-note direction (LTR, RTL, auto)
- **Dark mode** -- system-aware light/dark theme

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Drizzle ORM + libSQL/Turso |
| Editor | CodeMirror 6 |
| Preview | react-markdown + remark-gfm + rehype-sanitize |
| Auth | Auth.js (next-auth) with Credentials + Google Calendar OAuth connect |
| AI | OpenAI SDK (any compatible provider) |
| Runtime | Bun |

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) 1.x

### Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your values

# Run database migrations
bun run db:migrate

# Start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account to get started.

## Docker

Every push to `main` builds the image via GitHub Actions ([.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)) and publishes it to GitHub Container Registry at `ghcr.io/ekbatani/inkest`.

```bash
# Deploy the published image (pulls the latest build, no local build needed)
docker login ghcr.io -u <your-github-username>   # if the package is private
docker compose pull
docker compose up -d
```

The container runs pending Drizzle migrations automatically on startup, so a fresh deploy initializes the schema on first boot. With the default local storage driver, the SQLite database and uploaded files live on named volumes (`inkest-data`, `inkest-storage`) mounted at `/app/data` and `/app/storage`, so they persist across `docker compose pull && up -d` redeploys.

```bash
# Or build the image locally instead of pulling
docker build -t inkest .
docker run -p 3000:3000 \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e DATABASE_URL=file:/app/data/local.db \
  -v inkest-data:/app/data \
  -v inkest-storage:/app/storage \
  inkest
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXTAUTH_URL` | Yes | -- | App URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | -- | Auth.js secret (`openssl rand -base64 32`) |
| `DATABASE_URL` | Yes | `file:./data/local.db` | SQLite file path or Turso URL |
| `DATABASE_AUTH_TOKEN` | No | -- | Turso auth token (if using remote DB) |
| `AI_PROVIDER` | No | `openai` | Default server-side AI provider (`openai`, `openrouter`, `custom`) |
| `OPENAI_API_KEY` | No | -- | OpenAI or generic compatible provider API key |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI or custom compatible endpoint |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI or custom compatible model |
| `OPENROUTER_API_KEY` | No | -- | OpenRouter API key when `AI_PROVIDER=openrouter` |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | OpenRouter API endpoint |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | OpenRouter model slug |
| `GOOGLE_SPEECH_TO_TEXT_API_KEY` | No | -- | Google Cloud Speech-to-Text API key for voice transcription |
| `GOOGLE_SPEECH_TO_TEXT_BASE_URL` | No | `https://speech.googleapis.com/v1` | Override the Google Speech-to-Text REST endpoint |
| `GOOGLE_OAUTH_CLIENT_ID` | No | -- | Google OAuth client ID used for Calendar sync |
| `GOOGLE_OAUTH_CLIENT_SECRET` | No | -- | Google OAuth client secret used for Calendar sync |
| `MAX_SPEECH_UPLOAD_SIZE_MB` | No | `10` | Max uploaded recording size accepted by the speech route |
| `ATTACHMENT_STORAGE_DRIVER` | No | `local` | Attachment backend: `local` or `minio` |
| `LOCAL_STORAGE_ROOT` | No | `./storage` | Local attachment root when using `local` storage |
| `MAX_UPLOAD_SIZE_MB` | No | `20` | Max uploaded attachment size |
| `ALLOWED_UPLOAD_TYPES` | No | built-in allowlist | Comma-separated MIME types for attachments |
| `MINIO_ENDPOINT` | No | -- | MinIO/S3-compatible endpoint, e.g. `http://minio:9000` |
| `MINIO_BUCKET` | No | -- | Bucket used when `ATTACHMENT_STORAGE_DRIVER=minio` |
| `MINIO_REGION` | No | `us-east-1` | Region used for S3 signature calculation |
| `MINIO_ACCESS_KEY` | No | -- | MinIO access key |
| `MINIO_SECRET_KEY` | No | -- | MinIO secret key |

## Attachments

The editor attachment button inserts:

- Markdown images for image files
- Markdown links for PDFs, DOC/DOCX, and EPUB files

All attachments remain private and are served through `/api/attachments/[id]` with per-user authorization. To move attachment storage from the local filesystem to MinIO, set `ATTACHMENT_STORAGE_DRIVER=minio` and the `MINIO_*` variables above.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New note |
| `Ctrl+D` | Today's daily note |
| `Ctrl+\` | Toggle sidebar |
| `Ctrl+S` | Force save (in editor) |
| `Ctrl+E` | Toggle edit/preview (in editor) |

## License

Private project.
