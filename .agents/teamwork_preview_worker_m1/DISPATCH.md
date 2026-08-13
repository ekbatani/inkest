## 2026-08-13T13:08:15Z

You are the Milestone M1 Worker subagent for Inkest AI Chat Sidebar.
Your assigned working directory is `/home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m1`.

EXCLUSIVE WRITE BOUNDARIES:
- `src/components/ai/ai-chat-sidebar.tsx`
- `src/components/ai/scroll-controls.tsx` (or new helper components in `src/components/ai/`)
- `src/components/notes/note-editor.tsx`

MANDATORY INSTRUCTIONS:
1. Read the original user request at `/home/amir/projects/personal/inkest/ORIGINAL_REQUEST.md`.
2. Read `/home/amir/projects/personal/inkest/AGENTS.md` for project rules and conventions.
3. Read the project plan at `/home/amir/projects/personal/inkest/.agents/orchestrator/PROJECT.md`.
4. Implement requirement R1:
   - Bounded scroll container for chat messages using `@base-ui/react/scroll-area`.
   - Smooth autoscroll to the latest message as assistant responses stream/render.
   - Floating scroll-to-bottom button when scrolled away from bottom.
   - Keyboard scroll shortcuts (`Ctrl+Down` / `PageDown` focus scroll handling).
   - Responsive layout preservation: update `src/components/notes/note-editor.tsx` to support a mobile `Sheet` drawer (`src/components/ui/sheet.tsx`) for screens < 640px so mobile users can open and use the AI Chat Sidebar seamlessly.
5. Run `bun run typecheck` and `bun run lint` to verify your changes.
6. DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
7. Write your handoff report to `/home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m1/handoff.md` including exact build/typecheck/lint output and send a message to the orchestrator.
