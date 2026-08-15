# E2E Test Suite Ready — Inkest AI Chat Sidebar

**Status**: READY  
**Test Runner Command**:
```bash
bun test tests/e2e/ai-chat-sidebar.test.ts
```

---

## Coverage Summary

| Requirement | Scope | Test File | Tier Coverage | Status |
|---|---|---|---|---|
| **R1** | AI Sidebar Scroll & Layout | `tests/e2e/ai-chat-sidebar.test.ts` | Tier 1, Tier 3 | ✅ READY |
| **R2** | Persistent Chat History & Database CRUD | `tests/e2e/ai-chat-sidebar.test.ts` | Tier 1, Tier 2, Tier 3, Tier 4 | ✅ READY |
| **R3** | Context Referencing (@notes, @projects, @files) | `tests/e2e/ai-chat-sidebar.test.ts` | Tier 1, Tier 2, Tier 3, Tier 4 | ✅ READY |
| **R4** | Password-Protected Vault Access Modal & Crypto | `tests/e2e/ai-chat-sidebar.test.ts` | Tier 1, Tier 2, Tier 3, Tier 4 | ✅ READY |
| **R5** | Security Authorization & Verification Standards | `tests/e2e/ai-chat-sidebar.test.ts` | Tier 1, Tier 2, Tier 4 | ✅ READY |

---

## Test Suite Details

- **Test Suite Location**: `tests/e2e/ai-chat-sidebar.test.ts`
- **Infrastructure Documentation**: `TEST_INFRA.md`
- **Total Test Cases**: 14 comprehensive test cases covering 4 test tiers:
  - **Tier 1 (Feature Coverage)**: Core happy-path for scroll container, autoscroll, mobile Sheet responsive breakpoints (<640px), thread creation, history listing, session switching, thread deletion, multi-tenant isolation (`userId` & `workspaceId`), context `@mentions` autocomplete search, context tag badges in input, single-prompt payload packaging, `VaultPasswordModal` trigger, WebCrypto AES-GCM decryption, transient payload handling, and invalid password error toast handling.
  - **Tier 2 (Boundary & Corner Cases)**: Empty threads, rapid message concurrency lock (`isGenerating`), invalid vault passwords, missing/deleted context IDs, XSS payloads (`<script>alert(1)</script>`), SQL injection quotes (`' OR '1'='1`), multi-byte Unicode emojis (🚀🔥), and 10,000+ character extra-long prompt strings.
  - **Tier 3 (Cross-Feature Combinations)**: Transient vault payloads inside persistent multi-turn chat threads, switching active thread while `VaultPasswordModal` is active, mobile Sheet layout with context tags and autoscroll.
  - **Tier 4 (Real-World Scenarios)**: Multi-step end-to-end user workflow combining thread initialization, `@` context search, vault authentication modal, WebCrypto client-side decryption, server action prompt payload dispatch, response autoscroll, persistent session reload, and thread deletion.

---

## How to Run Tests

1. Run AI Chat Sidebar E2E tests:
   ```bash
   bun test tests/e2e/ai-chat-sidebar.test.ts
   ```

2. Run full project typecheck, lint, and build verification:
   ```bash
   bun run typecheck
   bun run lint
   bun run build
   ```
