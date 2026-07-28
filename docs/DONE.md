# Inkest Completed Tasks (Done Log)

> **Purpose:** This document is the single canonical record of all completed tasks in Inkest. It preserves task descriptions, acceptance criteria, completion dates, and verification evidence across both baseline release phases and research-aligned cognitive workspace phases.
>
> For remaining work, see [TODO.md](TODO.md).

---

## 1. Release Baseline & Operations (Phase 0)

- [done] **P0-01 — Create a reproducible release baseline.** Record the current commit, environment, database/storage driver, enabled integrations, test account setup, and known defects in a dated release-checklist note.
  - **Acceptance:** A second agent can start the app and repeat the baseline checks using only repository documentation and the checklist.
  - **Evidence:** 2026-07-14 — added `docs/operations/release-checklist-2026-07-14.md` with commit `05bc813553e18a8c0eb11137f6dbd2e6350b2541`, environment and integration state, disposable two-account setup, repeatable local/Docker checks, and known release blockers. `bun run typecheck` and `bun run build` passed.

- [done] **P0-02 — Reconcile docs with running behavior.** Verify the current product, architecture, operations, README, and environment example against source and a local run; correct only factual drift.
  - **Acceptance:** No documented feature, configuration variable, or deployment command contradicts the implementation.
  - **Evidence:** 2026-07-14 — reconciled `.env.example`, `README.md`, and `docs/OPERATIONS.md` with the active source configuration: attachment storage uses `ATTACHMENT_STORAGE_DRIVER`; Google Calendar uses `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` with its callback derived from `NEXTAUTH_URL`; and the local setup copies `.env.example`. Added AI, Telegram, MinIO, public-URL, and default attachment settings. HTTP 200 returned locally.

- [done] **P0-03 — Add a release smoke-test script/checklist.** Cover signup or sign-in, note create/edit/reload, project task completion, attachment upload/download, export, AI missing-provider handling, and disabled integration states.
  - **Acceptance:** The checklist names expected results and can be run on a clean local or container deployment without hidden setup steps.
  - **Evidence:** 2026-07-14 — added `scripts/release-smoke.mjs`, exposed as `bun run smoke`; added `docs/operations/release-smoke-test.md`. Local preflight passed all 5 HTTP checks against `http://127.0.0.1:3000`; `bun run typecheck` and `bun run build` passed.

- [done] **P0-04 — Define the beta feedback loop.** Add a lightweight, privacy-respecting feedback route, bug template, severity definitions, and triage cadence.
  - **Acceptance:** Beta users can report a defect with reproduction steps and it can be classified as release-blocking, high, normal, or enhancement.
  - **Evidence:** 2026-07-14 — added GitHub `Beta bug report` form and security-advisory route; documented redaction rules and severity definitions in `docs/product/beta-feedback.md`.

---

## 2. Editor & Writing Experience (Phase 1)

- [done] **P0-10 — Profile and fix typing lag.** Measure input latency and long tasks on short, medium, and large notes before changing code; remove the proven bottlenecks in editor state, preview rendering, autosave, or sidebar updates.
  - **Acceptance:** Representative typing remains responsive with no visible keystroke delay; measurements recorded in `docs/OPERATIONS.md`.
  - **Evidence:** 2026-07-14 — profiled Chrome DevTools traces; worst renderer input handling was 44.5, 39.6, and 46.7 ms (under 50 ms budget). Scheduled parent note updates as a React transition in `src/components/notes/note-editor.tsx`.

- [done] **P0-11 — Split editor-route JavaScript by measured cost.** Keep CodeMirror, Markdown preview, Mermaid, AI panel, and nonessential panels from blocking initial note editing where safe.
  - **Acceptance:** Production measurements show a meaningful reduction from the recorded 818 KiB editor script transfer without regression.
  - **Evidence:** 2026-07-14 — made AI panel interaction-loaded; note-route manifest dropped to 323.5 KiB gzip initial script (down from 818 KiB transfer). `bun run typecheck` and `bun run build` passed.

- [done] **P0-12 — Repair Markdown code-block editing.** Reproduce caret placement/selection issues and rounded-border per line visual defect; fix editor integration and add syntax highlighting.
  - **Acceptance:** Users can place caret, select, paste, edit, and exit fenced code blocks cleanly in light, dark, LTR, and RTL modes.
  - **Evidence:** 2026-07-18 — replaced fenced-block replacement widget path with native editing; added parser-backed syntax highlighting and code-block formatter.

- [done] **P0-13 — Unify editing and reading into one note surface.** Replace separate read/edit mental model with an inline editing and preview experience, while preserving a distraction-free reader overlay.
  - **Acceptance:** User can write and inspect formatted output without mode confusion; shortcut `Ctrl+Shift+R` opens Reader.
  - **Evidence:** 2026-07-18 — removed separate Read mode. Notes remain on CodeMirror surface with inline formatting; Reader opens super-focus overlay (`Esc` returns caret).

- [done] **P1-14 — Improve large-Markdown paste.** Detect substantial Markdown pastes, offer a fast preview/formatting path, and retain immediate return to source editing.
  - **Acceptance:** Large paste does not lock editor; user can decline assist, undo, and keep source intact.
  - **Evidence:** 2026-07-18 — large pastes remain native CodeMirror edits, offering an optional Reader preview using current post-paste document.

- [done] **P1-15 — Merge and harden focus experiences.** Unify focus and super-focus into one discoverable focus reader with keyboard shortcuts and reduced-motion support.
  - **Acceptance:** One clear focus entry point, keyboard shortcut (`Ctrl+Shift+R`), accessible exit control (`Esc`), and reduced-motion styling.
  - **Evidence:** 2026-07-18 — kept focus reader as single focus entry point; added accessible names and preserved reduced-motion CSS.

- [done] **P1-16 — Complete keyboard-first writing.** Implement core shortcuts for create/search/open/save/focus/formatting/navigation.
  - **Acceptance:** Every core writing operation has a discoverable keyboard path and command palette support.
  - **Evidence:** 2026-07-18 — mapped shortcuts for bold, italic, strikethrough, code in CodeMirror; documented shortcuts in `README.md`.

- [done] **P1-17 — Add spelling and writing suggestions with user control.** Browser-native spellcheck controls without implicit AI text submission.
  - **Acceptance:** Typo suggestions work for configured languages, can be disabled, and never send text to AI implicitly.
  - **Evidence:** 2026-07-18 — added native spellcheck controls (browser default, English, Persian) in Settings; passed preference directly to CodeMirror DOM.

---

## 3. Product Coherence, Navigation & UI (Phase 2)

- [done] **P0-20 — Establish and apply one design system.** Audit landing page, application shell, settings, editor, panels, and empty states.
  - **Acceptance:** Shared tokens and reusable patterns in light/dark modes documented in `docs/product/design-system.md`.
  - **Evidence:** 2026-07-18 — created `docs/product/design-system.md`; added shared semantic tokens and `app-page` layouts in `src/app/globals.css`.

- [done] **P1-21 — Refine settings and AI setup UX.** Group settings by purpose, clarify instance vs user config, and make provider setup clear.
  - **Acceptance:** New user can configure OpenAI-compatible provider or understand AI status easily.
  - **Evidence:** 2026-07-18 — grouped Settings into account, writing, AI setup, data, connected services, deletion; validated keys server-side.

- [done] **P1-22 — Make the right sidebar useful and predictable.** Redesign around contextual note/project properties, links, tasks, AI, and tags.
  - **Acceptance:** Contextual panel with collapse control, remembered open state, and stable writing surface.
  - **Evidence:** 2026-07-18 — rebuilt metadata rail into contextual right rail; added task counts, backlinks, tags, and calendar context.

- [done] **P1-23 — Complete daily/calendar information architecture.** Consolidate navigation around Home and Calendar.
  - **Acceptance:** Opening any day reaches its daily note; clear deep links and empty states.
  - **Evidence:** 2026-07-18 — consolidated persistent navigation around Home and Calendar; handled date parameters cleanly.

- [done] **P1-24 — Support nested projects intentionally.** Allow project creation and parent assignment with cycle prevention.
  - **Acceptance:** Hierarchy appears consistently in tree, project, and task views without descendant cycles.
  - **Evidence:** 2026-07-18 — added server-side parent validation, descendant-cycle prevention, and recursive sidebar rendering.

- [done] **P1-25 — Accessibility and responsive audit.** Test keyboard-only, screen reader labels, focus order, contrast, and mobile layouts.
  - **Acceptance:** Critical violations fixed; skip link, landmark labels, and keyboard-operable sidebar separator implemented.
  - **Evidence:** 2026-07-18 — added application skip link, labelled main landmark, and keyboard-operable sidebar separator.

- [done] **P2-26 — Add curated themes and font choices.** Add theme and typography customization using shared design tokens.
  - **Acceptance:** User preferences persist, satisfy contrast rules, and work across editor and app shell.
  - **Evidence:** 2026-07-19 — added Light/Dark/Paper/Forest/Violet palettes and sans/editorial/Persian writing fonts.

- [done] **P2-27 — Improve notifications based on real workflows.** In-app activity notifications and opt-in task alerts with deduplication.
  - **Acceptance:** Opt-in preferences, deduplicated alert keys, Telegram integration, and in-app Settings notices.
  - **Evidence:** 2026-07-19 — added user-scoped activity notifications, migration `0004_pretty_the_leader.sql`, and Telegram alert handling.

---

## 4. AI Orchestration, Security & Privacy Controls (Phase 3)

- [done] **P0-30 — Audit AI data and configuration contract.** Document input, provider selection, prompts, token limits, and persistence.
  - **Acceptance:** `docs/ARCHITECTURE.md` accurately states outbound data and configuration rules.
  - **Evidence:** 2026-07-19 — documented outbound context, prompt envelopes, JSON mode, and failure modes in `ARCHITECTURE.md`.

- [done] **P0-31 — Encrypt stored user provider credentials.** AES-256-GCM encryption for stored API keys and OAuth tokens.
  - **Acceptance:** Credentials encrypted at rest with `AI_CREDENTIAL_ENCRYPTION_KEYS` key ring; redacted from logs and never returned to client.
  - **Evidence:** 2026-07-19 — implemented SecretBox AES-256-GCM key rotation and lazy re-encryption; verified with `secret-box.test.ts`.

- [done] **P1-32 — Add user-editable AI orchestration controls.** Per-user temperature, token budgets, instructions, and guardrails.
  - **Acceptance:** Server-side validation of token limits and instructions; user-level default resets.
  - **Evidence:** 2026-07-19 — added Settings controls for temperature, token budgets, and guardrails with strict server validation.

- [done] **P1-33 — Integrate AI into right-side workflow.** Contextual AI panel supporting review-before-apply diff previews.
  - **Acceptance:** Proposal shows original vs proposed diff; requires explicit append, replace, or task creation.
  - **Evidence:** 2026-07-19 — integrated AI panel with note context rail; source note validated before applying edits.

- [done] **P1-34 — Complete AI task extraction and project planning.** Review destination project, status, priority, and due date.
  - **Acceptance:** Editable task preview dialog; prevents duplicate projects or cyclic hierarchy.
  - **Evidence:** 2026-07-19 — added explicit planning review dialog before saving extracted tasks; verified project ownership and title checks.

- [done] **P1-35 — Add concise AI onboarding and privacy hints.** Contextual first-use onboarding guide and privacy documentation.
  - **Acceptance:** Contextual help dismissible by user; links to `/help#ai-privacy`.
  - **Evidence:** 2026-07-19 — added first-use AI panel guide and detailed privacy disclosure at `/help#ai-privacy`.

- [done] **P2-36 — Bound agentic workflows before implementation.** Define bounds for multi-step AI execution.
  - **Acceptance:** Approved design preventing autonomous external side-effects, capping iterations, execution time, and token cost.
  - **Evidence:** 2026-07-19 — recorded read-only boundary in `docs/architecture/agentic-workflow-boundary.md` (3-call limit, 90 s timeout, 24k token cap, no autonomous writes).

- [done] **P2-37 — Research semantic search and note-aware chat.** Evaluate local vs hosted vector index trade-offs.
  - **Acceptance:** Written go/no-go decision document with local-first opt-in proposal.
  - **Evidence:** 2026-07-19 — recorded decision in `docs/architecture/semantic-search-decision.md` approving lexical search baseline and setting strict opt-in vector rules.

---

## 5. Security Baseline, Audits & Diagnostics (Phase 4)

- [done] **P0-40 — Run a release security audit.** Trace authorization on all server actions and API routes.
  - **Acceptance:** Authorization verified across notes, tasks, exports, attachments, AI events, Calendar OAuth, and Telegram webhooks.
  - **Evidence:** 2026-07-19 — fixed cross-user tag disclosure, secured Telegram link codes, enforced size limits on attachment uploads, and sanitized OAuth handling.

- [done] **P0-42 — Prove backup, restore, and export.** Verify backup/restore scripts and ZIP export portability.
  - **Acceptance:** Reproducible database and attachment backup/restore drill; verified Markdown export integrity.
  - **Evidence:** 2026-07-19 — added backup/restore commands documented in `docs/operations/backup-restore.md`; verified database restore and ZIP export with `bun run verify:backup`.

- [done] **P1-45 — Establish error monitoring and privacy-safe diagnostics.** Standardized error reporting without sensitive data leakage.
  - **Acceptance:** Diagnostics sanitize note content, user IDs, credentials, and URL query strings.
  - **Evidence:** 2026-07-19 — added error boundary diagnostics in `docs/operations/diagnostics.md`; verified with `bun run verify:diagnostics`.

- [done] **P1-46 — Make an end-to-end encryption decision.** Threat-model zero-knowledge vault vs Markdown server capabilities.
  - **Acceptance:** Written decision approved for app architecture.
  - **Evidence:** 2026-07-26 — approved No-Go for full-app Markdown E2EE (to preserve search/AI) and Go for isolated Phase R6 zero-knowledge secret vault in `docs/architecture/e2ee-decision.md`.

---

## 6. Research Foundations & Data Model (Phase R0)

- [done] **R0-01 — Audit current PKB, reader, and AI-grounding surface.** Audit existing wiki links, backlinks, tags, saved views, attachments, focus reader, and AI context selection against requirements.
  - **Acceptance:** Dated audit note listing present/partial/absent capabilities.
  - **Evidence:** 2026-07-23 — created `docs/audits/audit-pkb-reader-ai.md` inventorying PKB, reader, and AI surfaces.

- [done] **R0-02 — Establish the normalised data model and stable IDs.** Schema for notes, documents, annotations, extracts, citations, tasks, projects, journal entries, vault items, AI actions, and audit logs.
  - **Acceptance:** Drizzle migration created; stable entity IDs across export/import.
  - **Evidence:** 2026-07-23 — added schema tables to `src/server/db/schema.ts`; generated migration `drizzle/0005_curvy_pyro.sql`; ran `bun run db:migrate`.

- [done] **R0-03 — Maintain a versioned threat model.** Document threats: server compromise, XSS, stolen credentials, prompt injection, malicious uploads, and device loss.
  - **Acceptance:** Versioned threat model mapping threats to mitigations.
  - **Evidence:** 2026-07-23 — published Threat Model v1.0.0 in `docs/architecture/threat-model.md`.

- [done] **R0-04 — Define and enforce performance budgets (NFR-PERF).** Establish p95 latency budgets: note open (<500 ms), local search (<300 ms), page navigation (<250 ms), reader navigation (<300 ms).
  - **Acceptance:** Performance budgets documented in `docs/OPERATIONS.md` with repeatable measurement strategy.
  - **Evidence:** 2026-07-23 — recorded explicit p95 budgets and measurement methods in `docs/OPERATIONS.md`.

- [done] **R0-05 — Establish progressive-enhancement baseline (NFR-PROGRESSIVE).** Ensure core routes render cleanly on initial SSR baseline.
  - **Acceptance:** Sign-in, reading notes, navigation, and help pages work via SSR baseline before client JS hydrates.
  - **Evidence:** 2026-07-23 — verified App Router SSR rendering on `/signin`, `/notes/[id]`, help, and export endpoints; verified with `bun run build`.

---

## 7. Second Brain: Linking, Backlinks & Re-Finding (Phase R1)

- [done] **R1-01 — Complete wiki links and backlinks (FR-LINKS).** `[[Link]]` syntax with autocomplete, unresolved link styling, and instant backlink updates.
  - **Acceptance:** Bidirectional linking; unresolved link affordance (`/notes/new?title=...`); backlink panel updates on edit.
  - **Evidence:** 2026-07-23 — added CodeMirror `@codemirror/autocomplete` extension for `[[` wiki link suggestions and unresolved link styling in `src/components/editor/markdown-editor.tsx`.

- [done] **R1-02 — Note relationships and saved views (FR-LINKS).** Filter notes by tag, date range, and backlinks; save custom view presets.
  - **Acceptance:** Custom saved views filter notes dynamically; workspace-scoped and user-owned.
  - **Evidence:** 2026-07-23 — created `/views` route and server view services (`src/server/views/service.ts`).

- [done] **R1-03 — Re-finding surfaces (FR-PKB).** Pinned notes, starred collections, and command palette history for fast retrieval.
  - **Acceptance:** Median time-to-refind < 30 s without full-text guessing.
  - **Evidence:** 2026-07-23 — integrated fast re-finding bar on `/notes` and instant recent note search in `CommandMenu` (`Mod+K`).

- [done] **R1-04 — Lightweight graph/connection view (P2).** Radial visual relationship graph for open note connections.
  - **Acceptance:** Opt-in view, keyboard navigable, reduced-motion compliant, rendering note link graph cleanly.
  - **Evidence:** 2026-07-23 — built `src/components/notes/lightweight-graph-view.tsx` with full keyboard navigation and reduced-motion styling.

---

## 8. Reader & Workspace Ingestion (Phase R2)

- [done] **R2-01 — Document import for PDF and plain text (FR-RESEARCH).** Upload PDF, plain-text, and Markdown documents into workspace reader.
  - **Acceptance:** Drag-and-drop ingestion with MIME, file type, and size validation; private attachment storage.
  - **Evidence:** 2026-07-23 — created `/reader` and `/reader/[id]` routes with private attachment ingestion in `src/server/documents/service.ts`.

- [done] **R2-02 — Reader engine with stable location and typography (FR-READER).** Paged/continuous reading modes, typography controls, and position restore.
  - **Acceptance:** Reopening document restores exact scroll position; persistent font and layout choices.
  - **Evidence:** 2026-07-23 — added font options, progress indicator, and scroll offset restoration in `src/components/reader/document-reader-view.tsx`.

- [done] **R2-03 — Highlighting and annotation (FR-RESEARCH/FR-READER).** Multi-color text selection highlights and margin annotations.
  - **Acceptance:** Highlights anchor stably on reopen; private user-scoped annotations.
  - **Evidence:** 2026-07-24 — created annotation drawer and multi-color selection toolbar in `src/server/documents/annotations-service.ts`.

- [done] **R2-04 — Extract-to-note with source-linked citation (FR-RESEARCH).** Convert highlighted passages into extract notes with reopenable citations.
  - **Acceptance:** Extract note creates linked `citations` record; source deletion degrades gracefully to auditable reference.
  - **Evidence:** 2026-07-24 — implemented `extractAnnotationToNote` with `citations` linking back to original document passage.
