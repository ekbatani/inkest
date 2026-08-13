# Handoff Report — Inkest Database Schema & Authorization Survey

## 1. Observation

- **Database Schema**: `src/server/db/schema.ts` currently defines `users`, `workspaces`, `notes`, `tags`, `note_tags`, `tasks`, `notifications`, `attachments`, `note_versions`, `ai_events`, `google_calendar_connections`, `google_calendar_events`, `documents`, `annotations`, `citations`, `saved_views`, `journal_entries`, `vault_items`, and `audit_logs`. There are **no existing tables for chat threads or chat messages**.
- **Drizzle Setup**: Configured in `drizzle.config.ts` (`dialect: "turso"`, sqlite database at `./data/local.db`). Existing migrations in `drizzle/` span `0000_late_post.sql` to `0007_good_morgan_stark.sql` tracked in `drizzle/meta/_journal.json`.
- **Existing AI Infrastructure**: `src/server/ai/runner.ts`, `src/server/ai/chat-actions.ts`, and `src/app/api/ai/route.ts`. `runAiChatPromptAction` accepts an in-memory `history?: { role: "user" | "assistant"; content: string }[]` array from client React state without database persistence.
- **Authorization Scoping**: All database operations in `src/server/` verify `getCurrentUser()` (`src/server/auth/index.ts`) and filter queries with `and(eq(table.userId, user.id), eq(table.workspaceId, workspace.id))`.
- **Vault Security**: `src/lib/vault-crypto.ts` performs WebCrypto client-side PBKDF2 (100k iterations) + AES-GCM 256-bit encryption/decryption. The database `vault_items` table stores `${salt}:${ciphertext}` and `iv`.

## 2. Logic Chain

1. **R2 Requirement (Persistent Chat History)**: Because `ai_events` only stores individual execution logs without thread/session groupings, persistent chat history across page reloads and restarts requires dedicated `chat_threads` and `chat_messages` tables scoped by `user_id` and `workspace_id`.
2. **R3 Requirement (Context Referencing)**: Users need to mention `@notes`, `@projects`, and `@files`. Notes (`type: "note"` or `"daily"`), Projects (`type: "project"` in `notes`), and Files (`documents` / `attachments`) are all available in Drizzle schema and can be searched via a unified context search action.
3. **R4 Requirement (Vault Access)**: Vault content is encrypted with zero-knowledge AES-GCM. Unlocking vault content requires explicit client-side master password verification. Passing vault context to AI inference requires client-side decryption per prompt invocation without persisting decrypted secrets to database or client state.
4. **R5 Compliance**: All new Drizzle tables (`chat_threads`, `chat_messages`) must follow existing `schema.ts` conventions (`idCol()`, `timestamp()`, foreign keys to `users.id` and `workspaces.id` with `onDelete: "cascade"`) to enforce tenant scoping.

## 3. Caveats

- `drizzle-kit` CLI execution via `bun run db:generate` and `bun run db:migrate` must be executed to update the database schema and migration files.
- Cleartext vault data must never be saved into `chat_messages.context_references` or `ai_events.output_md` in cleartext if logged.
- Grounding in `retrieval-service.ts` uses lexical `LIKE` searches; context mention autocompletion should also use normalized title/slug matching.

## 4. Conclusion

The database schema, authorization framework, and AI runner in Inkest provide a solid foundation for persistent chat sidebar enhancements. By introducing `chat_threads` and `chat_messages` tables, implementing a user/workspace-scoped chat service, adding `@mention` context search, and integrating client-side vault password modal verification, all requirements (R1–R5) can be satisfied with zero violations of existing boundaries.

## 5. Verification Method

To verify the implementation once built:
1. **Database Schema & Migration**: Run `bun run db:generate` followed by `bun run db:migrate`. Check `drizzle/` for `0008_*.sql`.
2. **TypeScript & Linting**: Run `bun run typecheck` and `bun run lint`. Ensure 0 errors.
3. **Production Build**: Run `bun run build`.
4. **Scoping**: Test that a user cannot query another user's or workspace's chat threads or messages.

## 6. Remaining Work

1. Update `src/server/db/schema.ts` with `chatThreads` and `chatMessages` table definitions and types.
2. Generate and apply Drizzle migration (`bun run db:generate` & `bun run db:migrate`).
3. Create `src/server/ai/chat-service.ts` for thread CRUD, message persistence, and context autocompletion.
4. Update `src/server/ai/chat-actions.ts` and `src/components/ai/ai-chat-sidebar.tsx` for scroll container, history selector, context mentions, and password-protected vault modal.
