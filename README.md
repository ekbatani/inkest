<p align="center">
  <img src="public/favicon.svg" alt="Inkest Logo" width="64" height="64" />
</p>

<h1 align="center">Inkest</h1>

<p align="center">
  <strong>A calm, Markdown-native home for your notes, diary, projects, and ideas — with a citing AI assistant.</strong>
</p>

<p align="center">
  <a href="#quickstart-self-hosted">Self-Host with Docker</a> •
  <a href="#our-philosophy">Our Philosophy</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## What is Inkest?

Inkest is an open-source, private, Markdown-first personal workspace. It combines the simplicity and permanence of plain Markdown with the polish of a modern productivity tool and an intentional, citing AI assistant that answers directly from your private knowledge base.

Whether you are journaling daily thoughts, organizing long-term software projects, drafting system architecture diagrams, or researching complex ideas, Inkest provides a quiet digital room designed to compound your thinking.

```
CAPTURE  ·  ORGANIZE  ·  THINK
```

---

## Our Philosophy

1. **Calm over clutter**  
   No feeds to refresh, no streaks to keep, and no red badges begging for attention. Inkest is built to be a distraction-free space where thinking compounds instead of reacting.
2. **Privacy is the product**  
   Your notes, your AI keys, your server. Nothing you write is analyzed, monetized, or trained on. Personal AI credentials use Bring-Your-Own-Key (BYOK) with AES-256-GCM encryption at rest.
3. **Yours, forever**  
   Plain Markdown on your own disk, 1-click full export (ZIP/JSON), and zero vendor lock-in. Built to outlive any startup.

---

## Key Features

* 📝 **Markdown-Native Writing:** Live GFM preview, CodeMirror 6 editor, wiki links, backlinks, RTL/LTR support, and a focus reader with text-to-speech.
* 🧠 **Citing AI Assistant (BYOK):** Summarize, improve writing, extract tasks, translate, and chat with notes—with citations that link directly to source paragraphs. Uses user-provided API keys (OpenAI, Anthropic, OpenRouter, Google Gemini, Ollama).
* 🚀 **Projects & Task Management:** Project subtrees, automatic checkbox synchronization, Kanban boards, milestones, and granular project sharing.
* 📅 **Daily Journaling & Calendar:** Daily notes with reflection templates (Gratitude, Daily Review, Decisions) and optional Google Calendar integration.
* 📊 **Mermaid Diagrams & Media:** Native Mermaid rendering for flowcharts and system designs, plus private authenticated attachment storage.
* 🔒 **Encrypted Vault & Private Attachments:** Secure sensitive snippets and files with client-side AES-256 encryption.

---

## Quickstart: Self-Hosted

Inkest can be deployed in seconds as a self-contained, all-in-one container with embedded PostgreSQL and `pgvector`.

### Option A: One-Liner `docker run` (Recommended)

Run Inkest directly with persistent volumes for data and attachments:

```bash
docker run -d \
  --name inkest \
  -p 3000:3000 \
  -v inkest-data:/data \
  -v inkest-storage:/app/storage \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e NEXTAUTH_SECRET=$(openssl rand -base64 32) \
  -e AI_CREDENTIAL_ENCRYPTION_KEYS=2026-09:$(openssl rand -base64 32) \
  ghcr.io/ekbatani/inkest:latest
```

Open [http://localhost:3000](http://localhost:3000) to create your initial account.

---

### Option B: Cloud Multi-Service Stack (`docker compose`)

To run the complete multi-service stack with external PostgreSQL (`pgvector`), Redis caching, and optional MinIO storage:

```bash
# 1. Clone the repository
git clone https://github.com/ekbatani/inkest.git
cd inkest

# 2. Copy the Cloud environment template
cp .env.cloud.example .env

# 3. Start the stack
docker compose up -d --build
```

---

### Option C: Local Development with Bun

Prerequisite: [Bun](https://bun.sh/) 1.x.

```bash
# 1. Install dependencies
bun install

# 2. Setup environment variables
cp .env.example .env.local

# 3. Apply database migrations & start development server
bun run db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19, TypeScript |
| **Runtime & Package Manager** | Bun |
| **Styling & Components** | Tailwind CSS v4, shadcn/ui, CodeMirror 6 |
| **Database & Vector Search** | PostgreSQL 16+ with `pgvector` (via Drizzle ORM) |
| **Caching & Queues** | Redis / Valkey (with in-memory LRU fallback) |
| **Storage** | Local Filesystem Volume or S3 / Cloudflare R2 |
| **AI Integration** | OpenAI-compatible BYOK (OpenRouter, Anthropic, Gemini, Ollama) |

---

## Useful Commands

```bash
bun run typecheck     # Run TypeScript type verification
bun run lint          # Run ESLint checks
bun test              # Run automated test suite
bun run db:generate   # Generate Drizzle migrations from schema
bun run db:migrate    # Apply migrations
bun run build         # Compile production Next.js standalone build
```

---

## Contributing

We welcome contributions from the community! Whether fixing bugs, improving documentation, or adding new features, here is how you can help:

1. **Fork the Repository:** Create your own branch (`git checkout -b feature/amazing-feature`).
2. **Follow Coding Standards:**
   * TypeScript with strict typing.
   * Server actions and API routes must authenticate and scope all queries to the active user.
   * Maintain Markdown integrity and user data privacy boundaries.
3. **Verify Your Changes:**
   ```bash
   bun run typecheck
   bun run lint
   bun test
   ```
4. **Submit a Pull Request:** Open a PR against `main` with a clear description of your changes.

For major architectural changes, please open an issue first to discuss the design.

---

## License

Inkest is free for personal, educational, and non-commercial self-hosted use under the **[PolyForm Noncommercial License 1.0.0](LICENSE.md)**.

### Commercial Inquiries & Cloud SaaS
For commercial licensing, enterprise self-hosting, hosted service partnerships, or alternative licensing terms, please contact:

**Amir Ekbatani**  
Email: [amir.ekbatani@gmail.com](mailto:amir.ekbatani@gmail.com)  
Website: [inkest.app](https://inkest.app)
