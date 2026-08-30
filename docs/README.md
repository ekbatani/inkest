# Inkest Documentation Index

This directory contains the durable documentation, task logs, architecture decisions, operational guides, and product specifications for Inkest.

---

## 📋 Task Backlog & Execution Tracking

| Document | Purpose |
| :--- | :--- |
| **[TODO.md](TODO.md)** | Single operational backlog containing all active, blocked, discovery, and future tasks |
| **[DONE.md](DONE.md)** | Canonical completed task log with acceptance criteria, completion dates, and verification evidence |

---

## 🏛 Core Durable Specifications

| Document | Description |
| :--- | :--- |
| **[PRODUCT.md](PRODUCT.md)** | Product vision, positioning, taxonomy, core capabilities, and release gates |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | Application boundaries, data layers, authorization, security, and AI contracts |
| **[OPERATIONS.md](OPERATIONS.md)** | Environment configuration, performance budgets, monitoring, and operations baseline |
| **[billing.md](billing.md)** | Crypto payment providers, credit ledger, webhook security model, and operator configuration |

---

## 📐 Architecture & Security

| Document | Description |
| :--- | :--- |
| **[threat-model.md](architecture/threat-model.md)** | Threat model v1.0.0 mapping vulnerabilities to technical mitigations |
| **[e2ee-decision.md](architecture/e2ee-decision.md)** | Encryption decision record (approved zero-knowledge secret vault; Markdown search preservation) |
| **[semantic-search-decision.md](architecture/semantic-search-decision.md)** | Go/no-go decision and local-first opt-in rules for semantic search & vector indexing |
| **[agentic-workflow-boundary.md](architecture/agentic-workflow-boundary.md)** | Approved limits, cost caps, confirmation points, and audit design for multi-step AI agents |

---

## 🚀 Operations & Deployment

| Document | Description |
| :--- | :--- |
| **[docker-publishing.md](operations/docker-publishing.md)** | Clean-host Docker Compose deployment, image tags, provenance, and registry publishing policy |
| **[backup-restore.md](operations/backup-restore.md)** | SQLite database and attachment backup, restore procedures, and export verification |
| **[diagnostics.md](operations/diagnostics.md)** | Privacy-safe self-hosted error reporting, retention policies, and alert webhooks |
| **[release-smoke-test.md](operations/release-smoke-test.md)** | Step-by-step manual and automated preflight release smoke testing checklist |
| **[release-checklist-2026-07-14.md](operations/release-checklist-2026-07-14.md)** | Initial release baseline, environment setup, and verification snapshot |
| **[browser-memory-investigation.md](operations/browser-memory-investigation.md)** | Chrome DevTools heap-snapshot investigation protocol for browser memory profiling |

---

## 🎨 Product & Design System

| Document | Description |
| :--- | :--- |
| **[design-system.md](product/design-system.md)** | Shared design tokens, color palettes, typography specs, UI layouts, and motion guidelines |
| **[beta-feedback.md](product/beta-feedback.md)** | Public beta bug report workflow, issue severity definitions, and triage cadence |

---

## 🔒 Audits & Security Reports

| Document | Description |
| :--- | :--- |
| **[attachment-security-test.md](audits/attachment-security-test.md)** | Attachment storage authorization, MIME/signature validation, and cross-account audit checklist |
| **[audit-pkb-reader-ai.md](audits/audit-pkb-reader-ai.md)** | Initial audit inventory of PKB links, reader engine, and AI context grounding |
| **[pkb-reader-ai-audit-2026-07-26.md](audits/pkb-reader-ai-audit-2026-07-26.md)** | Follow-up audit of cognitive workspace surfaces against specification goals |

---

## 💼 Business & Strategy

| Document | Description |
| :--- | :--- |
| **[Business Plan](business-plan/business-plan.md)** | Commercial strategy, market positioning, and subscription packaging hypotheses |
| **[Deep Research Report](business-plan/deep-research-report.md)** | Evidence base and cognitive psychology foundation for Inkest |
| **[Requirements Specification](business-plan/deep-research-report-requirment.md)** | Prioritized functional (FR), AI (AI), security (SEC), and non-functional (NFR) requirements |

---

> The main repository **[README.md](../README.md)** serves as the entry point and quick-start guide.
