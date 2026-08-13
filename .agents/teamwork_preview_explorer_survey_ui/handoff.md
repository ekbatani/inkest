# Soft Handoff Report: Inkest AI Chat Sidebar UI Investigation

## 1. Observation
- **AI Chat Sidebar Component**: Located at `/home/amir/projects/personal/inkest/src/components/ai/ai-chat-sidebar.tsx` (lines 105–530). Mounted inside `NoteEditor` at `/home/amir/projects/personal/inkest/src/components/notes/note-editor.tsx` (lines 910–926).
- **Responsive Layout**: `<aside id="note-context-panel">` in `note-editor.tsx` line 914 uses `hidden sm:block`, causing the AI sidebar to be completely hidden on mobile screens (< 640px).
- **Message List & Scrolling**: Message list in `ai-chat-sidebar.tsx` line 352 uses `<ScrollArea className="flex-1 px-4 py-3">` from `src/components/ui/scroll-area.tsx`. Autoscroll is handled via `scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" })` in line 128. No manual scroll-to-bottom button or scroll keyboard focus shortcuts are implemented.
- **Input & Keyboard Controls**: Uses `Textarea` (`src/components/ui/textarea.tsx`) with `onKeyDown` handling `Enter` (send) vs `Shift+Enter` (newline).
- **Context Referencing (@mentions)**: `AiChatSidebar` only accepts props `noteId`, `noteTitle`, `noteContent`, and `selectedText` (`getSelectedEditorText(editorRef)`). It currently lacks any `@notes`, `@projects`, `@files`, `@vault` autocomplete or selector tag UI.
- **Chat Persistence & History**: Chat state is managed strictly via `React.useState<ChatMessage[]>([])` in `ai-chat-sidebar.tsx` line 112. Database schema at `/home/amir/projects/personal/inkest/src/server/db/schema.ts` lacks `ai_chat_threads` and `ai_chat_messages` tables.
- **Vault Security & Password Prompt**: Zero-knowledge encryption functions (`encryptVaultSecret`, `decryptVaultSecret`) reside in `src/lib/vault-crypto.ts`. Vault items are stored in `vault_items` table. `AiChatSidebar` currently has no password prompt modal or decrypted vault context passing.

## 2. Logic Chain
- **Step 1 (Responsive & Mobile Layout)**: Since line 914 of `note-editor.tsx` specifies `hidden sm:block`, users on mobile devices cannot access the AI Chat Sidebar. Incorporating `Sheet` (`src/components/ui/sheet.tsx`) for mobile screens will ensure layout preservation and full feature parity across viewports.
- **Step 2 (Scroll Controls)**: While `scrollIntoView` handles initial autoscroll, user scrolling up obscures new incoming assistant messages. Adding a floating scroll-to-bottom indicator and keyboard scroll listeners fulfills requirement R1.
- **Step 3 (Context Referencing)**: Requirements R3 specifies selecting notes, projects, files, and vault items via `@mentions`. `Command` primitives (`src/components/ui/command.tsx`) and `Popover` (`src/components/ui/popover.tsx`) can be combined with `searchNotesAction` (`src/server/notes/actions.ts`) to present inline autocomplete menus when `@` is typed in the textarea.
- **Step 4 (Persistent History)**: Because messages exist only in client state, page refresh or thread switching erases user history. Defining Drizzle schema tables (`ai_chat_threads`, `ai_chat_messages`) in `src/server/db/schema.ts` and associated server actions will allow persisting, switching, and deleting chat threads per workspace/user.
- **Step 5 (Vault Access Modal)**: Requirement R4 demands explicit password verification before referencing vault content. When an `@vault` item is selected or queried, a password `Dialog` (`src/components/ui/dialog.tsx`) must collect the user's master password, execute client-side AES-GCM decryption via `decryptVaultSecret`, and send the decrypted secret strictly with that single request payload.

## 3. Caveats
- No code modifications were performed during this investigation (read-only mode strictly respected).
- The existing CodeMirror editor state in `note-editor.tsx` provides cursor selection text, but multi-file workspace search relies on server-side queries (`searchNotesAction`).

## 4. Conclusion
The existing `AiChatSidebar` component provides a solid foundation for message rendering, preset actions, and Markdown insertion into the editor. However, meeting requirements R1–R4 requires:
1. Enhancing `AiChatSidebar` with responsive drawer support (`Sheet`), scroll-to-bottom button, and keyboard shortcuts.
2. Adding `@mentions` autocomplete UI (`@notes`, `@projects`, `@files`, `@vault`) attached to the chat textarea.
3. Adding a password prompt modal for zero-knowledge vault item decryption on demand.
4. Implementing database persistence (`ai_chat_threads`, `ai_chat_messages`) and session switching UI.

## 5. Verification Method
- **Typecheck**: `bun run typecheck`
- **Lint**: `bun run lint`
- **Build**: `bun run build`
- **Files to Inspect**:
  - `src/components/ai/ai-chat-sidebar.tsx`
  - `src/components/notes/note-editor.tsx`
  - `src/server/db/schema.ts`
  - `.agents/teamwork_preview_explorer_survey_ui/analysis.md`

## 6. Remaining Work (Next Implementation Steps)
- Implement `@mentions` popover autocomplete component for `AiChatSidebar`.
- Add mobile `Sheet` support in `note-editor.tsx` for `< sm` screens.
- Build Vault Password Prompt Modal for per-request vault decryption.
- Implement database tables for chat threads and messages with CRUD server actions.
