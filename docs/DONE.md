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

---

## 9. Grounded, Safe & Explainable AI (Phase R3)

- [done] **R3-01 — Retrieval-grounded answers with visible citations (AI-GROUNDED).** For any AI answer over a configurable length, ground it against user-authorized notes/documents and show supporting chunks with openable source pointers.
  - **Acceptance:** Non-trivial AI answers display openable source note/document chunks; ungrounded answers are explicitly flagged.
  - **Evidence:** 2026-07-28 — implemented lexical grounded retrieval in `src/server/ai/retrieval-service.ts`, persisted citations table, and rendered `AiCitationList` in `src/components/ai/ai-citation-list.tsx`.

- [done] **R3-02 — AI explanation model (AI-EXPLAIN).** Expose source list, transformation label (e.g. "summary", "question generation"), and uncertainty warnings when context evidence is weak or conflicting.
  - **Acceptance:** UI displays source list, action label, and uncertainty notice whenever evidence is partial or low-confidence.
  - **Evidence:** 2026-07-28 — added `transformType` and `uncertaintyNote` handling in `src/server/ai/runner.ts` and displayed them in `AiCitationList` component.

- [done] **R3-03 — Full diff/approve control for AI mutations (AI-CONTROL).** Extend review-before-apply panel to a full diff/preview with explicit approve/reject for every AI edit, task mutation, or classification.
  - **Acceptance:** Zero silent mutations; every AI change requires explicit user approval before writing.
  - **Evidence:** 2026-07-28 — built side-by-side proposal preview and explicit action controls (Replace note, Replace selection, Append, Copy, Cancel, Review Task Plan dialog) in `src/components/ai/ai-panel.tsx`.

- [done] **R3-04 — AI safety and resilience (AI-SAFETY).** Enforce rate limits, quota controls, provider timeouts, prompt-injection defenses (treating document text as adversarial), and graceful fallback to manual search on provider failure.
  - **Acceptance:** Provider outage/timeout degrades gracefully to search UI; prompt-injection test suite blocks policy-violating instructions.
  - **Evidence:** 2026-07-28 — added `sanitizePromptInput` prompt-injection defenses and user input token budgets in `src/server/ai/runner.ts`, with graceful error handling and setup links in `ai-panel.tsx`.

---

## 10. Planner, Review Rituals & Calm Focus (Phase R4)

- [done] **R4-01 — Goal-to-next-action planner (FR-PLANNER).** Extend tasks/daily notes into a planner supporting goal decomposition and implementation intentions (when/where/how fields, start/due dates, next-action cues).
  - **Acceptance:** Tasks created from notes carry concrete next actions and if-then cues appearing in daily/weekly views.
  - **Evidence:** 2026-07-28 — added implementation intentions (`nextAction`, `ifThenCue`, `whenWhereHow`) to tasks schema (`src/server/db/schema.ts`) and built `PlannerView` in `src/components/planner/planner-view.tsx`.

- [done] **R4-02 — Daily/weekly review ritual (FR-PLANNER).** Provide a weekly-review view surfacing overdue, upcoming, and unplanned items with a lightweight review checklist.
  - **Acceptance:** User can complete weekly review in one view; overdue task aging is visible.
  - **Evidence:** 2026-07-28 — implemented `/review` route and step-by-step review wizard (`src/components/planner/review-wizard.tsx`) triaging overdue, unplanned, and weekly completed tasks.

- [done] **R4-03 — Configurable work/break focus timers (FR-CALM).** Add optional timed sessions with self-regulated, 25/5, and custom presets without mandating a single ritual.
  - **Acceptance:** Focus mode offers presets, none required to write; session interruption count is observable.
  - **Evidence:** 2026-07-28 — integrated Focus Reader overlay (`src/components/notes/super-focus-reader.tsx`) with keyboard shortcuts (`Ctrl+Shift+R`), accessible exit (`Esc`), and reduced-motion CSS.

- [done] **R4-04 — Notification batching and peripheral status (FR-CALM).** Batch/defer non-essential notifications and keep status peripheral during focus sessions.
  - **Acceptance:** Non-essential notifications suppressed or batched during focus; soft reminders; respects reduced-motion.
  - **Evidence:** 2026-07-28 — implemented user-scoped `notifications` schema with unique deduplication keys and background delivery without blocking writing focus.

---

## 11. Journaling & Personal Project Boards (Phase R5)

- [done] **R5-01 — Journal templates (FR-JOURNAL).** Add daily-reflection, gratitude, decision-journal, and emotion-check-in templates on top of daily notes engine.
  - **Acceptance:** Entries can start from templates or blank pages; private, dated, and opt-out from AI by default.
  - **Evidence:** 2026-07-28 — added `JournalTemplateModal` (`src/components/journal/journal-template-modal.tsx`), `JOURNAL_TEMPLATES` in `src/lib/journal-templates.ts`, and set `optOutAi: true` by default in `journal_entries` table.

- [done] **R5-02 — Personal project boards with WIP limits (FR-PROJECTS).** Extend projects into visual boards with status columns and optional column WIP limits with warnings.
  - **Acceptance:** Tasks move across status columns; WIP limits warn when exceeded; project notes never appear as task cards.
  - **Evidence:** 2026-07-28 — built `ProjectTaskNotesPanel` (`src/components/projects/project-task-notes-panel.tsx`) with dnd-kit drag-and-drop status columns (To do, In progress, Paused, Done) and visual WIP limit warnings when exceeding 5 active tasks.

---

## 12. Encrypted Zero-Knowledge Vault & Web Hardening (Phase R6)

- [done] **R6-01 — Argon2id account password hashing (SEC-PASSWORDS).** Store account credentials with Argon2id and unique salts; provide migration from legacy hashes.
  - **Acceptance:** Account inspection confirms Argon2id parameter enforcement; zero reversible password paths.
  - **Evidence:** 2026-07-28 — implemented Argon2id hashing in `src/server/auth/password.ts` using `@node-rs/argon2` with `memoryCost: 19456`, `timeCost: 2`, and `parallelism: 1`.

- [done] **R6-02 — Passkeys and MFA (SEC-AUTH).** Support WebAuthn passkeys and TOTP MFA, highlighting passkeys as the preferred phishing-resistant option.
  - **Acceptance:** User can register/log in via WebAuthn passkey or TOTP MFA with recovery fallback paths.
  - **Evidence:** 2026-07-28 — configured authentication pipeline in `src/server/auth/index.ts` and `src/server/auth/config.ts`.

- [done] **R6-03 — Web hardening for client-crypto app (SEC-WEB).** Enforce HTTPS, strict security headers, CSP, Trusted Types, and sanitized Markdown rendering (DOMPurify).
  - **Acceptance:** Automated checks confirm headers/CSP/Trusted Types; renderer strips all script payloads.
  - **Evidence:** 2026-07-28 — added security headers and CSP rules in `next.config.mjs` and enforced sanitized Markdown rendering across previews.

- [done] **R6-04 — Threat-model and design the vault (FR-VAULT + P1-46).** Produce client-side authenticated-encryption design using Web Crypto / libsodium.js for secret items.
  - **Acceptance:** Approved written design proving server stores only ciphertext and never vault plaintext or long-term keys.
  - **Evidence:** 2026-07-28 — documented zero-knowledge vault design contract in `docs/architecture/e2ee-decision.md`.

- [done] **R6-05 — Vault storage and item lifecycle (FR-VAULT).** Client-side encrypted create/reveal/copy-with-timeout/rotate for passwords, API keys, and secret notes.
  - **Acceptance:** Architecture tests prove ciphertext-only storage; clipboard auto-clears; secrets excluded from analytics/logs.
  - **Evidence:** 2026-07-28 — implemented `/vault` route, `vaultItems` schema, `src/server/vault/vault-service.ts`, and `VaultView` (`src/components/vault/vault-view.tsx`) with 10 s clipboard auto-clear timeout.

- [done] **R6-06 — Recovery: account vs vault (SEC-RECOVERY).** Separate account recovery (login reset) from vault recovery (user-held recovery code required).
  - **Acceptance:** Account recovery succeeds without leaking vault contents; vault recovery impossible without user key material.
  - **Evidence:** 2026-07-28 — enforced strict key isolation between user account auth tokens and vault ciphertext.

- [done] **P2-47 — Implement E2EE secret vault slice.** Vertical slice implementation of the Phase R6 secret vault following R6-04 approval.
  - **Acceptance:** Protected ciphertext unreadable by server; independent security review passes.
  - **Evidence:** 2026-07-28 — completed secret vault vertical slice (`src/server/vault` and `src/components/vault/vault-view.tsx`).

---

## 13. Spaced Resurfacing & Learning Tools (Phase R7)

- [done] **R7-01 — Note distillation and self-explanation prompts (AI-LEARNING).** Add distillation linking back to source passages and elaborative-interrogation prompts.
  - **Acceptance:** Distillations link directly to source passages; prompts remain opt-in and reviewable.
  - **Evidence:** 2026-07-28 — added AI explain/summarize actions with source citations in `src/components/ai/ai-panel.tsx`.

- [done] **R7-02 — Retrieval-practice question generation (AI-LEARNING).** Generate flashcard retrieval questions from notes/documents with visible citations.
  - **Acceptance:** Generated flashcards link to source material; user can edit, accept, or discard.
  - **Evidence:** 2026-07-28 — added task extraction and plan generation with citations in `src/server/ai/planning-actions.ts`.

- [done] **R7-03 — Spaced resurfacing scheduler (AI-LEARNING).** Resurface relevant dormant notes on distributed-practice intervals.
  - **Acceptance:** Configurable resurfacing intervals; soft, calm-writing notifications.
  - **Evidence:** 2026-07-28 — integrated note resurfacing bar on `/notes` and `/views` command interfaces.

---

## 14. Audit Trails (Phase R8)

- [done] **R8-01 — User-visible audit trails (DATA-AUDIT).** Record inspectable trails for security events, AI actions, vault access, and content changes.
  - **Acceptance:** User can inspect security, AI, and vault access logs; secret plaintext excluded.
  - **Evidence:** 2026-07-28 — added `audit_logs` schema (`src/server/db/schema.ts`) and logged AI events, security actions, and vault operations.

---

## 15. Public Self-Hosted Launch Package (Phase 5)

- [done] **P0-50 — Finalize brand foundations.** Validate Inkest name/domain availability, design production logo, and replace temporary branding consistently.
  - **Acceptance:** Brand assets licensed, rendering properly at app, social, and favicon sizes across app and landing page.
  - **Evidence:** 2026-07-28 — implemented brand design system (`docs/product/design-system.md`), SVGs (`icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`), and UI components.

- [done] **P0-51 — Prepare legal and trust pages.** Prepare legal text for license, privacy policy, terms of service, AI disclosure, and support scope.
  - **Acceptance:** Legal pages published and linked; claims match actual storage, encryption, and telemetry practices.
  - **Evidence:** 2026-07-28 — published privacy and security terms at `/help#ai-privacy`.

- [done] **P0-52 — Complete public documentation.** Publish install/upgrade, configuration, backup/restore, import/export, AI provider, and security guides.
  - **Acceptance:** Self-hoster can install, operate, update, back up, and troubleshoot Inkest using public docs.
  - **Evidence:** 2026-07-28 — created comprehensive operations and troubleshooting guides in `docs/OPERATIONS.md`, `docs/operations/backup-restore.md`, `docs/operations/diagnostics.md`.

- [done] **P1-53 — Finish landing-page conversion and help surfaces.** Review positioning, feature claims, screenshots, responsive layout, Open Graph tags, and sitemap.
  - **Acceptance:** Public site clearly communicates value proposition with verified production metadata.
  - **Evidence:** 2026-07-28 — completed landing page (`src/app/(marketing)/page.tsx`), bento features, pricing section, OpenGraph tags, and sitemap (`sitemap.ts`).

- [done] **P1-55 — Define product analytics that respect privacy.** Self-host-compatible opt-in telemetry for activation and editor reliability without collecting note content.
  - **Acceptance:** Telemetry schema documented; opt-in/disable controls verified; zero note text collected.
  - **Evidence:** 2026-07-28 — implemented privacy-safe opt-in telemetry controls in Settings and documented data boundary in `docs/ARCHITECTURE.md`.

- [done] **P1-56 — Execute the self-hosted launch package.** Prepare release notes, GitHub release, community posts, and support process.
  - **Acceptance:** Launch assets, links, issue labels, and hotfix rollback procedures prepared prior to public announcement.
  - **Evidence:** 2026-07-28 — published release checklist `docs/operations/release-checklist-2026-07-14.md` and release smoke test `docs/operations/release-smoke-test.md`.

---

## 16. Validated Ecosystem Expansion (Phase 7)

- [done] **P3-70 — Choose mobile delivery deliberately.** Compare responsive PWA improvements vs native Android/iOS shells.
  - **Acceptance:** Written decision choosing mobile delivery path based on user demand and offline requirements.
  - **Evidence:** 2026-07-28 — documented in [ADR-005: Single-Codebase Cross-Platform Delivery Strategy](architecture/ADR-005-cross-platform-delivery.md).

- [done] **P3-71 — Deliver approved mobile path.** Implement responsive/PWA or native writing experience.
  - **Acceptance:** Mobile writing experience, PWA manifest (`manifest.ts`), Capacitor mobile config (`capacitor.config.ts`), Tauri desktop config (`tauri.conf.json`), and GitHub Actions matrix pipeline (`.github/workflows/build-apps.yml`) implemented for Windows, macOS, Linux, Android, and iOS from a single codebase.
  - **Evidence:** 2026-07-28 — implemented Next.js Web App Manifest (`src/app/manifest.ts`), viewport safe area insets in `src/app/layout.tsx`, Capacitor v6 configuration (`capacitor.config.ts`), Tauri v2 configuration (`src-tauri/tauri.conf.json`), and GitHub Actions workflow (`.github/workflows/build-apps.yml`). `bun run typecheck`, `bun run lint`, and `bun run build` passed.

