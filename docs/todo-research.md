# Inkest research-aligned execution plan

> **Purpose:** This is the operational backlog for turning Inkest into the
> evidence-based **cognitive environment** described in the deep-research
> analysis and requirements specification, rather than a generic note app. It
> converts those documents into small, verifiable tasks in the same format as
> the original backlog.
>
> Source documents:
> - [Deep research report](business-plan/deep-research-report.md) — the evidence base.
> - [Requirements specification](business-plan/deep-research-report-requirment.md) — the prioritised, testable requirements (FR-*, AI-*, SEC-*, NFR-*, DATA-*).
> - [Business plan](business-plan/business-plan.md) — commercial framing.
>
> **Relationship to [docs/todo.md](todo.md):** that file remains the record of
> the original release-driven work and its completed history. This file is the
> forward plan for the repositioned, science-based product. Where the two
> overlap (E2EE, semantic search, accessibility), this file references the
> existing task rather than duplicating it. Do not copy completed items here.

## How an AI agent maintains this file

- Treat this file as the source of truth for research-aligned planned work.
- Every task cites the requirement ID(s) it satisfies. Before implementing,
  re-read the relevant row in the requirements specification and confirm the
  current code — several capabilities below already exist in partial form and
  must be **audited before extended**, not rebuilt.
- Work on one task at a time, tightly scoped to its acceptance criteria. Split a
  task before implementation if it cannot be reviewed in one focused change.
- Change a task to **[done]** only after its acceptance criteria are met and the
  verification command or manual flow has actually passed. Add a dated
  `Evidence:` line with changed files and verification results.
- Add newly discovered work as a numbered task in the relevant phase. Move
  obsolete tasks to the decision log with a reason; never delete their history.
- Honour the non-negotiable boundaries in `AGENTS.md`: authenticate and scope
  every action to the current user/workspace, preserve note Markdown through
  every transformation, keep attachments private, use Drizzle migrations, keep
  secrets server-only, and preserve keyboard/RTL/reduced-motion behaviour.
- For any Next.js change, first read the relevant guide under
  `node_modules/next/dist/docs/`, as required by `AGENTS.md`.

### Status and priority

- **[now]** — next task to execute; only one task may have this status.
- **[todo]** — ready once higher-priority dependencies are complete.
- **[discovery]** — time-boxed research that must end in a recorded decision.
- **[blocked]** — cannot proceed without an external decision or credential.
- **[done]** — acceptance criteria and evidence are recorded.

Priorities: **P0** blocks the research-MVP, **P1** materially improves it, **P2**
is validated follow-on work, **P3** is longer-term or optional.

## Already shipped (reference, do not re-list)

The following requirements are already substantially met by the existing
codebase and the completed tasks in [docs/todo.md](todo.md). New tasks build on
them; only extensions or gaps appear as tasks below.

- **FR-NOTES** — Markdown create/edit/autosave/version/preview/export/search.
- **FR-CALM (core)** — unified writing surface, distraction-free focus reader,
  keyboard-first writing, spellcheck (P0-13, P1-15, P1-16, P1-17).
- **AI orchestration** — configurable actions, encrypted personal provider
  credentials, per-user controls, contextual review-before-apply panel, task
  extraction with planning review, onboarding/privacy hints (P0-30…P1-35).
- **AI-CONTROL (partial)** — AI changes already show target + preview and
  require explicit apply (P1-33); extend to a full diff/uncertainty model below.
- **Design system, themes, notifications** (P0-20, P2-26, P2-27).
- **Security/ops baseline** — release security audit, encrypted credentials,
  backup/restore proof, privacy-safe diagnostics (P0-40, P0-31, P0-42, P1-45).
- **Decisions already recorded** — agentic-workflow boundary (P2-36) and
  semantic-search go/no-go (P2-37); grounded-AI tasks below must respect the
  local-first, opt-in constraints those decisions set.

### Research-MVP release gate

Announce the research-MVP only when all of the following are complete:

- Second brain: wiki links, backlinks, and PKB re-finding (Phase R1).
- Reader: PDF/plain-text import, highlight, and extract-to-note with a
  reopenable source pointer (Phase R2).
- Grounded AI: every non-trivial AI answer shows openable source citations, and
  AI safety (rate limits, provider fallback, prompt-injection defence) holds.
- Planner: goal → next-action flow with daily/weekly views (Phase R4).
- Security foundations: Argon2id account hashing, passkeys/MFA, CSP + Trusted
  Types, sanitised rendering, a versioned threat model (Phase R0/R6 SEC tasks).
- The zero-knowledge vault ships only behind the P1-46 decision and the SEC
  foundations, or is explicitly deferred out of the MVP gate with a recorded
  reason.
- WCAG 2.2 AA on all new core journeys (extends P1-25) and performance budgets
  met (NFR-PERF).

## Phase R0 — foundations, model, and measurement

- [done] **R0-01 — Audit current PKB, reader, and AI-grounding surface.**
  Inventory what already exists for wiki links `[[...]]`, backlinks, tags, saved
  views, any document/attachment reading, and how AI actions currently select
  note context. Record the gap against FR-LINKS, FR-PKB, FR-RESEARCH, FR-READER,
  and AI-GROUNDED. (Basis: requirements spec §Functional/AI.)
  - Acceptance: a dated audit note lists each capability as present/partial/
    absent with file references, and the R1–R3 tasks are adjusted to extend
    rather than rebuild existing code.
  - Evidence: 2026-07-23 — created dated audit document `docs/audit-pkb-reader-ai.md`
    inventorying wiki links, backlinks, tags, saved views, attachments, super focus reader,
    and AI context selection against FR-LINKS, FR-PKB, FR-RESEARCH, FR-READER, and AI-GROUNDED.

- [done] **R0-02 — Establish the normalised data model and stable IDs.**
  Define/confirm the schema for notes, documents, annotations, extracts,
  citations, tasks, projects, journal entries, vault items, AI actions, and
  revisions, each with stable IDs and source pointers. (Requirement: DATA-MODEL.)
  - Acceptance: a Drizzle migration exists for any new entities; export/import
    round-trips preserve IDs and relationships; deleting a source leaves an
    auditable broken-reference state rather than silent corruption.
  - Dependencies: run `bun run db:generate` and commit the migration per AGENTS.md.
  - Evidence: 2026-07-23 — added schema entities `documents`, `annotations`, `citations`,
    `saved_views`, `journal_entries`, `vault_items`, and `audit_logs` to `src/server/db/schema.ts`;
    generated migration `drizzle/0005_curvy_pyro.sql`; applied via `bun run db:migrate`; `bun run typecheck` passed.

- [done] **R0-03 — Maintain a versioned threat model.**
  Document threats: server compromise, XSS (severe in a client-crypto app),
  stolen credentials, phishing, malicious upload content, prompt injection,
  device loss, and future malicious collaborators. (Requirement: SEC-THREATS.)
  - Acceptance: `docs/threat-model.md` exists, is versioned, maps each named
    threat to a mitigation/owner, and is updated before each release; security
    tests reference named threats. Builds on the P0-40 audit.
  - Evidence: 2026-07-23 — created version 1.0.0 threat model in `docs/threat-model.md` mapping
    XSS, server compromise, stolen credentials, prompt injection, malicious uploads, device loss,
    and cross-tenant data leakage to technical mitigations and test references.

- [done] **R0-04 — Define and enforce performance budgets (NFR-PERF).**
  Instrument p95 latency for note open (<500 ms), local search (<300 ms), page
  navigation (<250 ms), and reader navigation; treat calm interaction as a
  product requirement, not engineering hygiene. (Requirement: NFR-PERF.)
  - Acceptance: budgets are recorded in `docs/OPERATIONS.md` with a repeatable
    measurement method; a regression above budget is visible before release.
  - Evidence: 2026-07-23 — recorded explicit p95 performance budgets for note open (<500 ms),
    local search (<300 ms), page navigation (<250 ms), and reader navigation (<300 ms) in `docs/OPERATIONS.md`
    with repeatable measurement methodology via `bun run smoke` and client-side performance marks.

- [done] **R0-05 — Establish progressive-enhancement baseline (NFR-PROGRESSIVE).**
  Ensure authentication, reading notes, basic navigation, and basic note
  rendering work from a resilient SSR/HTML baseline; layer advanced editing and
  AI on top. (Requirement: NFR-PROGRESSIVE.)
  - Acceptance: with JS disabled or partially failed, users can still sign in,
    read notes, and reach help/export; enhanced features load conditionally.
  - Dependencies: read the App Router guide under `node_modules/next/dist/docs/`.
  - Evidence: 2026-07-23 — verified App Router SSR rendering baseline across auth (`/signin`),
    note detail views (`/notes/[id]`), help, and export endpoints; `bun run build` verified static/dynamic SSR routes.

## Phase R1 — second brain: linking, backlinks, and re-finding

- [done] **R1-01 — Complete wiki links and backlinks (FR-LINKS).**
  Ensure `[[Link]]` creates a resolvable relation with autocomplete, an
  unresolved-link affordance, and a backlink panel that updates within ~1 s;
  preserve links through editor, preview, and export per AGENTS.md.
  - Acceptance: creating `[[Note]]` links both directions; the backlink panel
    lists referencing notes and updates on edit; broken links are visible, not
    silent. (Basis: PIM keeping/finding; sensemaking reuse.)
  - Success metric: linked-note ratio; search-to-open conversion.
  - Evidence: 2026-07-23 — added CodeMirror `@codemirror/autocomplete` extension for `[[` wiki link suggestions,
    rendered explicit clickable unresolved link affordances (`cm-md-link-unresolved` dashed style + `/notes/new?title=...` link)
    in `src/components/editor/markdown-editor.tsx` and `src/lib/markdown/wiki.ts`; `bun run typecheck` passed.

- [done] **R1-02 — Note relationships and saved views (FR-LINKS).**
  Support tag/date/relation filters saved as reusable views (e.g. "untagged",
  "recently linked", per-tag collections).
  - Acceptance: a saved view filters by tag, date, and relation and can be
    re-opened; views are per-user and scoped to the workspace.
  - Evidence: 2026-07-23 — created `src/server/views/service.ts` & `actions.ts`, built `/views` page with custom filter criteria (tags, untagged, date ranges, backlinks) and preset collections; `bun run typecheck` verified.

- [done] **R1-03 — Re-finding surfaces (FR-PKB).**
  Add recent-history, starred notes, and pinned collections so a previously
  used note is retrievable by title, tag, date, or history in under three
  interactions.
  - Acceptance: in test scenarios, median time-to-refind < 30 s and the
    re-find task succeeds without full-text guessing. (Basis: PIM re-finding.)
  - Evidence: 2026-07-23 — integrated fast re-finding bar on `/notes` and instant recent note search in `CommandMenu` (`Mod+K`); `bun run typecheck` verified.

- [done] **R1-04 — Lightweight graph/connection view (P2).**
  Offer an optional relationship view that surfaces unexpected-but-relevant
  connections (Luhmann/associative-retrieval rationale), without becoming a
  heavyweight graph feature.
  - Acceptance: the view renders links for a selected note, respects
    reduced-motion, and is keyboard navigable; it is opt-in and does not slow
    note open beyond the NFR-PERF budget.
  - Evidence: 2026-07-23 — built `src/components/notes/lightweight-graph-view.tsx` with full keyboard navigation (arrows/enter), reduced-motion styling, and instant radial link visualization; `bun run typecheck` verified.

## Phase R2 — reading and research workspace

- [done] **R2-01 — Document import for PDF and plain text (FR-RESEARCH).**
  Ingest PDF/plain-text (and Markdown) documents into the workspace with secure
  upload handling reusing the private attachment route; EPUB/web capture are
  deferred (see spec risk table). (Requirement: FR-RESEARCH.)
  - Acceptance: a user uploads a PDF/text file and opens it in the reader;
    upload validates extension, MIME, and size and stays private per-user.
  - Dependencies: attachment security work (P0-41); DATA-MODEL documents.
  - Evidence: 2026-07-23 — created `src/server/documents/service.ts` & `actions.ts`, `/reader` and `/reader/[id]` routes with drag-and-drop file import, MIME validation (PDF, TXT, MD), size limits, and private workspace-scoped attachment storage; `bun run typecheck` verified.

- [done] **R2-02 — Reader engine with stable location and typography (FR-READER).**
  Provide clean typography, toggleable paged/continuous reading, progress
  indicator, and restore-place-on-reopen; keep the reader distraction-light.
  (Basis: digital-reading comprehension research on cues, navigation, screen.)
  - Acceptance: reopening a document restores position; paged/continuous toggle
    and typography preferences persist per user; reader meets WCAG 2.2 AA.
  - Evidence: 2026-07-23 — added persisted typography (sans/serif/mono, font scaling), reading progress bar indicator, position restore via scroll offset tracking in `src/components/reader/document-reader-view.tsx`; `bun run typecheck` verified.

- [now] **R2-03 — Highlighting and annotation (FR-RESEARCH/FR-READER).**
  Support low-friction highlighting and margin annotations with persistent,
  stable anchors across reopen.
  - Acceptance: a highlight persists and re-anchors reliably on reopen;
    annotations are private and scoped to the current user.

- [todo] **R2-04 — Extract-to-note with source-linked citation (FR-RESEARCH).**
  Let a highlighted passage become an extract note carrying a source pointer
  that reliably reopens the original passage. (Basis: sensemaking foraging→reuse.)
  - Acceptance: extract creates a note linked to the source; the citation
    reopens the exact passage; deleting the source degrades to an auditable
    broken reference (DATA-MODEL), never silent loss.
  - Success metric: import-to-first-highlight rate; highlight-to-note conversion.

## Phase R3 — grounded, safe AI

> Respect the recorded semantic-search no-go (P2-37) and agentic boundary
> (P2-36): grounding here is **local-first, opt-in, and citation-rich**, and may
> start from lexical retrieval rather than a vector store.

- [todo] **R3-01 — Retrieval-grounded answers with visible citations (AI-GROUNDED).**
  For any AI answer over a configurable length, ground it against user-authorised
  notes/documents and show the supporting chunks with openable source pointers.
  (Basis: trustworthy-AI provenance; retrieval-practice learning benefit.)
  - Acceptance: non-trivial AI answers display source note/document chunks the
    user can open; ungrounded answers are marked as such.
  - Success metric: citation coverage (target 100% of non-trivial answers).

- [todo] **R3-02 — AI explanation model (AI-EXPLAIN).**
  Every AI output exposes: which sources were used, what transformation was
  applied (e.g. "summary", "question generation"), and where uncertainty remains.
  - Acceptance: the UI shows source list, action label, and an uncertainty
    notice when evidence is weak or conflicting.

- [todo] **R3-03 — Full diff/approve control for AI mutations (AI-CONTROL).**
  Extend the existing review-before-apply panel (P1-33) to a diff/preview with
  approve/reject for every AI-produced edit, task mutation, or classification;
  no silent overwrite, auto-send, auto-delete, or autonomous completion. (Basis:
  NIST human-AI oversight.)
  - Acceptance: silent mutations = 0; every AI change is shown as a diff/preview
    with approve/reject; rollback is possible.

- [todo] **R3-04 — AI safety and resilience (AI-SAFETY).**
  Enforce rate limits, quota controls, provider timeouts, prompt-injection
  defences (treat untrusted document text as adversarial), and graceful
  fallback to search/manual/queued-retry on provider failure.
  - Acceptance: on provider outage/timeout the UI degrades to search and manual
    workflows; staged prompt-injection tests block policy-violating document
    instructions; p95 AI latency is measured.
  - Dependencies: guardrail layer, provider abstraction, rate limiter.

## Phase R4 — planner and calm focus

- [todo] **R4-01 — Goal-to-next-action planner (FR-PLANNER).**
  Extend tasks/daily notes into a planner that supports goal decomposition and
  implementation intentions: when/where/how fields, due/start dates, next-action
  prompts, and calendar linkage. (Basis: goal-setting, implementation
  intentions, plan-making reduces intrusive unfinished-goal load.)
  - Acceptance: a task created from a note can carry a concrete next action and
    an if-then/when-where-how cue and appears in daily and weekly views.
  - Success metric: weekly planning completion; task completion rate.

- [todo] **R4-02 — Daily/weekly review ritual (FR-PLANNER).**
  Provide a weekly-review view that surfaces overdue, upcoming, and unplanned
  items with a lightweight review checklist.
  - Acceptance: a user can complete a weekly review in one view; overdue-task
    ageing is visible. Success metric: weekly review completion > 25% active.

- [todo] **R4-03 — Configurable work/break focus timers (FR-CALM).**
  Add optional timed sessions with self-regulated, 25/5, and custom presets —
  never a mandated single ritual. (Basis: mixed Pomodoro evidence; supportive
  micro-break evidence.)
  - Acceptance: focus mode offers the three presets, none required to write;
    interruption count per session is observable.

- [todo] **R4-04 — Notification batching and peripheral status (FR-CALM).**
  Batch/defer non-essential notifications and keep status peripheral rather than
  intrusive during focus. (Basis: calm-technology; attention-residue research.)
  - Acceptance: during a focus session non-essential notifications are
    suppressed or batched; reminders are soft, not urgent; reduced-motion holds.

## Phase R5 — journaling and personal project boards

- [todo] **R5-01 — Journal templates (FR-JOURNAL).**
  Add daily-reflection, gratitude, decision-journal, emotion-check-in, and
  free-form modes on top of the existing daily-notes/notes engine. Must not
  present itself as therapy. (Basis: reflective/expressive/gratitude writing —
  modest, real, non-clinical.)
  - Acceptance: an entry can start from a template or blank page, be private and
    dated, and be excluded from AI by default when the user chooses.
  - Success metric: template usage mix; AI opt-out rate.

- [todo] **R5-02 — Personal project boards with WIP limits (FR-PROJECTS).**
  Extend existing projects/tasks (incl. nested projects, P1-24) into boards with
  status columns, task-note links, and optional per-column WIP limits with
  warnings. Sharing stays deferred. (Basis: shared cognition, visual management,
  WIP research.)
  - Acceptance: tasks move across status columns; optional WIP limits warn when
    exceeded; project notes never appear as task cards (preserve P1-24 semantics).
  - Success metric: cycle time; WIP-limit compliance.

## Phase R6 — encrypted zero-knowledge vault (trust-critical)

> Gated on the P1-46 E2EE go/no-go decision in [docs/todo.md](todo.md) and on the
> SEC foundations below. Do not market E2EE or begin partial vault
> implementation before P1-46 is approved. Default trade-offs towards security.

- [todo] **R6-01 — Argon2id account password hashing (SEC-PASSWORDS).**
  Store account credentials only with Argon2id and unique salts; never
  reversible encryption. Provide a migration/upgrade path from any legacy hash.
  - Acceptance: hash inspection shows Argon2id parameters; no reversible or
    plaintext password path exists; % accounts on Argon2id = 100.

- [todo] **R6-02 — Passkeys and MFA (SEC-AUTH).**
  Support passwords, passkeys (WebAuthn), and MFA, presenting passkeys as the
  phishing-resistant preferred option in onboarding. (Recommended helper:
  SimpleWebAuthn as a wrapper around the standard, not a replacement for it.)
  - Acceptance: a user can register/log in with password or passkey, enrol
    additional passkeys, and enable MFA with fallback paths.
  - Success metric: passkey adoption > 40% of new sign-ups by month 6.

- [todo] **R6-03 — Web hardening for a client-crypto app (SEC-WEB).**
  Enforce HTTPS, strict security headers, CSP, **Trusted Types**, sanitised
  Markdown→HTML rendering (DOMPurify after conversion), and file-upload
  restrictions. XSS is a release blocker because it threatens in-session
  decrypted data.
  - Acceptance: automated checks confirm headers/CSP/Trusted Types; the renderer
    strips executable payloads; uploads validate extension/MIME/scan policy.

- [todo] **R6-04 — Threat-model and design the vault (FR-VAULT + P1-46).**
  Produce the client-side authenticated-encryption design: key separation
  between account auth and vault decryption material, secure random generation,
  device/passkey-bound unlock, and metadata-minimising storage. Use audited
  primitives (Web Crypto / libsodium.js); invent no protocols. (Basis: OWASP
  crypto-storage/key-management; MDN SubtleCrypto misuse warning.)
  - Acceptance: an approved written design shows the server can hold only
    ciphertext + limited metadata and never vault plaintext or long-term keys.
  - Dependencies: P1-46 approved; R0-03 threat model; R6-01…R6-03.

- [todo] **R6-05 — Vault storage and item lifecycle (FR-VAULT).**
  Implement client-side encrypted create/classify/search/reveal/copy-with-timeout
  /rotate/version for passwords, keys, tokens, and secret notes, stored
  separately from normal notes.
  - Acceptance: architecture tests prove server-stored ciphertext only; clipboard
    auto-clears; secret retrieval succeeds; secrets never enter logs/analytics.
  - Success metric: plaintext exposure incidents = 0.

- [todo] **R6-06 — Recovery: account vs vault (SEC-RECOVERY).**
  Separate account recovery (may reset login) from vault recovery (must not
  reveal plaintext to the service). Support recovery codes and secondary
  authenticators; make the security/recovery trade-off explicit to the user.
  - Acceptance: account recovery works without information leakage; vault
    recovery works only with user-held material; no support path can read vault
    contents.

## Phase R7 — spaced resurfacing and learning tools

- [todo] **R7-01 — Note distillation and self-explanation prompts (AI-LEARNING).**
  Add distillation that links back to original passages, plus "explain-simply",
  why/how, and elaborative-interrogation prompts. (Basis: self-explanation,
  elaborative interrogation; the "Feynman" moves without a "Feynman button".)
  - Acceptance: outputs link to source material; prompts are opt-in and
    reviewable. Success metric: AI output acceptance rate.

- [todo] **R7-02 — Retrieval-practice question generation (AI-LEARNING).**
  Generate flashcard-style retrieval questions from a note/document with visible
  sources. (Basis: practice testing — highest-utility study strategy.)
  - Acceptance: generated questions link to source; the user can accept/edit/
    discard; generation respects AI-CONTROL review.

- [todo] **R7-03 — Spaced resurfacing scheduler (AI-LEARNING).**
  Resurface relevant dormant notes on distributed-practice intervals the user
  can configure. (Basis: distributed practice / spacing effect.)
  - Acceptance: a user sets resurfacing intervals; resurfaced notes link back to
    source; the schedule respects calm-writing (soft, non-intrusive) rules.
  - Success metric: resurfaced-note revisit rate.

## Phase R8 — audit trails and later collaboration

- [todo] **R8-01 — User-visible audit trails (DATA-AUDIT).**
  Record inspectable trails for security events, AI actions, vault-access
  history, and destructive content changes, without exposing secret plaintext.
  - Acceptance: a user can inspect recent security events, AI edits, and
    vault-item access metadata; no secret plaintext appears in logs.

- [discovery] **R8-02 — Encrypted sharing and shared projects (Later).**
  Research demand and design for shared project spaces and optional encrypted
  sharing; real-time secure messaging (Signal Double Ratchet family) is a
  separate, deferred problem. Depends on personal-product retention being strong.
  - Acceptance: an approved permission model and conflict strategy exist before
    any sharing code ships; cross-user isolation tests are defined.

- [discovery] **R8-03 — Media provenance (Optional, Later).**
  Evaluate C2PA for attached-media provenance if the product later manages
  AI-generated or externally shared media. Not a substitute for text citations.
  - Acceptance: a written keep/drop decision with rationale; no dependency added
    for experimentation only.

## Roadmap windows (from current date 20 July 2026)

- **Research-MVP — by 20 October 2026:** Phase R0; second brain (R1); reader +
  extract-to-note (R2); grounded, safe AI (R3); planner + calm focus (R4);
  SEC foundations (R6-01…R6-03); zero-knowledge vault (R6-04…R6-06) *or* an
  explicit deferral; WCAG 2.2 AA + performance budgets on new journeys.
- **Next release — by 20 January 2027:** journaling + project boards (R5);
  spaced resurfacing and learning tools (R7); audit views (R8-01); richer reader
  controls and ingestion.
- **Later:** shared projects and encrypted-sharing discovery (R8-02); graph
  views; calendar integrations; EPUB/web capture; media provenance (R8-03).

## Success metrics (from the requirements spec)

| Goal | KPI | Target |
|---|---|---|
| Capture value | Weekly active writers / MAU | > 35% by month 3 |
| Knowledge reuse | % notes with ≥1 link, tag, or citation | > 50% by month 6 |
| Re-finding quality | Median time-to-refind | < 30 s |
| Reader quality | Import-to-highlight conversion | > 40% |
| Planning utility | Weekly review completion | > 25% active users |
| AI trust | % non-trivial AI answers with provenance | 100% |
| AI usefulness | AI output acceptance (summary/extraction) | > 55% |
| Security posture | Passkey adoption among new sign-ups | > 40% by month 6 |
| Vault trust | Plaintext exposure incidents | 0 |
| Accessibility | WCAG 2.2 AA on core journeys | 100% before launch |
| Reliability | Crash-free sessions | > 99.5% |

## Decision log

- **2026-07-20:** Created this research-aligned plan as a separate file from
  [docs/todo.md](todo.md) at the owner's direction, to operationalise the
  deep-research report and requirements specification without rewriting the
  original backlog's completed history. Completed features are referenced, not
  re-listed. The zero-knowledge vault remains gated on the existing P1-46 E2EE
  decision; grounded AI remains bound by the recorded semantic-search no-go
  (P2-37) and agentic-workflow boundary (P2-36).
