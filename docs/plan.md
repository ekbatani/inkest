# Inkest — Implementation Plan

Grounded in the current codebase (Next.js 16.2, React 19, Bun, Drizzle + libSQL, CodeMirror 6,
7 AI actions via OpenAI-compatible providers, env-based Telegram). Covers every open item in
`docs/tasks.md` plus suggested additions, ordered so each phase ships something usable.

Guiding principles (from tasks.md, treated as constraints for every phase):

- **AI features first** — every phase that touches UI should make an AI entry point more visible.
- **Minimal & fast** — no new heavy dependencies; prefer CSS, Web APIs, and lazy loading.
- **Open source, self-hosted free, cloud paid** — nothing may hard-depend on a paid service.

---

## Phase 1 — Rename sweep & baseline ✦ small

`package.json` is already `inkest`, but the task exists because remnants remain.

- [ ] Grep the repo for old names (`notes-app`, previous title, etc.) in metadata, README,
      Docker labels, `layout.tsx` `<title>`, manifest, env examples; replace with **Inkest**.
- [ ] Add `metadata` export in `src/app/layout.tsx` with proper title template
      (`%s · Inkest`), description, and OpenGraph defaults (needed by the landing page anyway).
- [ ] Record a performance baseline before we start optimizing: `next build` route sizes,
      Lighthouse on `/dashboard` and `/notes/[id]`. Save numbers in `docs/perf.md`.

## Phase 2 — Landing page with spotlight hero ✦ large

Root `/` currently redirects to `/dashboard`. Replace with a public marketing page
(agno-OS-style: dark, spacious, monospace accents, spotlight hero).

- [ ] New route group `(marketing)` with its own layout (no app shell, no auth).
      `/` shows landing when signed out; signed-in users still land on `/dashboard`
      (check session in the page, redirect if present).
- [ ] **Spotlight hero**: pure CSS/JS — a radial-gradient that tracks the pointer
      (`background: radial-gradient(600px at var(--x) var(--y), …)`), falls back to a slow
      auto-pan animation on touch devices and `prefers-reduced-motion`.
- [ ] Sections: hero (tagline + CTA "Start writing" → signup), **AI showcase animation**
      (see below), features grid (markdown, projects/tasks, calendar, tags, RTL, self-hosted),
      open-source/self-host section (docker-compose snippet in a copy-able code block),
      pricing (Self-hosted: free forever / Cloud: coming soon), footer.
- [ ] **AI functionality animation** (tasks: "animation of the application in the landing
      page, focused on AI"): a fake editor card that types a rough note, then plays the AI
      review flow (Improve writing → diff-style highlight → Extract tasks → checklist pops in).
      Implement as a scripted CSS/`requestAnimationFrame` sequence over real DOM — no video,
      no Lottie, keeps the page light. Pause when off-screen (`IntersectionObserver`).
- [ ] SEO: metadata, OG image (static PNG in `/public`), sitemap/robots.

## Phase 3 — Super focus reading mode (spotlight) ✦ medium

Focus mode exists in the editor mode switch; this adds a distinct **reading** experience.

- [ ] "Super focus" toggle in preview/focus mode: page chrome dims to near-black overlay;
      a spotlight (radial gradient mask, ~3–4 lines tall) follows the reading position.
- [ ] Two tracking modes: follow the pointer, or **auto-advance** — spotlight follows the
      active paragraph as the user scrolls (paragraph nearest an anchor line gets full
      brightness, siblings dimmed via CSS `mask-image`/opacity, cheap to render).
- [ ] Controls: `Esc` exits, visible exit button (learned from the old focus-mode bug),
      spotlight radius slider in a small floating toolbar, respects `prefers-reduced-motion`.
- [ ] Persist preference per user in editor prefs (settings already has an editor prefs block).

## Phase 4 — AI provider & help expansion ✦ medium

AI is the priority feature; make it easier to configure and reach.

- [ ] **Add opencode as a provider**: new entry in `src/lib/ai/providers.ts`
      (OpenAI-compatible: opencode zen gateway `https://opencode.ai/zen/v1`, sensible default
      model, key placeholder). Verify against their current docs at implementation time.
- [ ] Also add **Ollama** preset (`http://localhost:11434/v1`) — self-hosters get free local
      AI, which strengthens the open-source story. (suggestion)
- [ ] **Help with AI / key setup** (tasks 12 & 20): a `/help` page with short illustrated
      guides — "Get an OpenAI/OpenRouter/opencode key", "Run local AI with Ollama",
      "Connect Telegram". Link it from the settings AI section and from the AI panel's
      "AI not configured" state (turn the dead-end 503 message into a "Set it up →" link).
- [ ] **Ask AI from the command palette** (suggestion): Ctrl+K → "Ask AI…" runs
      explain/summarize on the current note without opening the dropdown. AI becomes
      one keystroke away, which is what "AI features must be in priority" should mean.
- [ ] Encrypt stored per-user API keys at rest (libsql column is plaintext today) using a
      server secret (`AUTH_SECRET`-derived key, AES-GCM). (suggestion)

## Phase 5 — Telegram linking & notifications ✦ medium

Today Telegram is a single global `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` env pair
(`src/server/notifications/telegram.ts`) — fine for self-host, wrong for multi-user.

- [ ] Per-user linking: settings section "Connect Telegram" generates a one-time code;
      user sends `/start <code>` to the bot; a webhook route (`/api/telegram/webhook`)
      or a `getUpdates` poll (self-host without public URL) stores `chatId` on the user.
- [ ] Notification preferences per user: AI action results (exists), task due reminders,
      daily-note nudge. Store as a JSON prefs column; default everything off except AI results.
- [ ] Task due reminders need a scheduler: a lightweight interval in the server runtime
      (self-host) checking due tasks every N minutes — no external cron dependency.
- [ ] Keep env-var mode as fallback so current single-user deployments keep working.

## Phase 6 — Text-to-speech ✦ small

- [ ] "Listen" button in preview mode using the **Web Speech API**
      (`speechSynthesis`) — zero cost, works self-hosted, no key needed.
      Play/pause, highlight the sentence currently being read (ties in nicely with the
      spotlight mode — auto-advance the spotlight while reading aloud). Voice/rate picker
      persisted in editor prefs.
- [ ] Strip markdown to plain text for speech via the existing preview pipeline.
- [ ] Optional later: OpenAI-compatible TTS endpoint for users with a key (better voices),
      behind the same provider config. Not required for v1.

## Phase 7 — Big-markdown paste → instant preview ✦ small

- [ ] In `markdown-editor.tsx`, add a CodeMirror paste handler: if pasted text is large
      (> ~1,500 chars) **and** looks like markdown (headings/lists/fences heuristic),
      insert it and immediately switch the mode to preview, with a toast
      ("Pasted as markdown — Edit"). One-click back to edit; per-user opt-out in prefs.

## Phase 8 — Micro-animations, icons & logo ✦ medium

- [ ] **Logo/icon**: design an SVG mark (ink drop + nib forming an "i" is the obvious
      direction). Deliver: favicon set, `apple-touch-icon`, OG image, sidebar logo.
      SVG is hand-editable and animatable — no design-tool dependency.
- [ ] **Animated icons**: animate on interaction only (save indicator morph, AI sparkle
      pulse while running, sidebar collapse chevron, checkbox check-draw). Use CSS
      transitions/`@keyframes` on the existing lucide SVGs — no animation library.
- [ ] App-wide micro-animations: view transitions between routes (Next.js supports the
      View Transitions API), list item enter/exit fades, dialog spring. All gated on
      `prefers-reduced-motion`, all CSS-only. Budget: zero new JS dependencies.

## Phase 9 — Performance pass ✦ medium

Measured against the Phase 1 baseline; "as fast and light as possible" as an exit criterion.

- [ ] Lazy-load heavy chunks: Mermaid is already dynamic; verify CodeMirror and the
      markdown preview split correctly; `next build` route-size diff per phase.
- [ ] Fonts: subset Lora + UI font, `display: swap`, preload.
- [ ] DB: check indexes for hot queries (notes list by workspace+updated, tags filter).
- [ ] Cache headers on `/api/attachments/[id]` (immutable content by id).
- [ ] Target numbers: landing page < 100 KB first load JS, editor route interactive < 2 s
      on mid-range hardware, Lighthouse ≥ 95 on the landing page.

## Phase 10 — Open source & monetization scaffolding ✦ medium

- [ ] License (AGPL-3.0 recommended for "free self-host, paid cloud"; MIT if maximum
      adoption matters more than protecting the cloud offering — decide before publishing).
- [ ] Repo hygiene for going public: CONTRIBUTING.md, issue templates, screenshots in
      README, one-command `docker compose up` quick start (already close), demo seed data.
- [ ] Cloud plan groundwork only (no billing yet): make sure nothing assumes single-tenant
      (it's already workspace-scoped), document the env-vs-per-user config split
      (AI keys and Telegram already follow this pattern). Stripe integration is its own
      later project — keep it out of scope until there's a deployed cloud.

---

## Suggested additions (mine, beyond tasks.md)

Folded into phases above: Ollama provider (P4), command-palette AI (P4), API-key
encryption (P4), TTS + spotlight read-along (P6). Additional candidates, deliberately
**not** scheduled to honor "keep the features minimal":

1. **PWA manifest + install** — makes it feel native on mobile/desktop for near-zero code;
   pairs with the icon work in Phase 8. Cheap, recommend doing with Phase 8.
2. **`[[wikilink]]` autocomplete** in the editor (note links already render; typing them
   is manual). Small, high daily-use value.
3. **Import markdown folder** (already in PROGRESS.md post-MVP list) — critical for landing
   users migrating from Obsidian once the landing page starts bringing traffic.
4. Skip for now: embeddings/semantic search, AI chat over notes, theme customization —
   real value but each violates "minimal" until the above ships.

## Suggested order & rationale

1 (baseline) → 7 (paste, tiny win) → 4 (AI priority) → 3 (super focus — the signature
feature) → 6 (TTS, builds on 3) → 8 (icons/animations) → 2 (landing page — built last so
the AI showcase animation demos real, polished features) → 5 (Telegram) → 9 (perf gate)
→ 10 (go public).

Landing page (2) is intentionally after the product polish phases: its hero animation
shows the AI flow, so the flow should look final first. If public launch is urgent,
swap 2 earlier and use the current UI in the showcase.
