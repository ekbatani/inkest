# Comprehensive UI & Architectural Survey for Inkest AI Chat Sidebar

## Executive Summary
This report presents a thorough investigation of the existing AI Chat Sidebar, scroll containers, responsive layout, chat input handling, context referencing (@mentions), vault password verification, and component structure within the Inkest codebase (`/home/amir/projects/personal/inkest`).

---

## 1. AI Chat Sidebar Component & Layout Architecture

### Current Implementation
- **Primary Component**: `AiChatSidebar` (`src/components/ai/ai-chat-sidebar.tsx`).
- **Secondary Component**: `AiPanel` (`src/components/ai/ai-panel.tsx`), which provides drop-down action menus and modal-based single-turn transforms (e.g. Summarize, Extract Tasks, Translate).
- **Layout Integration**: Mounted inside `NoteEditor` (`src/components/notes/note-editor.tsx`, lines 910–926).
  ```tsx
  <aside
    id="note-context-panel"
    aria-label="AI Assistant"
    aria-hidden={!showPanel}
    className="absolute inset-y-0 right-0 z-10 hidden overflow-hidden border-l bg-background shadow-xl transition-[width,box-shadow] duration-200 motion-reduce:transition-none sm:block"
    style={{ width: showPanel ? 340 : 0 }}
  >
    <div className="h-full w-[340px]">
      <AiChatSidebar
        noteId={note.id}
        noteTitle={title}
        noteContent={content}
        editorRef={editorRef}
        onClose={toggleContextPanel}
      />
    </div>
  </aside>
  ```
- **State & Activation**: `showPanel` state in `note-editor.tsx` toggled via toolbar action button or global custom event `inkest:ask-ai` (`window.addEventListener("inkest:ask-ai", onAskAi)`).

### Layout & Responsive Flaws Identified
1. **Mobile Unavailability**: The sidebar element in `note-editor.tsx` has Tailwind class `hidden sm:block`. On viewports smaller than `sm` (< 640px), the AI assistant panel is completely hidden and inaccessible to users.
2. **Overlay vs Push Layout**: The sidebar is styled with `absolute inset-y-0 right-0 z-10`. On narrow desktop screens, opening the sidebar overlays and obscures the right margin of the note editor rather than reflowing layout smoothly.

---

## 2. Scroll Containers & Message Rendering

### Current Implementation (`ai-chat-sidebar.tsx`)
- **Scroll Container**: Uses `@base-ui/react/scroll-area` primitive via `ScrollArea` (`src/components/ui/scroll-area.tsx`).
- **Message List Structure**:
  - Rendered inside `<ScrollArea className="flex-1 px-4 py-3">`.
  - Empty state renders a friendly prompt with Quick Actions grid (`PRESET_PROMPTS`: Summarize, Improve writing, Extract tasks, Generate diagram, Translate, Explain).
  - Non-empty state maps over `messages: ChatMessage[]`.
  - User messages: Right-aligned pill bubbles with `bg-primary text-primary-foreground`.
  - Assistant messages: Render dynamic Markdown via `MarkdownPreview` (`src/components/markdown/markdown-preview.tsx`).
  - Action toolbar under assistant responses: `Insert at cursor`, `Replace selection`, `Replace entire note`, `Copy`.
- **Autoscroll Mechanism**:
  ```tsx
  const scrollBottomRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);
  ```

### R1 Requirements vs Gaps
- **Autoscroll**: Functioning basic smooth scroll via `scrollIntoView` on new message additions.
- **Scroll Controls & Keyboard Accessibility**: Lacks explicit scroll control UI (such as a floating "Scroll to bottom" button when user scrolls up) and keyboard shortcuts for quick scroll navigation (Page Up/Down, Home/End focus traps).

---

## 3. Chat Input & Keyboard Event Handling

### Current Implementation (`ai-chat-sidebar.tsx`)
- **Input Component**: `Textarea` (`src/components/ui/textarea.tsx`) wrapped in a container with focus ring styling.
- **Key Event Handler**:
  ```tsx
  onKeyDown={(e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendPrompt();
    }
  }}
  ```
- **Context Indicators**: Shows whether current prompt applies to selected text (`getSelectedEditorText(editorRef)`) or current full note (`noteTitle`).
- **Send Controls**: Button displaying `Send` icon or `Loader2` spinner when `isGenerating` is true. Disabled when `!input.trim() || isGenerating`.

---

## 4. Context Referencing (@mentions & Autocomplete UI)

### Current State
- `AiChatSidebar` currently **only** references the open note (`noteId`, `noteTitle`, `noteContent`) and any highlighted editor selection (`selectedText`).
- There is **no UI or logic** for mentioning or referencing arbitrary user notes, projects, workspace files/documents, or vault items using `@note`, `@project`, `@file`, `@vault` tag selectors.

### Infrastructure & Primitive Reusability for `@mentions`
1. **Command & Search Primitives**:
   - `src/components/ui/command.tsx` (`cmdk` wrapper) is already implemented and used in `CommandMenu` (`src/components/app-shell/command-menu.tsx`).
   - `src/components/ui/popover.tsx` provides accessible popover positioning relative to input caret/textarea.
2. **Backend Search & Listing Services**:
   - Notes & Projects: `searchNotesAction(query)` in `src/server/notes/actions.ts` searches notes by title/content. Note type `note` vs `project` is stored in `notes.type`.
   - Workspace Documents/Files: `documents` table in `src/server/db/schema.ts` stores PDF/text/markdown attachments.
   - Vault Items: `listVaultItems` in `src/server/vault/vault-service.ts` lists user vault titles and encrypted metadata.

---

## 5. Session History & Persistence (R2 Requirements)

### Current State
- `AiChatSidebar` holds messages strictly in client-side React component state (`const [messages, setMessages] = React.useState<ChatMessage[]>([])`).
- Page refresh, navigation, or note switching completely resets conversation history.

### Database Schema Gaps (`src/server/db/schema.ts`)
- The database schema currently contains `ai_events` (for single audit logs), but **has no tables** for chat sessions/threads (`ai_chat_threads`) or chat messages (`ai_chat_messages`).
- New Drizzle tables are required:
  - `ai_chat_threads`: `id`, `userId`, `workspaceId`, `noteId` (optional), `title`, `createdAt`, `updatedAt`.
  - `ai_chat_messages`: `id`, `threadId`, `role`, `content`, `contextMetadataJson`, `createdAt`.

---

## 6. Password-Protected Vault Access (R4 Requirements)

### Current Security Architecture
- `src/lib/vault-crypto.ts`: Uses WebCrypto `PBKDF2` to derive AES-GCM key from master password and 16-byte salt, then decrypts ciphertext (`decryptVaultSecret`).
- Vault items stored in `vault_items` table with `ciphertext`, `iv`.

### Gaps vs R4 Requirements
- No password prompt modal exists in `AiChatSidebar`.
- When an `@vault` mention is selected or vault context is queried, a password verification dialog (`Dialog` from `src/components/ui/dialog.tsx`) must prompt the user for their master password.
- Decrypted vault text must be passed into the server action payload **strictly for the execution of that single prompt** without persisting plain text or master password to persistent client state or database logs.

---

## Component & Service Mapping Summary

| Requirement Area | Existing File(s) | Current State | Technical Gap / Proposed Change |
|---|---|---|---|
| **R1. Scroll & Layout** | `src/components/ai/ai-chat-sidebar.tsx`<br>`src/components/notes/note-editor.tsx`<br>`src/components/ui/sheet.tsx` | Hidden on mobile (`sm:block`), bounded `ScrollArea` autoscrolls via ref. | Add mobile `Sheet` drawer fallback; add manual scroll-to-bottom button & keyboard shortcuts. |
| **R2. Persistent History** | `src/components/ai/ai-chat-sidebar.tsx`<br>`src/server/db/schema.ts` | In-memory `useState` array only. | Add Drizzle schema for `ai_chat_threads` and `ai_chat_messages`, migration, and CRUD server actions. |
| **R3. Context Referencing** | `src/components/ai/ai-chat-sidebar.tsx`<br>`src/components/ui/command.tsx`<br>`src/server/notes/actions.ts` | Open note & selection only. | Implement `@mentions` popover autocomplete for `@notes`, `@projects`, `@files`, `@vault` in textarea. |
| **R4. Vault Access** | `src/lib/vault-crypto.ts`<br>`src/components/vault/vault-view.tsx` | Vault view exists, but AI sidebar has zero vault integration. | Add password verification modal, client-side decryption on demand, and pass decrypted context per-request only. |
