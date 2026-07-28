# End-to-End Encryption (E2EE) Security Design & Go/No-Go Decision

> **Status:** APPROVED (Decision: **No-Go for app-wide note E2EE**; **Go for Phase R6 isolated zero-knowledge secret vault**)  
> **Date:** 2026-07-26  
> **Author:** Antigravity AI / Inkest Architecture Team  
> **Task Reference:** P1-46 in [`docs/DONE.md`](../DONE.md), R6 in [`docs/TODO.md`](../TODO.md)

---

## Executive Summary

Inkest evaluates whether to implement full-application End-to-End Encryption (E2EE) across all Markdown notes, attachments, and project tasks, or maintain and harden the current authenticated server-side Encryption-at-Rest baseline.

### Core Recommendation

1. **NO-GO on App-Wide Note E2EE:** Full client-side zero-knowledge encryption of all user Markdown notes is **rejected** for the general personal knowledge base (PKB) and project management application. App-wide E2EE fundamentally conflicts with Inkest's core product capabilities: server-assisted AI actions (summarization, task extraction, planning), SQLite server-side full-text search, automatic backlink indexing, and background calendar sync.
2. **GO on Phase R6 Zero-Knowledge Secret Vault (Targeted Scope):** Inkest approves a targeted, client-side zero-knowledge vault **specifically for secrets, API tokens, passwords, and sensitive credentials** (Phase R6). This vault operates with client-derived key material (Argon2id + WebCrypto AES-256-GCM / WebAuthn PRF), where the server stores only ciphertext payloads. Vault items are strictly excluded from server AI processing and indexing.

---

## 1. Existing Encryption-at-Rest Architecture (Baseline)

Currently, Inkest enforces a multi-layer server-side security baseline:

- **Database at Rest:** SQLite database file storage on disk, with optional file-system encryption or volume-level encryption (LUKS / cloud disk encryption).
- **Sensitive Credentials:** User API keys (OpenAI/Anthropic/custom AI endpoints) and Google OAuth access/refresh tokens are encrypted at rest using AES-256-GCM (`src/server/crypto/secret-box.ts`) with a key ring configured via `AI_CREDENTIAL_ENCRYPTION_KEYS`. Secrets are never sent to the browser or logged.
- **Private Attachments:** Attachments are stored on local disk or MinIO/S3 and served through the authenticated `/api/attachments/[id]` route (`P0-41`), enforcing user-level authorization checks before streaming bytes.
- **Diagnostics & Audit:** Diagnostics redact note titles, contents, credentials, and user IDs before logging (`P1-45`).

---

## 2. Threat Model for Full App E2EE vs. Server Encryption-at-Rest

| Threat / Dimension | Current Server Encryption-at-Rest | Full Client-Side E2EE (App-wide Notes) | Isolated Zero-Knowledge Vault (Phase R6) |
|---|---|---|---|
| **Server Compromise (Database Leak)** | Attacker with raw DB access reads unencrypted note content unless disk encryption is used. | Attacker gets only ciphertext for notes; cannot read content without client keys. | Attacker gets ciphertext for vault items; cannot read passwords/secrets without master key. |
| **Server AI Assistant Integration** | Native and fast. Server AI actions process note content using user-configured API keys. | **Broken.** Server cannot process notes without sending client keys or decrypting client-side first. | **Preserved for notes.** Vault items are excluded from AI; notes remain AI-accessible. |
| **Full-Text Search & Backlinks** | SQLite FTS5 index performs sub-10ms full-text and backlink search across thousands of notes. | **Broken or Slow.** Requires in-browser index building (WASM SQLite / IndexDB), consuming heavy RAM and CPU. | **Preserved.** Note search remains fast server SQLite; vault items search by unencrypted client metadata/local cache. |
| **Key Ownership & Recovery** | Password reset via email/token allows account recovery. | **Data Loss Risk.** If passphrase/recovery code is lost, all user notes are permanently unrecoverable. | **Controlled Loss.** Lost passphrase loses secrets/passwords, but normal notes and work remain safe. |
| **Multi-Device & Sync Friction** | Instant login from any browser without key exchange protocols. | Complex key distribution (WebAuthn PRF, signal protocol, or key file transfers). | Key unlocked on demand via master key or WebAuthn PRF per device session. |
| **XSS Vulnerability Impact** | Attacker can make API calls in user session. | **Catastrophic.** An XSS payload can exfiltrate in-memory decrypted key material and plaintext notes. | Standard WebCrypto ephemeral memory management limits exposure window. |

---

## 3. Detailed Trade-off Analysis

### 3.1 Server-Side AI Actions vs. E2EE
Inkest's core value proposition relies on explicit, context-aware AI tools (`summarize`, `extract-tasks`, `create-project-plan`, `improve-writing`). If notes were end-to-end encrypted:
- The server would not be able to evaluate prompt templates, chunk context, or format JSON schemas for AI providers.
- Sending raw notes to cloud AI models (OpenAI, Anthropic, Gemini) already requires plaintext transmission over TLS to the AI provider endpoint. E2EE for note storage creates a false expectation of zero-knowledge privacy when the user actively invokes AI features on those same notes.

### 3.2 Full-Text Search, Wiki Links & Backlinks
Inkest indexes Markdown notes for `[[wiki link]]` resolution and backlink graph queries. Server-side SQLite query performance is sub-millisecond. Under full E2EE:
- Server backlink lookups (`getBacklinks`) become impossible because the server cannot parse `[[...]]` tokens in encrypted `content_md`.
- All indexing must move into browser memory (IndexedDB), causing high memory consumption, initial sync delays, and poor mobile device performance.

### 3.3 Key Ownership, Passphrases & Recovery
Self-hosted users frequently forget credentials or reset accounts.
- Under full E2EE, server administrators or account recovery workflows **cannot** restore content if the user loses their passphrase.
- For general writing, notes, and task management, zero-recovery data loss is unacceptable for the majority of non-hardcore security users.

---

## 4. Formal Decision & Governance

### Decision Statement
1. **General Notes & Workspaces:** Remain stored with **Server-Side Encryption-at-Rest** (SQLite + filesystem / S3 encryption, authenticated access control, encrypted API/OAuth credentials).
2. **Secrets & Vault Items:** **Approved for Phase R6 implementation.** Password manager entries, API tokens, zero-knowledge secret notes, and SSH/private keys will be stored in a dedicated `vault_items` table, encrypted client-side using AES-256-GCM via WebCrypto with key derivation from Argon2id (`SEC-PASSWORDS`) and passkeys (`SEC-AUTH`).

### Boundary & Release Rules
- Inkest documentation, landing page, and marketing **MUST NOT** claim "End-to-End Encrypted Notes" for general workspace notes.
- Marketing text may state: *"Private self-hosted architecture with encrypted credential storage at rest and optional zero-knowledge secret vault."*

---

## 5. Verification & Acceptance Criteria (P1-46)

- [x] Threat model documented comparing server encryption-at-rest against full client-side E2EE and isolated vault.
- [x] Technical trade-offs for key ownership, metadata, search, attachments, multi-device sync, and AI incompatibility evaluated.
- [x] Written security design and go/no-go decision approved and recorded in `docs/e2ee-decision.md`.
