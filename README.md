# inkest

A calm, fast, Markdown-first personal workspace. Notes, projects, tasks, and lightweight AI actions -- all self-hosted.

## Features

- **Markdown-native** -- notes are stored as plain Markdown with GFM support
- **Mermaid diagrams** -- fenced `mermaid` blocks render inline
- **Projects & tasks** -- project notes with status, priority, due dates, and a kanban board
- **Tags & hierarchy** -- color-coded tags, parent-child note tree
- **Daily notes** -- one note per day, auto-created
- **AI actions** -- summarize, improve writing, extract tasks, generate diagrams, translate (OpenAI-compatible)
- **Image uploads** -- local filesystem storage, private serving
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
| Auth | Auth.js (next-auth) with Credentials |
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

```bash
# Build and run
docker compose up -d

# Or build manually
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
| `DATABASE_URL` | Yes | `file:local.db` | SQLite file path or Turso URL |
| `DATABASE_AUTH_TOKEN` | No | -- | Turso auth token (if using remote DB) |
| `AI_PROVIDER` | No | `openai` | Default server-side AI provider (`openai`, `openrouter`, `custom`) |
| `OPENAI_API_KEY` | No | -- | OpenAI or generic compatible provider API key |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | OpenAI or custom compatible endpoint |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI or custom compatible model |
| `OPENROUTER_API_KEY` | No | -- | OpenRouter API key when `AI_PROVIDER=openrouter` |
| `OPENROUTER_BASE_URL` | No | `https://openrouter.ai/api/v1` | OpenRouter API endpoint |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | OpenRouter model slug |

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
