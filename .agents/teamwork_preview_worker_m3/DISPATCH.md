## 2026-08-13T14:45:23Z
Task Scope — Milestone M3 (R3):
1. **F9 - Context Search Action**:
   - Implement `searchContextItemsAction(query: string)` in `src/server/ai/chat-service.ts` and `src/server/ai/chat-actions.ts`.
   - Search notes (by title/content), projects (by name), files, and vault items (by title/category metadata only — NEVER vault content!).
   - Scope queries strictly to current user and workspace via `getAuthContext()`.
   - Return array of `ContextItem`: `{ id, type: "note"|"project"|"file"|"vault", title, category?, contentMd?, ciphertext?, iv?, salt? }`.
2. **F10 - @Mentions Autocomplete UI**:
   - Create or update `src/components/ai/context-mention-input.tsx` (and integrate with `src/components/ai/ai-chat-sidebar.tsx`).
   - Typing `@` in the chat input opens an inline popover/combobox search menu listing matching notes, projects, files, and vault items.
   - Keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) to select an item.
3. **F11 - Context Tag Badges**:
   - Selected context items display as pill badges (e.g. `[Note: Meeting Notes x]`, `[Vault: API Keys x]`) above or inside the prompt input.
   - Clicking `x` or pressing `Backspace` removes the badge.
4. **F12 - AI Context Payload**:
   - When prompt is submitted (`runAiChatPromptAction`), include selected context items in payload.
   - Non-vault items send `contentMd` as part of system/user prompt context in `chat-service.ts` / `runner.ts`.
   - Vault items pass metadata; client decryption will be wired in M4.

Write Boundaries:
- `src/components/ai/context-mention-input.tsx`
- `src/components/ai/ai-chat-sidebar.tsx`
- `src/server/ai/chat-service.ts`
- `src/server/ai/chat-actions.ts`
- `src/server/ai/runner.ts`

Verification & Quality:
- Run `bun run typecheck` to verify 0 errors.
- Run `bun run lint` to verify 0 errors.
- Run `bun test tests/e2e/ai-chat-sidebar.test.ts` to ensure no regressions.
