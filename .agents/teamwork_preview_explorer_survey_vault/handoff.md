# Handoff Report — Inkest Vault & AI Context Survey

## 1. Observation
Direct codebase observations:
- **Vault Schema (`src/server/db/schema.ts:419-440`)**: `vault_items` table contains `id`, `userId`, `workspaceId`, `title`, `category`, `ciphertext` (`${salt}:${ciphertext_hex}`), `iv`, `authTag`, `createdAt`, `updatedAt`.
- **Vault Cryptography (`src/lib/vault-crypto.ts:18-92`)**:
  - `deriveVaultKey(masterPassword, salt)` derives a 256-bit AES-GCM key using PBKDF2 with SHA-256 and 100,000 iterations via `window.crypto.subtle`.
  - `encryptVaultSecret` and `decryptVaultSecret` handle WebCrypto AES-GCM encryption/decryption. WebCrypto `subtle.decrypt` verifies the GCM auth tag, throwing an `OperationError` on invalid master passwords.
- **Vault Service & Actions (`src/server/vault/vault-service.ts` & `actions.ts`)**: Server routes do zero-knowledge ciphertext storage (`createVaultItem`, `listVaultItems`, `deleteVaultItem`).
- **Modal Dialog Primitive (`src/components/ui/dialog.tsx:1-161`)**: `Dialog` primitive (using `@base-ui/react/dialog`) supports accessible modal popups, focus traps, backdrop overlays, and RTL layouts.
- **AI Chat Sidebar (`src/components/ai/ai-chat-sidebar.tsx:1-531`)**: AI Assistant sidebar handles chat prompt submission to server actions (`runAiChatPromptAction`). Currently stores chat messages in React local state (`useState`).
- **AI Server Endpoint & Runner (`src/app/api/ai/route.ts:1-375` & `src/server/ai/runner.ts:1-267`)**: `runTextAction` and `runJsonAction` execute AI provider prompts with input sanitization, max input token budgeting, and database audit logging to `ai_events`.

## 2. Logic Chain
1. *Observation*: Vault secrets are stored as zero-knowledge AES-GCM ciphertext blobs in SQLite (`vault_items`), while regular notes are stored as unencrypted Markdown in `notes.contentMd`.
2. *Observation*: Decryption requires the Vault Master Password using client-side WebCrypto (`decryptVaultSecret`). The server never stores master passwords or plaintext secrets.
3. *Logic Step*: To fulfill requirement R4 ("Access to vault data must require explicit password verification on every access attempt without exposing cleartext credentials or persisting unencrypted vault data to client state"):
   - When a user prompt includes `@vault` items or requests vault access, client-side pre-flight logic must pop up a `VaultPasswordModal` (using `DialogContent` from `src/components/ui/dialog.tsx`).
   - The user inputs their Vault Master Password. The client executes `decryptVaultSecret` in browser memory.
   - If WebCrypto decryption succeeds, plaintext is passed strictly for that request payload to the AI server action and immediately disposed of from client memory.
   - If WebCrypto decryption fails, an error toast is displayed (`toast.error`), and the AI request is blocked.
4. *Observation*: Context referencing (`@notes`, `@projects`, `@files`) requires autocompleting and attaching referenced entity text & metadata into the AI prompt payload.
5. *Logic Step*: Combining context selection via `Command` combobox with AI payload construction allows seamless context injection while maintaining user/workspace authorization checks at the server boundary.

## 3. Caveats & Remaining Work
- **Caveats**:
  - WebCrypto API (`window.crypto.subtle`) operates in browser environments. Password verification and decryption MUST be triggered client-side before sending the payload.
  - Plaintext decrypted vault content sent in the AI server action payload should be excluded or sanitized in `ai_events` audit logs to preserve zero-knowledge principles.
- **Remaining Implementation Steps**:
  - Create `VaultPasswordModal` component.
  - Implement chat history database tables (`chat_sessions` and `chat_messages`) in `schema.ts`.
  - Implement `@mention` autocomplete popover in `AiChatSidebar`.
  - Wire vault password verification modal to AI server action submission payload.

## 4. Conclusion
The Inkest codebase has clear architectural patterns for zero-knowledge vault storage (`src/lib/vault-crypto.ts`), dialog popups (`src/components/ui/dialog.tsx`), and AI server action execution (`src/server/ai/runner.ts`). Integrating password-authenticated vault access on every request alongside `@notes`, `@projects`, and `@files` context referencing is fully feasible and supported by existing primitives.

## 5. Verification Method
- **Verification Commands**:
  - `bun run typecheck` — Verify zero TypeScript compilation errors.
  - `bun run lint` — Verify zero ESLint warnings or errors.
  - `bun run build` — Verify successful Next.js production build.
- **Files to Inspect**:
  - `/home/amir/projects/personal/inkest/.agents/teamwork_preview_explorer_survey_vault/analysis.md`
  - `/home/amir/projects/personal/inkest/src/lib/vault-crypto.ts`
  - `/home/amir/projects/personal/inkest/src/components/ui/dialog.tsx`
  - `/home/amir/projects/personal/inkest/src/components/ai/ai-chat-sidebar.tsx`
  - `/home/amir/projects/personal/inkest/src/server/ai/chat-actions.ts`
