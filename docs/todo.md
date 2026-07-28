# Inkest Remaining Tasks & Operational Backlog

> **Purpose:** This document is the single active operational backlog for Inkest. It contains open, blocked, discovery, and future tasks required to deliver the public self-hosted release and the evidence-based cognitive workspace vision.
>
> For completed history, acceptance details, and verification evidence across all phases, see [DONE.md](DONE.md).

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

- [blocked] **P1-54 — Run a private beta with 20–50 target users.** Recruit self-hosters, knowledge workers, and writers for scripted onboarding and feedback.
  - **Acceptance:** Feedback triaged weekly; core writing, project, export, and setup journeys verified by external testers.
  - **Blocker:** Requires recruiting and coordinating external test participants.

---

## 2. Research & Collaboration Discovery (Phase R8 & Beyond)

- [discovery] **R8-02 — Encrypted sharing and shared projects (Later).** Research permission models and conflict resolution strategies for workspace sharing.
  - **Acceptance:** Written design covering permissions, revocation, and isolation before code implementation.

- [discovery] **R8-03 — Media provenance (Optional, Later).** Evaluate C2PA for attached media provenance if AI-generated media handling is added.
  - **Acceptance:** Written decision document; no unnecessary dependencies added.

---

## 3. Hosted Offering: Validate Before Building (Phase 6)

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

## 4. Validated Ecosystem Expansion (Phase 7)

- [discovery] **P3-72 — Validate collaboration and sharing.** Research multi-user note/project permissions and conflict resolution.
  - **Acceptance:** Approved permission and conflict resolution model.

- [todo] **P3-73 — Implement smallest approved sharing slice.** Initial scoped sharing vertical slice based on P3-72.
  - **Acceptance:** Server-enforced permissions with immediate revocation and cross-user isolation tests.

- [todo] **P3-74 — Improve import and migration.** Markdown folder import with dry-run preview, attachment handling, and rollback.
  - **Acceptance:** Representative Markdown folder imports cleanly and exports back without data loss.
