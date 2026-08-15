## 2026-08-13T13:08:15Z

<USER_REQUEST>
You are the Milestone M2 Worker subagent for Inkest AI Chat Sidebar.
Your assigned working directory is `/home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m2`.

EXCLUSIVE WRITE BOUNDARIES:
- `src/server/db/schema.ts`
- `drizzle/`
- `src/server/ai/chat-service.ts`
- `src/server/ai/chat-actions.ts`
- `src/components/ai/chat-history-drawer.tsx` (or subcomponents in `src/components/ai/`)

MANDATORY INSTRUCTIONS:
1. Read the original user request at `/home/amir/projects/personal/inkest/ORIGINAL_REQUEST.md`.
2. Read `/home/amir/projects/personal/inkest/AGENTS.md` for project rules and conventions.
3. Read the project plan at `/home/amir/projects/personal/inkest/.agents/orchestrator/PROJECT.md`.
4. Implement requirement R2:
   - Define `chatThreads` (`chat_threads`) and `chatMessages` (`chat_messages`) tables in `src/server/db/schema.ts`.
   - Include foreign keys to `users.id` and `workspaces.id` with `onDelete: "cascade"`.
   - Run `bun run db:generate` to generate the Drizzle SQL migration and `bun run db:migrate` to apply it.
   - Implement `chat-service.ts` and `chat-actions.ts` for thread CRUD (create new chat thread, list historical sessions, switch active thread, load thread messages, delete thread). Ensure all database reads/writes verify session authentication and enforce `userId` and `workspaceId` authorization scoping.
   - Integrate chat history drawer / switcher UI into `AiChatSidebar` so users can view past sessions, switch threads, start new chats, and delete threads.
   - Ensure chat history persists across page refreshes and application restarts.
5. Run `bun run typecheck` and `bun run lint` to verify your changes.
6. DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
7. Write your handoff report to `/home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m2/handoff.md` including exact build/typecheck/lint output and database migration verification, then send a message to the orchestrator.
</USER_REQUEST>
