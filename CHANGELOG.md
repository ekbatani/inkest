# Changelog & Release Notes

All notable changes to **Inkest** will be documented in this file.

---

## [v0.0.1] - 2026-08-31

### 🚀 Inkest v0.0.1 — Genesis Release

We are thrilled to announce the initial release of **Inkest (v0.0.1)** — a calm, private, Markdown-first personal workspace built for individual thinking, long-form writing, knowledge structuring, note-centric project management, and intentional AI assistance.

Inkest is designed from the ground up for technical knowledge workers, writers, researchers, and self-hosters who value absolute data ownership, privacy, and speed.

---

### 🌟 Key Highlights

- **Markdown is the Single Source of Truth**: No proprietary block-editor database lock-in. Your notes remain plain GitHub Flavored Markdown (GFM) with live preview, syntax-highlighted code blocks, and Mermaid diagrams.
- **Distraction-Free Focus Reader**: Toggle seamless focus reading (`Ctrl+Shift+R`) with spotlight illumination, text-to-speech (TTS), speech-to-text (STT), per-note text direction (LTR/RTL/Auto), and automatic caret return (`Esc`).
- **Connected Second Brain**: Bi-directional wiki links (`[[Note Title]]`) with real-time autocompletion, unresolved link cues, dynamic backlinks panel, and an interactive radial connection graph.
- **Document Ingestion & Annotations**: Upload PDF, Markdown, and plain-text files into a dedicated reader workspace. Highlight passages, add margin notes, and extract text into notes with verifiable source citations.
- **Note-Centric Projects & Planning Rituals**: Manage projects with linked tasks, 2-way Markdown checkbox synchronization (`- [ ]`), drag-and-drop Kanban boards with visual WIP limits, goal implementation intentions (`when/where/how`), and structured daily/weekly review wizards.
- **Selective Project Sharing**: Invite teammates or collaborators by email with granular Read-Only Viewer or Editor roles across the project's entire subtree and private attachments.
- **Grounded, Controllable AI**: Side-by-side diff previews with zero silent mutations—every AI edit, task extraction, or summary requires explicit user review and approval. Compatible with OpenAI, OpenRouter, opencode, NVIDIA Build, Ollama (offline local), and custom OpenAI-compatible endpoints.
- **Zero-Knowledge Encrypted Secret Vault**: Client-side AES-GCM encryption for passwords, API tokens, and confidential notes where the server only ever stores encrypted ciphertext.
- **Rock-Solid Security Baseline**: Password hashing powered by Argon2id, WebAuthn Passkeys / TOTP MFA support, and AES-256-GCM credential encryption at rest with multi-key rotation (`AI_CREDENTIAL_ENCRYPTION_KEYS`).
- **Cross-Platform Delivery**: PWA Web App Manifest, Tauri v2 desktop entry point (macOS, Windows, Linux), and Capacitor v6 mobile configuration (iOS, Android).
- **Self-Hosting & Privacy First**: 1-click Docker deployment with local libSQL (SQLite) or Turso, local or MinIO/S3 private attachment storage, automated Drizzle migrations, backup/restore verification drills, and privacy-safe diagnostics.

---

### 📦 Detailed Feature Breakdown

#### ✍️ Editor & Writing Experience
- **CodeMirror 6 Editor**: High-performance writing surface with instant keystroke responsiveness (<50ms input latency).
- **Unified Inline Formatting**: Live GFM styling, table rendering, heading anchors, inline formatting cues, and syntax-highlighted fenced code blocks.
- **Mermaid Diagrams**: Native rendering for flowcharts, sequence diagrams, state machines, and Gantt charts with isolated error sandboxing.
- **Draft Persistence & Recovery**: Dual-layer autosave combining React transitions, IndexedDB local caching, and unsaved draft recovery with Myers text diff/patch utilities.
- **Native Browser Spellcheck**: Zero-leakage browser spellchecking with dedicated toggles and language selection (English, Persian, system default) in Settings.
- **Keyboard-First Navigation**: Full keyboard navigation across all core actions (`Ctrl+N` new note, `Ctrl+D` daily note, `Ctrl+K` command palette, `Ctrl+\` sidebar toggle, `Ctrl+S` save, `Ctrl+Shift+R` reader).

#### 🧠 Second Brain, Reader & Knowledge Layer
- **Bi-Directional Wiki Links**: Real-time autocomplete for `[[Wiki Links]]`, automatic backlink discovery, and visual unresolved link styling (`/notes/new?title=...`).
- **Radial Knowledge Graph**: Opt-in visual connection graph with keyboard navigation and reduced-motion compliance.
- **Document Reader Workspace**: Ingest PDF, Markdown, and text documents with persistent scroll-state memory and configurable typography.
- **Annotation & Extraction Pipeline**: Multi-color text selection highlights, margin comments, and one-click extract-to-note with source-linked citation metadata.
- **Dynamic Saved Views**: Workspace-scoped filter presets by tag, date range, backlinks, and archive status.

#### 📋 Projects, Tasks & Planning Rituals
- **Project Notes**: Nestable project hierarchies with status tracking, priority, deadlines, and cycle prevention.
- **Checkbox Task Sync**: Direct two-way synchronization between `- [ ]` checklist items in notes and task entities.
- **Kanban Task Boards**: Drag-and-drop task lifecycle boards (`To do`, `In progress`, `Paused`, `Done`) with visual Work-in-Progress (WIP) limit warnings.
- **Implementation Intentions**: Goal decomposition with actionable `when/where/how` and `if-then` behavioral prompts.
- **Daily & Weekly Review Rituals**: Guided step-by-step review wizard triaging overdue, upcoming, and completed tasks.
- **Morning Briefings**: Automated in-app and Telegram morning digests summarizing overdue tasks, today's schedule, and project milestones.
- **Collaborative Project Sharing**: Multi-user sharing with inherited subtree permissions and private attachment access control.
- **Calendar & Daily Notes**: Integrated calendar view with deep-linking to daily notes and optional Google Calendar OAuth synchronization.

#### 🤖 Grounded & Explainable AI Orchestration
- **Explicit, User-Invoked Actions**: Summarize, improve writing, extract structured tasks, generate project plans, create Mermaid diagrams, explain selections, and translate content.
- **Side-by-Side Diff Preview**: Review every suggested modification with clear diff visualizations before accepting (`Replace note`, `Replace selection`, `Append`, or `Save task plan`).
- **Structured Task Plan Dialog**: Interactive task extraction wizard allowing users to edit titles, assign priorities, select target projects/subprojects, and set deadlines before persisting.
- **Workspace-Grounded Retrieval**: Contextual retrieval answering queries with openable source citations and explicit uncertainty indicators.
- **Contextual Project Chat**: Sidebar chat assistant aware of active notes, live project checklists, task boards, and subproject structures.
- **BYOK (Bring Your Own Key) & Privacy Controls**: Support for OpenAI, OpenRouter, opencode, NVIDIA Build, Ollama, and custom endpoints. User-level token budgets, temperature settings, and custom guardrails.

#### 🔐 Security, Privacy & Secret Vault
- **Zero-Knowledge Secret Vault**: Client-side AES-GCM authenticated encryption for passwords, API tokens, and secret notes with a 10-second clipboard auto-clear timeout.
- **Robust Authentication**: Argon2id password hashing (`@node-rs/argon2`), Passkeys (WebAuthn), and TOTP Multi-Factor Authentication.
- **SecretBox Encryption**: User API keys and OAuth tokens encrypted at rest via AES-256-GCM with multi-key keyring rotation (`AI_CREDENTIAL_ENCRYPTION_KEYS`).
- **Strict Authorization & Tenant Isolation**: Every server action and API route enforces session validation and workspace-scoped ownership.
- **Private Attachment Boundary**: File uploads validated for MIME types and stored privately behind authenticated routing.
- **Privacy-Safe Diagnostics**: Anonymized error boundary telemetry and diagnostic verification (`bun run verify:diagnostics`) with zero note text or credential logging.

#### 🌐 Cross-Platform & Self-Hosting Tooling
- **Docker Compose Production Setup**: Container builds with automatic Drizzle migrations and persistent named volumes (`inkest-data`, `inkest-storage`).
- **Cross-Platform Foundations**: Progressive Web App (PWA) manifest, Tauri v2 desktop shell, and Capacitor v6 mobile configuration.
- **Telegram Bot Integration**: Secure link-code pairing for AI notification dispatch and morning briefing delivery.
- **MinIO / S3 Object Storage**: Switchable attachment backend with complete authorization parity.
- **Backup, Restore & Export**: Verified SQLite backup/restore scripts (`bun run backup:local`, `bun run restore:local`), portable ZIP workspace export, and verification drills (`bun run verify:backup`).
- **Curated Themes & Typography**: Light, Dark, Paper, Forest, and Violet palettes paired with Sans, Editorial, and Persian typography.

---

### 🛠️ Quickstart Guide

#### Local Development
```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env.local

# 3. Apply database migrations
bun run db:migrate

# 4. Start the development server
bun run dev
```

#### Production Docker Deployment
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
```

---

### ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl+K` / `Cmd+K` | Open command palette |
| `Ctrl+N` / `Cmd+N` | Create new note |
| `Ctrl+D` / `Cmd+D` | Open today's daily note |
| `Ctrl+\` / `Cmd+\` | Toggle sidebar |
| `Ctrl+S` / `Cmd+S` | Save note immediately |
| `Ctrl+Shift+R` / `Cmd+Shift+R` | Open Focus Reader (`Esc` to exit back to caret) |
| `Ctrl+F` / `Cmd+F` | Find in current note |
| `Ctrl+B` / `Ctrl+I` / `Ctrl+E` | Bold, Italic, Inline Code formatting |

---

### 🧪 Verification & Health Checks

```bash
bun run typecheck          # TypeScript type validation
bun run lint               # ESLint code style audit
bun run build              # Next.js 16 production build
bun run smoke              # HTTP preflight and release smoke test
bun run verify:backup      # Database restore and portable export drill
bun run verify:diagnostics # Error reporting and diagnostic sanitization check
```
