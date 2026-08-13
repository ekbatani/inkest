# Inkest AI Chat Sidebar — E2E Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Overview & Test Architecture

This document defines the End-to-End (E2E) testing methodology, infrastructure, and test suite layout for the **Inkest AI Chat Sidebar** features (Requirements R1 through R5).

The test suite is implemented using **Bun's Native Test Runner** (`bun test`). It provides fast, TypeScript-native execution with zero transpilation overhead.

### Key Infrastructure Components:
- **Test File**: `tests/e2e/ai-chat-sidebar.test.ts`
- **Runner**: `bun test`
- **Execution Environment**: Node/Bun runtime with WebCrypto AES-GCM support and DOM state helpers.
- **Fixture Strategy**: Self-contained, isolated test contexts with per-test tenant scoping (`userId`, `workspaceId`) to guarantee zero inter-test side effects.

---

## 2. Test Suite Layout

```
tests/
└── e2e/
    └── ai-chat-sidebar.test.ts   # Comprehensive E2E test suite (Tiers 1-4 for R1-R5)
```

---

## 3. Requirement Mapping Matrix (R1 – R5)

| Requirement | Description | Test Suite / Focus | Tier |
|---|---|---|---|
| **R1** | AI Sidebar Scroll & Layout | Bounded scroll container, autoscroll trigger, keyboard scroll shortcuts, mobile Sheet drawer | Tier 1, 3 |
| **R2** | Persistent Chat History | Drizzle schema & CRUD actions (`createChatThreadAction`, `listChatThreadsAction`, `getChatThreadMessagesAction`, `deleteChatThreadAction`), history drawer UI, tenant isolation | Tier 1, 2, 3, 4 |
| **R3** | Context Referencing (@notes, @projects, @files) | `searchContextItemsAction`, `@` mention trigger popover, context tag badges in chat input, prompt payload packaging | Tier 1, 2, 3, 4 |
| **R4** | Password-Protected Vault Access | `VaultPasswordModal` prompt dialog, WebCrypto AES-GCM client decryption, single-prompt transient payload, invalid password error handling & toasts | Tier 1, 2, 3, 4 |
| **R5** | Verification & Code Standards | Tenant authorization scoping (`userId`, `workspaceId`), error handling, Markdown rendering contract, TypeScript type safety | Tier 1, 2, 4 |

---

## 4. Test Strategy by Tiers

### Tier 1: Feature Coverage (Happy Path & Core Functional Requirements)
1. **Scroll Container & Layout (F1 - F4)**:
   - Dedicated scroll container rendering for chat messages.
   - Smooth autoscroll trigger to latest message on response receipt.
   - Scroll controls (scroll-to-bottom button) and keyboard navigation shortcuts.
   - Mobile Sheet drawer view rendering for viewport width < 640px.
2. **Persistent Chat History (F5 - F8)**:
   - Thread creation with default and custom titles (`createChatThreadAction`).
   - Listing chat session history per user and workspace (`listChatThreadsAction`).
   - Switching active chat session and loading stored message thread (`getChatThreadMessagesAction`).
   - Deleting chat thread from history list (`deleteChatThreadAction`).
   - Verification of database tenant scoping parameters.
3. **Context Referencing (@notes, @projects, @files) (F9 - F12)**:
   - Search context items action (`searchContextItemsAction`) returning notes, projects, files, and vault item metadata.
   - Triggering `@` mention autocomplete popover.
   - Selecting context items to render tag badges in chat input.
   - Packaging context items into `PromptPayload` sent to backend.
4. **Password-Protected Vault Access (F13 - F16)**:
   - Triggering `VaultPasswordModal` when prompt or context references vault items.
   - WebCrypto PBKDF2/AES-GCM key derivation and decryption with master password.
   - Passing decrypted secret transiently for current prompt payload only.
   - Toast error display and vault access block on wrong password entry.

### Tier 2: Boundary & Corner Cases
1. **Empty Threads & History**: Creating and listing threads with zero messages.
2. **Rapid Message Submissions**: Triggering multiple prompts concurrently; verifying message queue / loading state lock (`isGenerating`).
3. **Incorrect Vault Passwords**: Wrong password, empty password string, special character passwords.
4. **Missing Context Items**: Referencing non-existent or deleted note/project IDs.
5. **Special Characters & Extreme Inputs**: XSS payload strings (`<script>alert(1)</script>`), SQL injection quotes (`' OR '1'='1`), multi-byte Unicode emojis (🚀🔥), and extra-long prompt strings (10,000+ characters).

### Tier 3: Cross-Feature Combinations
1. **Vault Context inside Persistent Chat Thread**: Verifying vault content remains transient per prompt payload, while thread messages persist across chat history reloads.
2. **Switching Active Thread during Password Modal**: Switching threads while `VaultPasswordModal` is open; verifying modal cleanup and state reset.
3. **Mobile Sheet View with Context Tags**: Rendering context tag badges inside mobile Sheet view and verifying layout responsive state.

### Tier 4: Real-World End-to-End Application Scenarios
1. **End-to-End Workflow**:
   - User starts new chat session.
   - User searches context via `@` mention and attaches both a standard note and an encrypted vault item.
   - User submits prompt, triggering `VaultPasswordModal`.
   - User enters master password, WebCrypto decrypts secret client-side.
   - Prompt with transient vault payload is dispatched to server action; response is rendered with autoscroll.
   - User switches chat session and returns, verifying persistent thread history.
   - User deletes session, confirming database cleanup and tenant scoping integrity.

---

## 5. Test Runner Commands

### Execute E2E Test Suite:
```bash
bun test tests/e2e/ai-chat-sidebar.test.ts
```

### Run Full Project Verification Suite:
```bash
bun run typecheck
bun run lint
bun run build
```

---

## 6. Expected Output Derivation Rules

All expected outputs in test cases are explicitly derived from:
- Interface contracts defined in `PROJECT.md` § Interface Contracts (`createChatThreadAction`, `listChatThreadsAction`, `getChatThreadMessagesAction`, `deleteChatThreadAction`, `searchContextItemsAction`, `ContextItem`, `PromptPayload`).
- Zero-Knowledge Vault crypto specifications in `src/lib/vault-crypto.ts` (WebCrypto AES-GCM, PBKDF2 with 100,000 iterations, 16-byte salt, 12-byte IV).
- Non-negotiable security requirements in `AGENTS.md` (Strict tenant scoping per `userId` and `workspaceId`, transient non-persisted vault secrets).
