# InkNest — Implementation Progress

A calm, Markdown-first personal workspace. Self-hosted MVP.

## Confirmed decisions

- **Runtime / package manager:** Bun 1.3.13
- **Auth:** Auth.js (next-auth v4) Credentials — email + password, argon2 hash
- **DB:** Drizzle ORM + @libsql/client, local file:local.db (Turso-ready)
- **Editor:** CodeMirror 6 via @uiw/react-codemirror
- **Preview:** react-markdown + remark-gfm + rehype-sanitize; Mermaid strict client-side
- **AI:** OpenAI-compatible; Summarize action with graceful stub (no key = clear message)

## Stack versions

- Next.js 16.2.9, React 19.2.4, TypeScript 5.9.3, Tailwind v4.3.1
- shadcn/ui base-nova style, neutral base, RTL enabled, Base UI primitives
- next-themes 0.4.6, lucide-react, date-fns 4.4.0, mermaid 11.16.0, openai 6.45.0

---

## Phase checklist

### Phase 1 — Foundation & app shell ✅
- [x] Scaffold Next.js (TS, Tailwind v4, App Router, src/, @/* alias, Turbopack)
- [x] shadcn/ui init (base-nova, neutral, RTL) + 19 components
- [x] next-themes + lucide-react
- [x] Renamed package → inknest; added scripts (typecheck, db:*)
- [x] ThemeProvider + light/dark toggle; font variables fixed; serif (Lora) for preview
- [x] App shell: sidebar, topbar (search, command palette, new note, theme toggle), responsive Sheet drawer
- [x] Route groups (app) + (auth); root / redirects to /dashboard
- [x] Empty Dashboard with polished placeholder sections
- [x] .env.local + .env.example; .gitignore extended (/storage, *.db)
- [x] Lint + typecheck + dev boot verified

### Phase 2 — Database & auth ✅
- [x] Drizzle schema (users, workspaces, notes, tags, note_tags, tasks, attachments, note_versions, ai_events)
- [x] drizzle.config.ts; generate + migrate scripts; migration applied
- [x] Auth.js Credentials: signin, signup (+ default workspace), JWT session
- [x] auth.config + middleware protecting (app)/*
- [x] getCurrentUser() helper; all queries scoped by userId
- [x] Sign-in + sign-up pages with working forms
- [x] argon2 hash/verify tested; user+workspace creation tested end-to-end

### Phase 3 — Notes CRUD ✅
- [x] server/notes service (create/update/get/list/archive/unarchive/softDelete/togglePinned), scoped by user/workspace
- [x] Zod validation schemas
- [x] /notes list: search, sort by updated, pinned section, archive toggle, empty state
- [x] /notes/new server component → creates note → redirect /notes/[id]
- [x] /notes/[id] editor page: title + metadata panel + content area
- [x] Debounced autosave (1500ms) + "Saving/Saved" indicator
- [x] Soft delete (deleted_at) + archive
- [x] Archive page listing archived notes
- [x] Owner-only access (getNoteById scoped by userId, notFound() otherwise)

### Phase 4 — Markdown editor & preview ✅
- [x] CodeMirror 6 with Markdown language support
- [x] ModeSwitch: edit / preview / split / focus
- [x] react-markdown + remark-gfm (GFM tables, task lists, strikethrough)
- [x] rehype-sanitize with custom schema (no raw HTML, no event handlers, allow dir + className)
- [x] RTL direction support (dir attribute on editor + preview from note.direction)
- [x] Writing-studio typography (.inknest-prose CSS with serif font, generous spacing)

### Phase 5 — Mermaid support ✅
- [x] MermaidRenderer client-only (next/dynamic ssr:false), securityLevel: "strict"
- [x] Preview intercepts ```mermaid fenced blocks via custom code component
- [x] Loading skeleton + graceful error card (no page crash)
- [x] Error card shows error message + collapsible source

### Phase 6 — Local image uploads ✅
- [x] server/attachments service (save/get/serve/delete)
- [x] Storage layout storage/attachments/{userId}/{year}/{month}/{id}-{name}
- [x] POST /api/attachments: auth + MIME allowlist + size cap → returns markdown snippet
- [x] GET /api/attachments/[id]: auth + ownership, stream file; /storage never public
- [x] Editor image button (ImageUploadButton) → file picker → insert at cursor
- [x] insertTextAtCursor helper for CodeMirror view

### Phase 7 (milestone-capped) — AI Summarize ✅
- [x] server/ai/provider.ts (OpenAI-compatible abstraction via openai SDK)
- [x] server/ai/summarize-note.ts → Markdown output with system prompt
- [x] POST /api/ai route with Zod validation
- [x] AiPanel component: AI menu (dropdown) → loading → review dialog
- [x] Review panel: Copy / Replace selection / Insert / Discard
- [x] ai_events row logged per real action (action, input_hash, output_md, provider, model)
- [x] Graceful stub: no OPENAI_API_KEY → clear "AI not configured" message, 503 status

---

## Known notes / TODOs for later phases

- Internal `[[wiki]]` link parsing (stretch goal, deferred)
- Tags CRUD UI, folder hierarchy, projects/tasks/kanban (Phase 7+ in spec)
- All other AI actions (improve writing, extract tasks, project plan, mermaid, explain, translate)
- Export/backup, command palette (full), keyboard shortcuts, Dockerfile
- Build warning: Turbopack traces `next.config.ts` due to `fs`/`path` usage in attachments service (harmless; expected for local storage)

## Status log

- **2026-06-28** — Plan approved. Phase 1 started: scaffolded Next.js 16 + Tailwind v4, shadcn/ui (base-nova), next-themes, lucide-react.
- **2026-06-28** — Phase 1 complete: app shell (sidebar, topbar, command palette stub, theme toggle), dashboard with placeholder sections, route groups, env files, lint/typecheck/dev all passing.
- **2026-06-28** — Phase 2 complete: full Drizzle schema (9 tables), libSQL client, migration applied, Auth.js Credentials (argon2), session helper, middleware, signin/signup pages. End-to-end auth tested.
- **2026-06-28** — Phase 3 complete: notes service (scoped by user), Zod validation, notes list (search/pinned/archive), editor page with debounced autosave, metadata panel, soft delete + archive.
- **2026-06-28** — Phase 4 complete: CodeMirror 6 editor, react-markdown + remark-gfm + rehype-sanitize preview, edit/preview/split/focus modes, RTL direction support, writing-studio prose CSS.
- **2026-06-28** — Phase 5 complete: Mermaid strict-mode rendering, client-only dynamic import, loading/error states, fenced block interception in preview.
- **2026-06-28** — Phase 6 complete: attachments service (local filesystem storage), upload/serve API routes (auth + ownership), image upload button in editor, insert at cursor.
- **2026-06-28** — Phase 7 (milestone-capped) complete: AI provider abstraction, summarize-note action, /api/ai route, AiPanel UI with review dialog (Insert/Replace/Copy/Discard), ai_events logging, graceful stub without API key.
- **2026-06-28** — Renamed `middleware.ts` → `proxy.ts` (Next.js 16 convention). Production build passes (16 routes). FIRST MILESTONE COMPLETE.
