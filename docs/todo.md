# Inkest execution plan

> **Purpose:** This is the single operational backlog for Inkest. It turns the
> product and business direction into small, verifiable pieces of work. It is
> deliberately ordered: do not begin a later phase while its stated release
> gate is open, except for a clearly independent discovery task.
>
> Product context and durable decisions live in [Product](PRODUCT.md),
> [Architecture](ARCHITECTURE.md), and [Operations](OPERATIONS.md). The
> business rationale for this plan is in
> [Business Plan](business-plan/business-plan.md).

## How an AI agent maintains this file

- Treat this file as the source of truth for planned work. Do not create a
  second roadmap or duplicate completed work as a new task.
- Before starting a task, confirm the current code and linked documentation;
  mark a task **[blocked]** when a required product decision, secret, account,
  or external service is missing.
- Work on one task at a time. Keep changes tightly scoped to its acceptance
  criteria. Split a task before implementation if it cannot be safely
  reviewed in one focused change.
- Change a task to **[done]** only after its acceptance criteria are met and
  the verification command or manual flow has actually passed. Add a dated
  `Evidence:` line beneath it with changed files and verification results.
- Add newly discovered work as a numbered task in the relevant phase, with a
  clear outcome and acceptance criteria. Do not silently broaden a task.
- Keep unchecked tasks in priority order. Move obsolete tasks to the decision
  log with the reason; never delete their history.
- For any Next.js change, first read the relevant guide under
  `node_modules/next/dist/docs/`, as required by `AGENTS.md`.

### Status and priority

- **[now]** — next task to execute; only one task may have this status.
- **[todo]** — ready once higher-priority dependencies are complete.
- **[discovery]** — time-boxed research that must end in a recorded decision.
- **[blocked]** — cannot proceed without an explicit external decision or
  credential; state the blocker beneath the task.
- **[done]** — acceptance criteria and evidence are recorded.

Priorities: **P0** blocks the public self-hosted release, **P1** materially
improves the beta, **P2** is validated post-launch work, and **P3** is
longer-term or optional work.

## Current release position

The core MVP is already present: authentication, Markdown notes and preview,
Mermaid, attachments, tags/search, projects/tasks, daily notes/calendar,
export, configurable AI actions, settings, and Docker deployment. This plan
starts with the gaps between that implementation and a reliable public release.

### Public self-hosted release gates

All of the following must be complete before announcing a public release:

- P0 editor-performance and writing-flow tasks.
- P0 authorization, attachment, secret-handling, and backup/restore checks.
- A clean Docker deployment verified from documented instructions.
- A clear license, privacy/AI disclosure, support path, and install guide.
- Critical accessibility, responsive-layout, and empty/error-state checks.
- A small beta with feedback triaged; no unresolved data-loss, privacy, or
  editor-blocking defects.

## Phase 0 — establish the release baseline

- [now] **P0-01 — Create a reproducible release baseline.** Record the
  current commit, environment, database/storage driver, enabled integrations,
  test account setup, and known defects in a dated release-checklist note.
  - Acceptance: a second agent can start the app and repeat the baseline
    checks using only repository documentation and the checklist.

- [todo] **P0-02 — Reconcile docs with running behavior.** Verify the current
  product, architecture, operations, README, and environment example against
  source and a local run; correct only factual drift.
  - Acceptance: no documented feature, configuration variable, or deployment
    command contradicts the implementation.

- [todo] **P0-03 — Add a release smoke-test script/checklist.** Cover signup
  or sign-in, note create/edit/reload, project task completion, attachment
  upload/download, export, AI missing-provider handling, and disabled
  integration states.
  - Acceptance: the checklist names expected results and can be run on a
    clean local or container deployment without hidden setup steps.

- [todo] **P0-04 — Define the beta feedback loop.** Add a lightweight,
  privacy-respecting feedback route (for example GitHub issues/email), a bug
  template, severity definitions, and a triage cadence.
  - Acceptance: beta users can report a defect with reproduction steps and it
    can be classified as release-blocking, high, normal, or enhancement.

## Phase 1 — make writing fast, calm, and reliable

- [todo] **P0-10 — Profile and fix typing lag.** Measure input latency and
  long tasks on short, medium, and large notes before changing code; remove
  the proven bottlenecks in editor state, preview rendering, autosave, or
  sidebar updates.
  - Acceptance: representative typing remains responsive with no visible
    keystroke delay; measurements, note sizes, device/browser, and before/after
    results are recorded in `docs/OPERATIONS.md`.

- [todo] **P0-11 — Split editor-route JavaScript by measured cost.** Keep
  CodeMirror, Markdown preview, Mermaid, AI panel, and nonessential panels
  from blocking initial note editing where safe.
  - Acceptance: production measurements show a meaningful reduction from the
    recorded 818 KiB editor script transfer and no regression to editing,
    preview, Mermaid, or error states.

- [todo] **P0-12 — Repair Markdown code-block editing.** Reproduce the
  reported inability to enter/edit code areas and the rounded-border-per-line
  visual defect; fix the editor integration and add regression coverage or a
  precise manual test.
  - Acceptance: users can place the caret, select, paste, edit, and exit
    fenced code blocks; each block renders as one coherent surface in light,
    dark, LTR, and RTL notes.

- [todo] **P0-13 — Unify editing and reading into one note surface.** Replace
  the separate read/edit mental model with an intentional inline editing and
  preview experience, while preserving an explicit distraction-free reader
  when it has distinct value.
  - Acceptance: a user can write, inspect formatted output, and return to the
    caret without route/mode confusion or lost draft content; the final
    interaction is documented with keyboard behavior.

- [todo] **P1-14 — Improve large-Markdown paste.** Detect substantial
  Markdown pastes, offer a fast preview/formatting path, and retain an easy
  immediate return to source editing.
  - Acceptance: a large paste does not lock the editor; users can decline the
    assist, undo it, and keep original Markdown intact.

- [todo] **P1-15 — Merge and harden focus experiences.** Decide which
  distinct capability remains from focus and super-focus, then make it
  consistently discoverable after the unified editor work.
  - Acceptance: there is one understandable focus entry point, a keyboard
    shortcut, accessible exit control, reduced-motion behavior, and no mode
    that appears only in one legacy view.

- [todo] **P1-16 — Complete keyboard-first writing.** Document and implement
  core shortcuts for create/search/open/save/focus/formatting/navigation;
  assess high-value Vim-like actions such as next/previous match and select
  all occurrences without conflicting with browser assistive technology.
  - Acceptance: every core writing operation has a discoverable keyboard path,
    command palette support where appropriate, and no shortcut steals input
    from text fields unexpectedly.

- [todo] **P1-17 — Add spelling and writing suggestions with user control.**
  Evaluate browser-native spellcheck first; layer optional AI suggestions only
  behind explicit consent and selected text.
  - Acceptance: typo suggestions work for configured languages, can be
    disabled, never send text to an AI provider implicitly, and preserve the
    original text until accepted.

## Phase 2 — product coherence, navigation, and accessibility

- [todo] **P0-20 — Establish and apply one design system.** Audit the landing
  page, application shell, settings, editor, panels, empty states, and
  notifications; define shared tokens and reusable patterns for color,
  typography, radius, spacing, elevation, and motion.
  - Acceptance: app and landing share a coherent visual language in light and
    dark themes; one-off styles are removed or intentionally documented.

- [todo] **P1-21 — Refine settings and AI setup UX.** Group settings by
  purpose, clarify instance versus user configuration, make provider setup
  easy, and show actionable validation/error messages.
  - Acceptance: a new user can configure an OpenAI-compatible provider or
    understand why AI is unavailable without reading source code.

- [todo] **P1-22 — Make the right sidebar useful and predictable.** Redesign
  it around contextual note/project properties, links, tasks, AI, and
  integrations; align collapse behavior and animation with the left sidebar.
  - Acceptance: the panel has clear information hierarchy, a persistent
    accessible collapse control, reduced-motion support, and no layout shift
    that interrupts writing.

- [todo] **P1-23 — Complete daily/calendar information architecture.** Remove
  redundant Daily navigation only after Calendar and Home provide clear daily
  entry points, deep links, and empty states.
  - Acceptance: opening any day reliably reaches its daily note; navigation,
    browser history, and Google Calendar-connected/disconnected states are
    unambiguous.

- [todo] **P1-24 — Support nested projects intentionally.** Allow a project
  note to be created in the tree and assigned/reassigned a parent project,
  including cycle prevention and clear project/task roll-up semantics.
  - Acceptance: nesting works from creation and edit flows, cannot create a
    cycle, and hierarchy appears consistently in tree, project, and task views.

- [todo] **P1-25 — Accessibility and responsive audit.** Test keyboard-only,
  screen-reader labels, focus order, contrast, zoom, narrow mobile layout,
  RTL/mixed-direction notes, and reduced motion across core routes.
  - Acceptance: critical violations are fixed; remaining limitations are
    documented with an owner and priority.

- [todo] **P2-26 — Add curated themes and font choices.** Build on the shared
  token system; do not introduce premium-only claims before licensing and
  billing decisions exist.
  - Acceptance: choices persist per user, meet contrast requirements, do not
    cause layout shifts, and work in editor/preview/marketing routes.

- [todo] **P2-27 — Improve notifications based on real workflows.** Define
  reminders, due-date alerts, integration failures, and delivery preferences
  before adding notification volume.
  - Acceptance: each notification has an opt-in preference, a useful action,
    and is deduplicated; Telegram and in-app behavior are tested separately.

## Phase 3 — AI that is explicit, safe, and useful

- [todo] **P0-30 — Audit the AI data and configuration contract.** Map every
  action's input, provider selection, prompt, token limit, log, failure mode,
  and persistence behavior; remove undocumented fallbacks.
  - Acceptance: `docs/ARCHITECTURE.md` accurately states what selected note
    data leaves the deployment and which configuration wins in every case.

- [todo] **P0-31 — Encrypt stored user provider credentials and secure their
  lifecycle.** Review existing secret storage, add migration/rotation/deletion
  behavior as needed, and ensure keys are never returned to the browser,
  exported, or logged.
  - Acceptance: credentials are encrypted at rest with documented key
    management, redacted from logs, removable by the user, and covered by a
    migration/rollback plan.

- [todo] **P1-32 — Add user-editable AI orchestration controls.** Provide
  safe per-user controls for model/provider, temperature, input/output token
  limits, instructions, and guardrails, with validated server-side bounds and
  sensible defaults.
  - Acceptance: settings apply only to the owning user, invalid limits are
    rejected, action-specific schemas remain enforced, and reset-to-default is
    available.

- [todo] **P1-33 — Integrate AI into the right-side workflow.** Make the AI
  panel contextual to the open note/selection and support review before
  replace, append, or create operations; avoid disruptive popups.
  - Acceptance: every AI change shows a clear target and preview/diff, supports
    cancel, preserves the source until approval, and records a traceable event.

- [todo] **P1-34 — Complete AI task extraction and project planning.** Let the
  user review destination (current project, new project, sub-project, or
  existing project), ownership, status, due dates, and editable planning
  instructions before saving.
  - Acceptance: generated tasks are structured, editable, user-confirmed, and
    never create duplicate/cyclic projects; due-date assumptions are visible.

- [todo] **P1-35 — Add concise AI onboarding and privacy hints.** Explain
  what each action does, what content is sent, provider costs/limits, and how
  to use custom keys without overwhelming regular writing.
  - Acceptance: first use has contextual help and links to the full privacy/AI
    disclosure; hints can be dismissed and revisited.

- [todo] **P2-36 — Bound agentic workflows before implementation.** Define
  permitted multi-step actions, maximum iterations/cost/time, confirmation
  points, cancellation, audit records, and failure recovery; validate demand
  with beta users first.
  - Acceptance: an approved design explicitly prevents autonomous external
    side effects and uncontrolled loops; no agentic execution ships before it.

- [todo] **P2-37 — Research semantic search and note-aware chat.** Compare
  local/self-hosted and hosted architectures, privacy implications, indexing
  cost, and quality on real opt-in notes.
  - Acceptance: a written go/no-go decision and a small technical proposal
    exist; no vector dependency is added merely for experimentation.

## Phase 4 — privacy, security, reliability, and operations

- [todo] **P0-40 — Run a release security audit.** Trace authorization on all
  server actions and API routes, especially notes, tasks, exports, versions,
  attachments, AI events, calendar OAuth, and Telegram webhooks.
  - Acceptance: cross-user access attempts are tested; all findings are fixed,
    accepted with rationale, or tracked as release blockers.

- [todo] **P0-41 — Verify private attachment security.** Test file type/size
  validation, path handling, ownership checks, storage-driver parity, download
  headers, error responses, and cache behavior.
  - Acceptance: an unauthenticated or different user cannot retrieve an
    attachment; invalid uploads fail safely; approved downloads work using both
    local and MinIO/S3-compatible configurations when supported.

- [todo] **P0-42 — Prove backup, restore, and export.** Document backup of the
  database, attachments, secrets/configuration boundaries, and restore steps;
  perform a restore into a clean environment and compare notes, tasks, tags,
  versions, and attachments.
  - Acceptance: recovery is reproducible, data integrity is confirmed, and
    user-facing export is separately verified as portable Markdown/workspace
    data.

- [todo] **P0-43 — Verify clean Docker deployment and publish an image plan.**
  Build and run the documented Compose path from scratch, test migration and
  persistent volumes, then prepare registry namespace, tags, SBOM/provenance
  policy, and image update process for Docker Hub.
  - Acceptance: a clean host can deploy without source edits; image publishing
    remains blocked until registry ownership and release credentials are
    explicitly supplied.

- [todo] **P1-44 — Investigate browser memory growth.** Reproduce the reported
  memory increase across note switching, preview/Mermaid, AI panel, uploads,
  and refresh; use heap snapshots to identify retained objects before fixing.
  - Acceptance: a reproducible scenario and before/after memory evidence show
    no unbounded growth in the confirmed workflow.

- [todo] **P1-45 — Establish error monitoring and privacy-safe diagnostics.**
  Select a self-host-compatible monitoring approach, redact note content and
  secrets, define retention, and verify alert paths.
  - Acceptance: a deliberate test error is observable with useful metadata but
    no note content, credentials, attachment paths, or tokens.

- [discovery] **P1-46 — Make an end-to-end encryption decision.** Threat-model
  an optional vault: key ownership/recovery, metadata exposure, browser crypto,
  search, attachments, sharing, backups, multi-device sync, and incompatibility
  with server-side AI. Compare against the current encryption-at-rest approach.
  - Acceptance: a written security design and go/no-go decision are approved.
    Do not market E2EE or begin partial implementation before this decision.

- [todo] **P2-47 — Implement E2EE only if P1-46 is approved.** Deliver an
  end-to-end vertical slice for an explicitly defined vault scope, including
  migration, recovery warning, export/backup, and independent review.
  - Acceptance: ciphertext is all the server can access for protected content;
    supported/unsupported features are unmistakable; a security review passes.

## Phase 5 — public self-hosted launch and product learning

- [todo] **P0-50 — Finalize brand foundations.** Validate the Inkest name and
  domain availability/ownership, design a production logo and usage rules, and
  replace temporary branding consistently.
  - Acceptance: brand assets have source files and licenses, render at app and
    social sizes, and are used consistently on landing/app/favicon/metadata.

- [todo] **P0-51 — Prepare legal and trust pages.** Obtain appropriate legal
  review for license, privacy policy, terms, AI disclosure, cookie policy if
  applicable, data export/deletion explanation, and self-hosted support scope.
  - Acceptance: approved pages are linked from the site; claims accurately
    reflect actual encryption, storage, AI, telemetry, and support behavior.

- [todo] **P0-52 — Complete public documentation.** Publish install/upgrade,
  configuration, backup/restore, import/export, AI provider, security,
  troubleshooting, keyboard, and contribution guides; include screenshots or
  a demo path where useful.
  - Acceptance: an unfamiliar self-hoster can install, operate, update, back
    up, and remove Inkest without private assistance.

- [todo] **P1-53 — Finish landing-page conversion and help surfaces.** Review
  positioning, feature claims, screenshots, pricing expectations, responsive
  UI, metadata, Open Graph, canonical URL, sitemap, and accessible help pages.
  - Acceptance: the public site clearly communicates “private Markdown notes,
    clean projects, and explicit AI”; claims match shipped functionality and
    production metadata validates.

- [todo] **P1-54 — Run a private beta with 20–50 target users.** Recruit
  technical knowledge workers, self-hosters, writers, and RTL users; provide a
  scripted onboarding path and collect consented workflow feedback.
  - Acceptance: feedback is triaged weekly; at least one complete journey is
    observed for writing, projects, export, AI, and self-hosted setup; P0/P1
    fixes are fed back into this plan.

- [todo] **P1-55 — Define product analytics that respect privacy.** Choose
  opt-in/self-host-compatible measurement for activation, retention, editor
  reliability, project use, exports, and AI actions; do not collect note text.
  - Acceptance: event schema, consent/disable behavior, retention, and metric
    definitions are documented; a test verifies sensitive content is excluded.

- [todo] **P1-56 — Execute the self-hosted launch package.** Create demo video,
  release notes, GitHub/source release, Product Hunt/Hacker News/community
  posts, and support coverage only after release gates pass.
  - Acceptance: launch assets, links, issue labels, response owner, and a
    rollback/hotfix process are ready before the announcement.

## Phase 6 — hosted offering: validate before building

- [discovery] **P2-60 — Validate hosted-plan demand and packaging.** Interview
  beta users about the value of hosted sync, backups, storage, AI credits,
  version history, and support; test the proposed Free, Pro, Power, and later
  Team packaging without promising dates.
  - Acceptance: a documented segment, willingness-to-pay evidence, feature
    boundary, and success threshold justify hosted implementation.

- [discovery] **P2-61 — Design hosted multi-tenant architecture.** Specify
  tenant isolation, managed database/object storage, regional choices, domain
  and email, secret management, backups/disaster recovery, observability,
  migration from self-hosted, quotas, and data deletion/export.
  - Acceptance: an architecture decision record includes cost model, threat
    model, vendor choices, and operational ownership; it satisfies the product
    privacy promises.

- [todo] **P2-62 — Build hosted foundations after P2-60 and P2-61.** Add
  production environments, tenant-safe provisioning, storage limits, backup
  jobs, restore drills, transactional email, status communication, and support
  tooling.
  - Acceptance: a staged environment can onboard and fully delete a test user,
    survive a restore drill, and enforce account/resource boundaries.

- [todo] **P2-63 — Add billing and entitlement management.** Select a billing
  provider, implement server-verified subscriptions, plan limits, AI credits,
  invoices/tax requirements, cancellation, payment-failure handling, and
  self-service portal.
  - Acceptance: sandbox purchase/upgrade/downgrade/cancel/webhook replay flows
    are tested; entitlement checks never trust client-provided plan data.

- [todo] **P2-64 — Launch a small hosted beta.** Migrate only opt-in testers,
  monitor reliability, support load, activation, retention, costs, and
  free-to-paid conversion before broad availability.
  - Acceptance: hosted launch metrics and incident thresholds are defined;
    beta users can export/delete data and receive clear support/uptime terms.

## Phase 7 — validated expansion

- [discovery] **P3-70 — Choose mobile delivery deliberately.** Compare
  responsive web improvements, PWA install/offline support, and native Android,
  iOS, and desktop applications against user demand, offline requirements,
  sync, E2EE scope, maintenance cost, and app-store obligations.
  - Acceptance: a written decision names the first platform and validates a
    core note-create/edit/offline flow before committing to three native apps.

- [todo] **P3-71 — Deliver the approved mobile path.** Prioritize an
  installable, responsive, accessible writing experience before native shells.
  - Acceptance: the chosen platform meets defined offline, attachment,
    authentication, and export expectations with real-device verification.

- [discovery] **P3-72 — Validate collaboration and sharing.** Research demand
  for inviting people to notes/projects, public sharing, permissions, audit
  trails, conflicts, E2EE implications, and moderation/abuse controls.
  - Acceptance: an approved permission model and conflict strategy exist; team
    workspaces remain out of scope until personal-product retention is strong.

- [todo] **P3-73 — Implement the smallest approved sharing vertical slice.**
  Start with the collaboration model chosen in P3-72, not a broad Notion-like
  workspace.
  - Acceptance: permissions are server-enforced, revocation is immediate,
    audit/export behavior is defined, and cross-user isolation tests pass.

- [todo] **P3-74 — Improve import and migration.** Add the highest-demand
  Markdown-folder import with a dry run, mapping preview, duplicate policy,
  attachment handling, and rollback/retry behavior.
  - Acceptance: a representative folder imports without data loss and can be
    exported back as portable Markdown.

## Decision log

- **2026-07-14:** The existing feature list was replaced with a release-driven
  plan because the repository already contains most MVP features. Hosted SaaS,
  billing, collaboration, native apps, semantic search, and E2EE are retained
  as validated future work rather than immediate implementation commitments.
