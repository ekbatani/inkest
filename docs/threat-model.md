# Inkest Versioned Threat Model (SEC-THREATS)

> **Version:** 1.0.0  
> **Date:** 2026-07-23  
> **Status:** Active  
> **Requirement:** SEC-THREATS (Builds on P0-40 release security audit)

---

## 1. Scope and System Description

Inkest is a personal, Markdown-first cognitive workspace. It allows users to write notes, organize project boards, ingest documents (PDF/text), interact with retrieval-grounded AI, sync Google Calendar, and manage encrypted secrets.

### Data Assets & Sensitivity Levels
1. **User Notes & Attachments (High):** Confidential user-owned Markdown and private files.
2. **AI Credentials & Tokens (Critical):** Provider API keys, OAuth refresh tokens, Telegram credentials.
3. **Vault Plaintext (Critical):** Client-encrypted secrets and keys (gated by R6-04).
4. **Session Credentials (High):** NextAuth cookies, passkey WebAuthn credentials, Argon2id password hashes.

---

## 2. Threat Vector & Mitigation Matrix

| Threat Vector ID | Named Threat | Risk Level | Mitigation & Technical Controls | Component / Owner |
|---|---|---|---|---|
| **THREAT-XSS-01** | Cross-Site Scripting (XSS) via Markdown / Preview Rendering | **Critical** | Mandatory DOMPurify sanitization after Markdown conversion; strict Content Security Policy (`CSP`); Trusted Types enforcement (`SEC-WEB`); no `dangerouslySetInnerHTML` without sanitizer wrapper. | `src/components/markdown/` (Frontend) |
| **THREAT-SRV-02** | Server Compromise & Unscoped Database Reads | **High** | Scope every database query with explicit `and(eq(userId), eq(workspaceId))` checks (`AGENTS.md` core rule); enforce tenant separation in server actions; AES-256-GCM encrypted key storage. | `src/server/` (Backend) |
| **THREAT-AUTH-03** | Stolen Credentials & Session Hijacking | **High** | Upgrade account hashing to Argon2id with unique salts; support phishing-resistant WebAuthn Passkeys (`SEC-AUTH`); HTTP-only, secure, `SameSite=Lax` cookies; rapid session invalidation on password change. | `src/server/auth/` (Security) |
| **THREAT-INJ-04** | Prompt Injection via Untrusted Ingested Documents | **High** | Treat document text as untrusted external content; wrap user-document context in strict system prompt delimiters; block policy-violating document instruction overrides; enforce diff review before apply (`AI-CONTROL`). | `src/server/ai/` (AI System) |
| **THREAT-UPL-05** | Malicious File Uploads (Path Traversal / MIME Confusion) | **High** | Magic-byte signature verification; strict extension whitelist; store files with random IDs outside web root; serve downloads via authenticated route with `Content-Type: application/octet-stream` or explicit force-download headers + `X-Content-Type-Options: nosniff`. | `src/server/attachments/` (Storage) |
| **THREAT-DEV-06** | Local Device Loss or Physical Access | **Medium** | Client-side zero-knowledge vault encrypted at rest with Argon2id-derived key; automatic session timeout options; memory wiping of plain text clipboard after 30 seconds. | `src/components/vault/` (Client Crypto) |
| **THREAT-COLLAB-07**| Unauthorized Workspace Access / Cross-Tenant Data Leakage | **High** | Authenticate every server action and API route before authorization checks; ID alone is never authorization; workspace-scoped authorization gates. | `src/server/` (Backend) |
| **THREAT-LOG-08** | Secret Exposure in Logs & Analytics | **Medium** | Redact API keys, tokens, and note text from diagnostic logs (`P1-45`); standard structured JSON logging with strict secret sanitizer. | `src/server/diagnostics/` (Ops) |

---

## 3. Threat Verification & Test References

Each named threat must be covered by automated or manual verification flows:
- **THREAT-XSS-01:** Tested by DOMPurify test vectors in Markdown preview test suite.
- **THREAT-SRV-02 & THREAT-COLLAB-07:** Tested by cross-user security audit script (`P0-40`).
- **THREAT-AUTH-03:** Verified via Argon2id hash inspection and Passkey enrollment tests (`R6-01`, `R6-02`).
- **THREAT-INJ-04:** Verified by staged prompt-injection tests (`R3-04`).
- **THREAT-UPL-05:** Verified by `src/server/attachments/validation.test.ts`.

---

## 4. Revision History

- **2026-07-23 (v1.0.0):** Initial versioned threat model created for Research-MVP baseline (`R0-03`).
