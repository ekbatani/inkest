# Inkest Remaining Tasks & Operational Backlog

> **Purpose:** This document is the single active operational backlog for Inkest. It contains all open, blocked, discovery, and future tasks required to deliver the public self-hosted release and the evidence-based cognitive workspace vision.
>
> For completed history and verification evidence, see [DONE.md](DONE.md).

---

## Task Maintenance Guidelines

- **Single Backlog:** Treat this file as the sole source of truth for open work. Do not create duplicate task lists.
- **Priority Definitions:**
  - **P0**: Blocks the public release baseline or critical security gates.
  - **P1**: Materially improves core experience, safety, or beta feedback.
  - **P2**: Validated follow-on capabilities and research milestones.
  - **P3**: Longer-term or optional expansion.
- **Statuses:**
  - **`[now]`**: Current active task (only one task may hold this status).
  - **`[todo]`**: Ready for implementation once dependencies are clear.
  - **`[discovery]`**: Time-boxed research or design task leading to a written ADR.
  - **`[blocked]`**: Cannot proceed without an explicit external credential, host capability, or decision.
- **Non-Negotiable Boundaries:**
  - Authenticate every action and scope reads/mutations to current user/workspace.
  - Preserve note Markdown through all transformations.
  - Keep attachments private behind authenticated attachment handlers.
  - Apply Drizzle database migrations (`bun run db:generate`, `bun run db:migrate`).
  - Read Next.js guidelines in `node_modules/next/dist/docs/` before making Next.js route or layout changes.

---

## 1. Immediate Release Blockers & Security Checks

- [blocked] **P0-41 — Verify private attachment security.** Test file type/size validation, path handling, ownership checks, storage-driver parity, download headers, error responses, and cache behavior.
  - **Acceptance:** An unauthenticated or different user cannot retrieve an attachment; invalid uploads fail safely; approved downloads work using both local SQLite/filesystem and MinIO/S3-compatible drivers.
  - **Blocker:** Local MinIO profile and Docker runtime were inaccessible during automated runner execution; requires live cross-account authenticated S3 parity drill.

- [blocked] **P0-43 — Verify clean Docker deployment and publish image plan.** Build and run the documented Compose path from scratch, test migration and persistent volumes, then prepare registry namespace, tags, SBOM/provenance policy, and image update process for Docker Hub.
  - **Acceptance:** Clean host can deploy without source edits; image publishing proceeds once registry credentials and namespace are provided.
  - **Blocker:** Provide a Docker-capable clean host for deployment drill and supply `DOCKERHUB_NAMESPACE`, `DOCKERHUB_USERNAME`, and `DOCKERHUB_TOKEN`.

- [blocked] **P1-44 — Investigate browser memory growth.** Reproduce reported memory increase across note switching, preview/Mermaid, AI panel, uploads, and refresh; use heap snapshots to identify retained objects.
  - **Acceptance:** Reproducible scenario and before/after memory evidence showing bounded growth in confirmed workflow.
  - **Blocker:** Requires execution in an interactive browser with Chrome DevTools heap-snapshot protocol attached (protocol documented in `docs/operations/browser-memory-investigation.md`).

---

## 2. Grounded, Safe & Explainable AI (Phase R3)

- [now] **R3-01 — Retrieval-grounded answers with visible citations (AI-GROUNDED).** For any AI answer over a configurable length, ground it against user-authorized notes/documents and show supporting chunks with openable source pointers.
  - **Acceptance:** Non-trivial AI answers display openable source note/document chunks; ungrounded answers are explicitly flagged. (Target: 100% citation coverage on non-trivial answers).

- [todo] **R3-02 — AI explanation model (AI-EXPLAIN).** Expose source list, transformation label (e.g. "summary", "question generation"), and uncertainty warnings when context evidence is weak or conflicting.
  - **Acceptance:** UI displays source list, action label, and uncertainty notice whenever evidence is partial or low-confidence.

- [todo] **R3-03 — Full diff/approve control for AI mutations (AI-CONTROL).** Extend review-before-apply panel (P1-33) to a full diff/preview with explicit approve/reject for every AI edit, task mutation, or classification.
  - **Acceptance:** Zero silent mutations; every AI change requires explicit user approval before writing.

- [todo] **R3-04 — AI safety and resilience (AI-SAFETY).** Enforce rate limits, quota controls, provider timeouts, prompt-injection defenses (treating document text as adversarial), and graceful fallback to manual search on provider failure.
  - **Acceptance:** Provider outage/timeout degrades gracefully to search UI; prompt-injection test suite blocks policy-violating instructions.

---

## 3. Planner, Review Rituals & Calm Focus (Phase R4)

- [todo] **R4-01 — Goal-to-next-action planner (FR-PLANNER).** Extend tasks/daily notes into a planner supporting goal decomposition and implementation intentions (when/where/how fields, start/due dates, next-action cues).
  - **Acceptance:** Tasks created from notes carry concrete next actions and if-then cues appearing in daily/weekly views.

- [todo] **R4-02 — Daily/weekly review ritual (FR-PLANNER).** Provide a weekly-review view surfacing overdue, upcoming, and unplanned items with a lightweight review checklist.
  - **Acceptance:** User can complete weekly review in one view; overdue task aging is visible.

- [todo] **R4-03 — Configurable work/break focus timers (FR-CALM).** Add optional timed sessions with self-regulated, 25/5, and custom presets without mandating a single ritual.
  - **Acceptance:** Focus mode offers presets, none required to write; session interruption count is observable.

- [todo] **R4-04 — Notification batching and peripheral status (FR-CALM).** Batch/defer non-essential notifications and keep status peripheral during focus sessions.
  - **Acceptance:** Non-essential notifications suppressed or batched during focus; soft reminders; respects reduced-motion.

---

## 4. Journaling & Personal Project Boards (Phase R5)

- [todo] **R5-01 — Journal templates (FR-JOURNAL).** Add daily-reflection, gratitude, decision-journal, and emotion-check-in templates on top of daily notes engine.
  - **Acceptance:** Entries can start from templates or blank pages; private, dated, and opt-out from AI by default.

- [todo] **R5-02 — Personal project boards with WIP limits (FR-PROJECTS).** Extend projects into visual boards with status columns and optional column WIP limits with warnings.
  - **Acceptance:** Tasks move across status columns; WIP limits warn when exceeded; project notes never appear as task cards (preserving P1-24 semantics).

---

## 5. Encrypted Zero-Knowledge Vault & Web Hardening (Phase R6)

> **Note:** Zero-Knowledge Vault implementation is approved for secret items per the P1-46 E2EE decision (`docs/architecture/e2ee-decision.md`). Full-app Markdown E2EE remains explicitly out of scope to preserve search and AI capabilities.

- [todo] **R6-01 — Argon2id account password hashing (SEC-PASSWORDS).** Store account credentials with Argon2id and unique salts; provide migration from legacy hashes.
  - **Acceptance:** Account inspection confirms Argon2id parameter enforcement; zero reversible password paths.

- [todo] **R6-02 — Passkeys and MFA (SEC-AUTH).** Support WebAuthn passkeys and TOTP MFA, highlighting passkeys as the preferred phishing-resistant option.
  - **Acceptance:** User can register/log in via WebAuthn passkey or TOTP MFA with recovery fallback paths.

- [todo] **R6-03 — Web hardening for client-crypto app (SEC-WEB).** Enforce HTTPS, strict security headers, CSP, Trusted Types, and sanitized Markdown rendering (DOMPurify).
  - **Acceptance:** Automated checks confirm headers/CSP/Trusted Types; renderer strips all script payloads.

- [todo] **R6-04 — Threat-model and design the vault (FR-VAULT + P1-46).** Produce client-side authenticated-encryption design using Web Crypto / libsodium.js for secret items.
  - **Acceptance:** Approved written design proving server stores only ciphertext and never vault plaintext or long-term keys.

- [todo] **R6-05 — Vault storage and item lifecycle (FR-VAULT).** Client-side encrypted create/reveal/copy-with-timeout/rotate for passwords, API keys, and secret notes.
  - **Acceptance:** Architecture tests prove ciphertext-only storage; clipboard auto-clears; secrets excluded from analytics/logs.

- [todo] **R6-06 — Recovery: account vs vault (SEC-RECOVERY).** Separate account recovery (login reset) from vault recovery (user-held recovery code required).
  - **Acceptance:** Account recovery succeeds without leaking vault contents; vault recovery impossible without user key material.

- [todo] **P2-47 — Implement E2EE secret vault slice.** Vertical slice implementation of the Phase R6 secret vault following R6-04 approval.
  - **Acceptance:** Protected ciphertext unreadable by server; independent security review passes.

---

## 6. Spaced Resurfacing & Learning Tools (Phase R7)

- [todo] **R7-01 — Note distillation and self-explanation prompts (AI-LEARNING).** Add distillation linking back to source passages and elaborative-interrogation prompts.
  - **Acceptance:** Distillations link directly to source passages; prompts remain opt-in and reviewable.

- [todo] **R7-02 — Retrieval-practice question generation (AI-LEARNING).** Generate flashcard retrieval questions from notes/documents with visible citations.
  - **Acceptance:** Generated flashcards link to source material; user can edit, accept, or discard.

- [todo] **R7-03 — Spaced resurfacing scheduler (AI-LEARNING).** Resurface relevant dormant notes on distributed-practice intervals.
  - **Acceptance:** Configurable resurfacing intervals; soft, calm-writing notifications.

---

## 7. Audit Trails & Collaboration Discovery (Phase R8)

- [todo] **R8-01 — User-visible audit trails (DATA-AUDIT).** Record inspectable trails for security events, AI actions, vault access, and content changes.
  - **Acceptance:** User can inspect security, AI, and vault access logs; secret plaintext excluded.

- [discovery] **R8-02 — Encrypted sharing and shared projects (Later).** Research permission models and conflict resolution strategies for workspace sharing.
  - **Acceptance:** Written design covering permissions, revocation, and isolation before code implementation.

- [discovery] **R8-03 — Media provenance (Optional, Later).** Evaluate C2PA for attached media provenance if AI-generated media handling is added.
  - **Acceptance:** Written decision document; no unnecessary dependencies added.

---

## 8. Public Self-Hosted Launch Package (Phase 5)

- [todo] **P0-50 — Finalize brand foundations.** Validate Inkest name/domain availability, design production logo, and replace temporary branding consistently.
  - **Acceptance:** Brand assets licensed, rendering properly at app, social, and favicon sizes across app and landing page.

- [todo] **P0-51 — Prepare legal and trust pages.** Prepare legal text for license, privacy policy, terms of service, AI disclosure, and support scope.
  - **Acceptance:** Legal pages published and linked; claims match actual storage, encryption, and telemetry practices.

- [todo] **P0-52 — Complete public documentation.** Publish install/upgrade, configuration, backup/restore, import/export, AI provider, and security guides.
  - **Acceptance:** Self-hoster can install, operate, update, back up, and troubleshoot Inkest using public docs.

- [todo] **P1-53 — Finish landing-page conversion and help surfaces.** Review positioning, feature claims, screenshots, responsive layout, Open Graph tags, and sitemap.
  - **Acceptance:** Public site clearly communicates value proposition with verified production metadata.

- [todo] **P1-54 — Run a private beta with 20–50 target users.** Recruit self-hosters, knowledge workers, and writers for scripted onboarding and feedback.
  - **Acceptance:** Feedback triaged weekly; core writing, project, export, and setup journeys verified by external testers.

- [todo] **P1-55 — Define product analytics that respect privacy.** Self-host-compatible opt-in telemetry for activation and editor reliability without collecting note content.
  - **Acceptance:** Telemetry schema documented; opt-in/disable controls verified; zero note text collected.

- [todo] **P1-56 — Execute the self-hosted launch package.** Prepare release notes, GitHub release, community posts, and support process.
  - **Acceptance:** Launch assets, links, issue labels, and hotfix rollback procedures prepared prior to public announcement.

---

## 9. Hosted Offering: Validate Before Building (Phase 6)

- [discovery] **P2-60 — Validate hosted-plan demand and packaging.** Interview users on hosted sync, backups, storage limits, and AI credit packaging.
  - **Acceptance:** Documented customer segment, pricing willingness, and feature boundaries justifying hosted build.

- [discovery] **P2-61 — Design hosted multi-tenant architecture.** Specify tenant isolation, managed DB/object storage, domain routing, secret management, and disaster recovery.
  - **Acceptance:** Architecture decision record with cost model, threat model, and vendor choices.

- [todo] **P2-62 — Build hosted foundations after P2-60 and P2-61.** Staging environment, tenant-safe provisioning, storage quotas, backup jobs, and transactional email.
  - **Acceptance:** Staging environment can provision, isolate, and delete test tenants safely.

- [todo] **P2-63 — Add billing and entitlement management.** Server-verified subscriptions, plan limits, AI credits, invoices, and self-service portal.
  - **Acceptance:** Purchase, upgrade, downgrade, and cancel flows verified in sandbox.

- [todo] **P2-64 — Launch small hosted beta.** Migrate opt-in testers; monitor reliability, support load, activation, and conversion.
  - **Acceptance:** Hosted launch metrics and alert thresholds defined; users can export/delete data anytime.

---

## 10. Validated Ecosystem Expansion (Phase 7)

- [discovery] **P3-70 — Choose mobile delivery deliberately.** Compare responsive PWA improvements vs native Android/iOS shells.
  - **Acceptance:** Written decision choosing mobile delivery path based on user demand and offline requirements.

- [todo] **P3-71 — Deliver approved mobile path.** Implement responsive/PWA or native writing experience.
  - **Acceptance:** Mobile writing experience verified on physical devices for offline editing and attachment view.

- [discovery] **P3-72 — Validate collaboration and sharing.** Research multi-user note/project permissions and conflict resolution.
  - **Acceptance:** Approved permission and conflict resolution model.

- [todo] **P3-73 — Implement smallest approved sharing slice.** Initial scoped sharing vertical slice based on P3-72.
  - **Acceptance:** Server-enforced permissions with immediate revocation and cross-user isolation tests.

- [todo] **P3-74 — Improve import and migration.** Markdown folder import with dry-run preview, attachment handling, and rollback.
  - **Acceptance:** Representative Markdown folder imports cleanly and exports back without data loss.
