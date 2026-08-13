# BRIEFING — 2026-08-13T14:46:00Z

## Mission
Implement Milestone M3 (R3): Context Referencing (@notes, @projects, @files, @vault) for Inkest AI Chat Sidebar.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m3
- Original parent: aff77eca-2ac1-4c2f-992f-167af1d7a190
- Milestone: M3

## 🔒 Key Constraints
- Write boundaries:
  - src/components/ai/context-mention-input.tsx
  - src/components/ai/ai-chat-sidebar.tsx
  - src/server/ai/chat-service.ts
  - src/server/ai/chat-actions.ts
  - src/server/ai/runner.ts
- Vault items: search by title/category metadata ONLY. NEVER search or return vault secret content/ciphertext/decrypted contents.
- Strict auth scoping: scope queries to current user and workspace via getAuthContext().
- Verification: typecheck 0 errors, lint 0 errors, tests pass.

## Current Parent
- Conversation ID: aff77eca-2ac1-4c2f-992f-167af1d7a190
- Updated: 2026-08-13T14:46:00Z

## Task Summary
- **What to build**:
  1. F9 - Context Search Action (`searchContextItemsAction`)
  2. F10 - @Mentions Autocomplete UI (`ContextMentionInput`)
  3. F11 - Context Tag Badges (Pill badges with x / backspace removal)
  4. F12 - AI Context Payload (Pass context items in `runAiChatPromptAction` and include non-vault `contentMd` in prompt context in `runner.ts` / `chat-service.ts`)
- **Success criteria**:
  - Typecheck, lint, and e2e test suite pass.
  - @mentions UI allows picking notes, projects, files, vault metadata.
  - Selected context pills attached to prompt payload.
- **Interface contracts**: PROJECT.md & ORIGINAL_REQUEST.md

## Change Tracker
- **Files modified**: none yet
- **Build status**: unknown
- **Pending issues**: none

## Quality Status
- **Build/test result**: unknown
- **Lint status**: unknown
- **Tests added/modified**: TBD

## Loaded Skills
- None
