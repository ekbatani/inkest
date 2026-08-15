# Inkest Vault & AI Context Integration Analysis Report

## Executive Summary
This report provides a comprehensive codebase survey and architectural analysis for integrating **Password-Protected Encrypted Vault Access** and **Context Referencing (@notes, @projects, @files)** into the Inkest AI Chat system, complying with non-negotiable security boundaries, zero-knowledge constraints, and Next.js App Router server action patterns.

---

## 1. Storage & Encryption of Vault Contents vs. Notes

### A. Notes & Projects Storage
- **Database Schema**: Defined in `src/server/db/schema.ts` (lines 54–92).
- **Table**: `notes` (`sqliteTable("notes", ...)`).
- **Columns**: `id`, `userId`, `workspaceId`, `parentId`, `title`, `slug`, `contentMd`, `type` (`enum: ["note", "project", "daily"]`), `status`, `priority`, etc.
- **Storage Mode**: Unencrypted Markdown stored directly in `contentMd`. Accessible via server services (`src/server/notes/service.ts`) scoped by `userId` and `workspaceId`.

### B. Vault Items Storage
- **Database Schema**: Defined in `src/server/db/schema.ts` (lines 418–440).
- **Table**: `vault_items` (`sqliteTable("vault_items", ...)`).
- **Columns**:
  - `id`: Text primary key (`vlt_*`).
  - `userId`: Foreign key to `users.id`.
  - `workspaceId`: Foreign key to `workspaces.id`.
  - `title`: String title (unencrypted item metadata).
  - `category`: Enum `["password", "key", "token", "secret_note"]`.
  - `ciphertext`: Text column containing salt-prefixed ciphertext (`${salt}:${ciphertext_hex}`).
  - `iv`: Initialization vector in hex format.
  - `authTag`: Text (optional).
  - `createdAt`, `updatedAt`: SQLite timestamps.
- **Server Service**: `src/server/vault/vault-service.ts` and Server Actions in `src/server/vault/actions.ts`.
- **Zero-Knowledge Guarantee**: The server ONLY stores opaque ciphertext blobs, salts, and IVs. The server never receives or stores master passwords or derived encryption keys.

---

## 2. Vault Password Verification Logic, Primitives & Key Management

### A. WebCrypto Primitives (`src/lib/vault-crypto.ts`)
- **Key Derivation**:
  ```typescript
  // PBKDF2 derivation: SHA-256, 100,000 iterations, 16-byte salt -> 256-bit AES-GCM key
  export async function deriveVaultKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey>
  ```
- **Encryption**:
  ```typescript
  // Random 16-byte salt + 12-byte IV -> AES-GCM encryption -> hex outputs
  export async function encryptVaultSecret(secretText: string, masterPassword: string): Promise<{ ciphertext: string; iv: string; salt: string }>
  ```
- **Decryption & Verification**:
  ```typescript
  export async function decryptVaultSecret(ciphertextHex: string, ivHex: string, saltHex: string, masterPassword: string): Promise<string>
  ```
- **Verification Mechanism**: WebCrypto's `window.crypto.subtle.decrypt` automatically verifies the GCM authentication tag. If the master password is incorrect or salt/IV/ciphertext is invalid, `subtle.decrypt` throws an `OperationError` (decryption failure).

### B. Existing UI Password Verification (`src/components/vault/vault-view.tsx`)
- In `VaultView` (lines 50–58 & 100–120):
  - Password input sets state variable `masterPassword`.
  - Decryption is attempted on-demand when revealing items:
    ```typescript
    const parts = item.ciphertext.split(":");
    const salt = parts[0] || "";
    const cipherHex = parts[1] || item.ciphertext;
    const plain = await decryptVaultSecret(cipherHex, item.iv, salt, masterPassword);
    ```
  - Catch block traps invalid password errors and displays `toast.error("Decryption failed. Incorrect master password?")`.

---

## 3. Modal UI Components & Dialog Primitives

### A. Dialog Component (`src/components/ui/dialog.tsx`)
- Built on top of `@base-ui/react/dialog`.
- Fully supports:
  - Accessible focus trapping & keyboard esc handlers.
  - Backdrop blur overlay (`fixed inset-0 isolate z-50 bg-black/30 backdrop-blur-sm`).
  - Responsive positioning and RTL layout support (`-translate-x-1/2 rtl:translate-x-1/2`).
  - Exports: `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`.

### B. Toast Feedback (`sonner`)
- Imported via `import { toast } from "sonner";` across app components.
- Standard error reporting pattern: `toast.error("Error message")`.

### C. Pattern for `VaultPasswordModal`
- A dedicated client component `src/components/vault/vault-password-modal.tsx` using `Dialog`:
  - Input field for Vault Master Password (`type="password"`).
  - Submit button with loading state.
  - Calls `decryptVaultSecret` to test password against target vault item(s).
  - On failure: displays error toast or in-dialog alert, keeps modal open, does not leak plaintexts.
  - On success: resolves promise with decrypted text and closes modal.

---

## 4. Context Referencing (@notes, @projects, @files) Architecture

### A. Referencing System Requirements
- **Input Autocomplete**: User types `@` or clicks `@ Context` trigger in AI Sidebar input.
- **Search & Selection**: Popover/Combobox (using `src/components/ui/command.tsx`) searches:
  1. `@notes`: Filter `notes` table where `type = 'note'`.
  2. `@projects`: Filter `notes` table where `type = 'project'`.
  3. `@files`: Filter `documents` table (`src/server/db/schema.ts` line 291).
  4. `@vault`: Filter `vault_items` table.
- **Tag Rendering**: Selected items render as removable context badges in the chat input area (e.g. `@Note: Project Architecture`, `@Vault: API Secret Key`).

### B. Context Data Fetching & Security
- **Metadata Fetching**: Lightweight Server Action `searchContextItemsAction(query: string)` retrieves matching metadata (id, title, type, category) scoped to `userId` and `workspaceId`.
- **Text & Content Fetching**:
  - Regular notes/projects: Server action fetches `contentMd` during server payload handling or client attaches note content.
  - Workspace files/documents: Text content or annotations fetched via document service (`src/server/documents/`).
  - Vault items: Title & metadata fetched unencrypted; content decrypted ONLY client-side via password prompt modal before sending request payload.

---

## 5. Integration of Vault Verification with AI Server Action Payloads (R4 Compliance)

### A. R4 Requirement Mandate
*"Access to vault data must require explicit password verification on every access attempt without exposing cleartext credentials or persisting unencrypted vault data to client state."*

### B. End-to-End Workflow & Integration Strategy
1. **Context Attachment**:
   - User mentions `@vault:vlt_123` or prompt requires vault item context.
2. **Pre-Flight Verification & Decryption Modal**:
   - Before executing AI Server Action (`runAiChatPromptAction` / `POST /api/ai`), client checks if any referenced context is of type `vault`.
   - `VaultPasswordModal` pops up requesting Vault Master Password.
3. **Client-Side Decryption**:
   - Master password is fed into `decryptVaultSecret(ciphertextHex, ivHex, saltHex, masterPassword)`.
   - If WebCrypto decryption fails: abort request, trigger `toast.error("Incorrect vault password")`, clear password input field.
   - If WebCrypto decryption succeeds: plaintext is retrieved into ephemeral memory.
4. **Transient Payload Execution**:
   - Decrypted vault text is packaged into request payload `vaultContext: [{ id, title, category, decryptedContent }]`.
   - Cleartext master password is NEVER included in payload, NEVER saved to `localStorage`, and NEVER stored in React persistent state.
   - Server Action receives `vaultContext`, constructs system/grounded prompt for AI inference model (`src/server/ai/runner.ts`).
   - Server action redacts decrypted vault content when logging to `ai_events` to preserve zero-knowledge logging contracts.
   - Client immediately drops decrypted plaintext from state after request completion.

---

## Conclusion & Next Steps
The Inkest codebase is well-structured for this integration:
- WebCrypto AES-GCM + PBKDF2 primitives in `src/lib/vault-crypto.ts` are ready for client-side password verification.
- `Dialog` components in `src/components/ui/dialog.tsx` provide accessible modal UI.
- Scoped server actions in `src/server/ai/` and database client in `src/server/db/` enforce user/workspace authorization boundaries.
