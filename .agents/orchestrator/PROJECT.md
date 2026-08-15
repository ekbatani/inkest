# Project Plan: Inkest AI Chat Sidebar Enhancements

## Architecture
- **Frontend Layer**: `src/components/ai/ai-chat-sidebar.tsx`, `src/components/notes/note-editor.tsx`, `src/components/vault/vault-password-modal.tsx`, UI primitives (`ScrollArea`, `Sheet`, `Dialog`, `Command`, `Popover`).
- **Backend Service Layer**: `src/server/ai/chat-service.ts`, `src/server/ai/chat-actions.ts`, `src/server/ai/runner.ts`.
- **Database Layer**: Drizzle ORM in `src/server/db/schema.ts` (`chat_threads`, `chat_messages` tables), Turso SQLite database migrations (`drizzle/`).
- **Crypto & Security**: WebCrypto AES-GCM + PBKDF2 (`src/lib/vault-crypto.ts`), tenant authorization scoping (`userId`, `workspaceId`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Message Scroll Container | Dedicated bounded scroll container for chat messages | M1 | R1 |
| F2 | Smooth Autoscroll | Autoscroll smoothly to latest message on generation | M1 | R1 |
| F3 | Scroll Controls & Shortcuts | Floating scroll-to-bottom button and keyboard scroll shortcuts | M1 | R1 |
| F4 | Responsive Mobile Sheet | Mobile drawer (`Sheet`) for AI sidebar on < 640px screens | M1 | R1 |
| F5 | Database Schema for Chat | `chat_threads` and `chat_messages` tables with tenant scoping | M2 | R2 |
| F6 | Drizzle Migrations | Generated & applied migration for chat tables | M2 | R2 |
| F7 | Thread CRUD Server Actions | Create thread, list threads, load thread messages, delete thread | M2 | R2 |
| F8 | Session Switching UI | Sidebar UI to view history, switch sessions, delete sessions | M2 | R2 |
| F9 | Context Search Action | Server action searching notes, projects, files, vault metadata | M3 | R3 |
| F10 | @Mentions Autocomplete UI | Inline `@` autocomplete popover/combobox for chat input | M3 | R3 |
| F11 | Context Tag Badges | Display selected context tags in chat input | M3 | R3 |
| F12 | AI Context Payload | Package metadata & content into AI server action prompt | M3 | R3 |
| F13 | Vault Password Modal | Modal dialog requesting Vault Master Password | M4 | R4 |
| F14 | Client Password Verification | WebCrypto AES-GCM decryption verification per request | M4 | R4 |
| F15 | Transient Vault Payload | Send decrypted vault content only for current prompt | M4 | R4 |
| F16 | Vault Error Handling | Toast error on invalid password & prevent vault access | M4 | R4 |
| F17 | TypeCheck Verification | Zero errors on `bun run typecheck` | M5 | R5 |
| F18 | Lint Verification | Zero errors on `bun run lint` | M5 | R5 |
| F19 | Build Verification | Successful completion of `bun run build` | M5 | R5 |
| F20 | Authorization Scoping | Strict `userId` and `workspaceId` tenant scoping verified | M5 | R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | AI Sidebar Scroll & Responsive Layout | Bounded scroll, autoscroll, scroll button, keyboard shortcuts, mobile Sheet | None | PLANNED |
| M2 | Persistent Chat History & DB Persistence | Drizzle schema (`chat_threads`, `chat_messages`), migrations, CRUD actions, session UI | None | PLANNED |
| M3 | Context Referencing (@notes, @projects, @files) | Context search action, `@` mentions popover, tag badges, AI payload | M2 | PLANNED |
| M4 | Password-Protected Vault Access Modal | `VaultPasswordModal`, WebCrypto client decryption, single-prompt payload, toast errors | M3 | PLANNED |
| M5 | E2E Testing, Verification & Integration | Run test suite, verify typecheck/lint/build, tenant scoping, forensic audit | M1, M2, M3, M4 | PLANNED |

## Code Layout
- `src/server/db/schema.ts` — Drizzle table definitions (`chatThreads`, `chatMessages`)
- `drizzle/` — Drizzle SQL migration files
- `src/server/ai/chat-service.ts` — Server service for chat threads, messages, and context search
- `src/server/ai/chat-actions.ts` — Server actions for chat UI interactions
- `src/components/ai/ai-chat-sidebar.tsx` — Main AI Chat Sidebar component
- `src/components/ai/chat-history-drawer.tsx` — History listing and session switcher
- `src/components/ai/context-mention-input.tsx` — Textarea with `@mentions` autocomplete popover and context badges
- `src/components/vault/vault-password-modal.tsx` — Password prompt dialog for zero-knowledge vault item decryption
- `src/components/notes/note-editor.tsx` — Responsive mounting for AI Chat Sidebar (desktop panel + mobile Sheet)

## Interface Contracts
### `src/server/ai/chat-actions.ts`
```typescript
export async function createChatThreadAction(title?: string): Promise<{ success: boolean; threadId?: string; error?: string }>;
export async function listChatThreadsAction(): Promise<{ success: boolean; threads?: ChatThread[]; error?: string }>;
export async function getChatThreadMessagesAction(threadId: string): Promise<{ success: boolean; messages?: ChatMessage[]; error?: string }>;
export async function deleteChatThreadAction(threadId: string): Promise<{ success: boolean; error?: string }>;
export async function searchContextItemsAction(query: string): Promise<{ success: boolean; items?: ContextItem[]; error?: string }>;
```

### `ContextItem` & Payload Contract
```typescript
export interface ContextItem {
  id: string;
  type: "note" | "project" | "file" | "vault";
  title: string;
  category?: string; // for vault items
  contentMd?: string; // for notes/projects/files
  ciphertext?: string; // for vault items
  iv?: string;
  salt?: string;
}

export interface PromptPayload {
  threadId?: string;
  prompt: string;
  contextItems: {
    id: string;
    type: "note" | "project" | "file" | "vault";
    title: string;
    decryptedVaultContent?: string;
  }[];
}
```
