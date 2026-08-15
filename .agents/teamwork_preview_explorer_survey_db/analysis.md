# Inkest AI Chat, Database Schema, and Authorization Scoping Survey

## 1. Executive Summary

This investigation analyzed the Inkest codebase to define the database schema additions, authorization scoping mechanisms, server action contracts, and security architecture required to implement:
1. **R1**: AI Sidebar bounded scroll container & responsive layout.
2. **R2**: Persistent chat thread history & session management per user & workspace.
3. **R3**: Context referencing (`@notes`, `@projects`, `@files`) with backend context resolution.
4. **R4**: Password-authenticated zero-knowledge vault access during AI inference.
5. **R5**: Verification compliance (`typecheck`, `lint`, `build`, user/workspace tenant scoping, Markdown sanitization).

---

## 2. Existing Database & Drizzle Architecture

### Schema Location & Configuration
- **Schema File**: `src/server/db/schema.ts`
- **Config File**: `drizzle.config.ts` (`dialect: "turso"`, sqlite database)
- **Migrations Directory**: `drizzle/` (currently migrations `0000_...sql` through `0007_good_morgan_stark.sql`, tracked in `drizzle/meta/_journal.json`)
- **DB Client**: `src/server/db/client.ts` (`@libsql/client` + `drizzle-orm/libsql`)

### Existing Tables Summary
| Table Name | Primary Keys | Tenant Scoping Foreign Keys | Key Attributes |
|---|---|---|---|
| `users` | `id` | N/A | `email`, `passwordHash`, `settings` (JSON text), `telegramChatId` |
| `workspaces` | `id` | `userId` (FK -> `users.id`) | `name`, `slug` |
| `notes` | `id` | `userId`, `workspaceId` | `parentId`, `title`, `slug`, `contentMd`, `type` (`note`, `project`, `daily`), `status`, `priority`, `dueDate`, `pinned`, `archived`, `deletedAt` |
| `documents` | `id` | `userId`, `workspaceId` | `attachmentId`, `parentId`, `title`, `fileType` (`pdf`, `text`, `markdown`), `mimeType`, `sizeBytes` |
| `attachments` | `id` | `userId` | `noteId`, `fileName`, `mimeType`, `sizeBytes`, `storagePath`, `checksum` |
| `vault_items` | `id` | `userId`, `workspaceId` | `title`, `category` (`password`, `key`, `token`, `secret_note`), `ciphertext` (`salt:cipher`), `iv` |
| `ai_events` | `id` | `userId` | `noteId`, `action`, `inputHash`, `outputMd`, `outputJson`, `provider`, `model` |
| `citations` | `id` | `userId`, `workspaceId` | `sourceType` (`note`, `document`), `sourceId`, `targetNoteId`, `targetAiEventId`, `quotedText` |

### Key Observations
- Currently, **no database tables exist for chat threads or chat messages**. `aiEvents` only records isolated audit events of AI text/JSON transforms.
- All workspace-scoped domain tables (`notes`, `documents`, `vault_items`, `citations`, etc.) store **both `userId` and `workspaceId`** with `onDelete: "cascade"`.

---

## 3. Authorization Scoping Analysis

### Boundary Rules
Per `AGENTS.md`:
> "Authenticate every server action and API route, then scope all reads and mutations to the current user and workspace. An ID alone is never authorization."

### Existing Server Auth Scoping Pattern
1. **User Authentication**: `getCurrentUser()` (`src/server/auth/index.ts`) verifies NextAuth session and returns `{ id, email, name }`. Returns `null` if unauthenticated.
2. **Workspace Resolution**: `getWorkspaceForUser(userId)` (`src/server/auth/users.ts`) or `getContext()` (`src/server/notes/service.ts`) fetches the active workspace record.
3. **Query Scoping**: Every database select, update, insert, or delete conditions on:
   ```ts
   and(
     eq(table.userId, user.id),
     eq(table.workspaceId, workspace.id)
   )
   ```
4. **Validation**: Server actions parse untrusted input with Zod schemas at the boundary.

---

## 4. Required Database Schema Additions for Chat History (R2 & R3)

To support persistent chat history (R2) and context reference persistence (R3), two new tables are required in `src/server/db/schema.ts`:

### 1. `chat_threads` Table
```ts
export const chatThreads = sqliteTable(
  "chat_threads",
  {
    id: idCol(), // e.g. ct_...
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Chat"),
    noteId: text("note_id").references(() => notes.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("chat_threads_user_ws_updated_idx").on(
      table.userId,
      table.workspaceId,
      table.updatedAt,
    ),
  ],
);
```

### 2. `chat_messages` Table
```ts
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: idCol(), // e.g. cm_...
    threadId: text("thread_id")
      .notNull()
      .references(() => chatThreads.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
    content: text("content").notNull(),
    isError: integer("is_error", { mode: "boolean" })
      .notNull()
      .default(false),
    // JSON-encoded array of context references attached to message
    // e.g. [{ id: "n_123", type: "note", title: "Project Spec" }]
    contextReferences: text("context_references"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("chat_messages_thread_created_idx").on(
      table.threadId,
      table.createdAt,
    ),
  ],
);
```

### Type Exports
```ts
export type ChatThread = typeof chatThreads.$inferSelect;
export type NewChatThread = typeof chatThreads.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
```

---

## 5. Service & Action Architecture for Persistent Chat & Context

### Chat Service (`src/server/ai/chat-service.ts`)
New server service providing:
1. `listChatThreads(noteId?: string)`: Returns user's chat threads sorted by `updatedAt DESC`.
2. `createChatThread(title?: string, noteId?: string)`: Creates a new chat thread for user/workspace.
3. `getChatThreadWithMessages(threadId: string)`: Retrieves thread and messages (ensuring `userId` and `workspaceId` ownership).
4. `deleteChatThread(threadId: string)`: Soft or hard deletes a chat thread and cascade deletes messages.
5. `addChatMessage(threadId: string, role: string, content: string, contextReferences?: ContextRef[])`: Appends message and updates thread `updatedAt`.
6. `searchMentionableContext(query: string)`: Returns autocompletion targets (`@notes`, `@projects`, `@files`, `@vault`) for the prompt input.

### Context Referencing (`@notes`, `@projects`, `@files`, `@vault`)
- `@notes`: Matches `notes` where `type = 'note' | 'daily'`.
- `@projects`: Matches `notes` where `type = 'project'`.
- `@files`: Matches `documents` and `attachments`.
- `@vault`: Matches `vault_items` (titles and categories only).

### Server Action Workflow for AI Chat Prompt
```ts
export async function sendChatMessageAction(args: {
  threadId?: string;
  noteId?: string;
  userPrompt: string;
  contextReferences?: Array<{
    id: string;
    type: "note" | "project" | "file" | "vault";
    title: string;
    decryptedVaultContent?: string; // Only present if vault item unlocked by user
  }>;
}): Promise<AiActionResult<{ threadId: string; assistantMessage: ChatMessage }>>
```

---

## 6. Password-Protected Vault Access Architecture (R4)

### WebCrypto Security Model (`src/lib/vault-crypto.ts`)
- Vault ciphertext is stored as `${salt}:${ciphertext}` (AES-GCM 256-bit derived via PBKDF2 100,000 iterations).
- Decryption happens **strictly client-side** using `decryptVaultSecret(ciphertextHex, ivHex, saltHex, masterPassword)`.

### Password Prompt Protocol
1. When `@vault` item is tagged in chat input or requested by prompt, the client UI checks if decrypted content is available for this request.
2. If not, a `VaultPasswordModal` dialog prompts the user for their Vault Master Password.
3. Upon submission:
   - `decryptVaultSecret` attempts decryption using PBKDF2 key derivation.
   - If incorrect: displays error toast ("Decryption failed. Incorrect master password?") and aborts prompt submission.
   - If correct: decrypted text is temporarily attached to the prompt payload for **that request only**.
4. Cleartext vault secret and master password are **never stored** in `localStorage`, React state across requests, or written to database `chat_messages` or `ai_events`. In `chat_messages.contextReferences`, only `{ id, type: "vault", title }` metadata is recorded.

---

## 7. Plan for Implementation & Handoff

| Component | Target Location | Description |
|---|---|---|
| Schema & Migration | `src/server/db/schema.ts`, `drizzle/0008_...sql` | Add `chat_threads` & `chat_messages` tables & types |
| Chat DB Service | `src/server/ai/chat-service.ts` | Scoped thread CRUD & message persistence |
| Context Search Service | `src/server/ai/context-search.ts` | `@mention` search for notes, projects, files, vault items |
| Server Actions | `src/server/ai/chat-actions.ts` | Updated chat actions with persistence & context resolution |
| Vault Modal UI | `src/components/vault/vault-password-modal.tsx` | Password prompt dialog for zero-knowledge vault decryption |
| Context Selector UI | `src/components/ai/context-mention-input.tsx` | `@mention` popover and tag renderer |
| AI Chat Sidebar UI | `src/components/ai/ai-chat-sidebar.tsx` | Bounded scroll container, thread history drawer/selector, context tags, auto-scroll |

---

## 8. Verification Strategy

1. **Schema & Migration**: Run `bun run db:generate` to produce clean Drizzle migration script, then `bun run db:migrate`.
2. **Type Safety**: Run `bun run typecheck` to confirm 0 TypeScript compiler errors.
3. **Linter Compliance**: Run `bun run lint` to confirm 0 ESLint errors.
4. **Production Build**: Run `bun run build` to confirm Next.js App Router build succeeds.
5. **Authorization Verification**: Exercise multi-user/multi-workspace boundary tests ensuring thread, message, note, and vault access returns empty/error for unauthenticated or cross-tenant requests.
