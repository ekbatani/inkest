## 2026-08-13T13:40:14Z
You are the Milestone M1 Worker subagent remediating M1 scroll controls integration.
Your assigned working directory is `/home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m1_remediation`.

EXCLUSIVE WRITE BOUNDARIES:
- `src/components/ai/ai-chat-sidebar.tsx`
- `src/components/ai/scroll-controls.tsx`

MANDATORY INSTRUCTIONS:
1. Review Reviewer report: `scroll-controls.tsx` was unimported and unrendered in `ai-chat-sidebar.tsx`.
2. Modify `src/components/ai/ai-chat-sidebar.tsx`:
   - Import `useChatScroll` and `ScrollToBottomButton` from `./scroll-controls`.
   - Wire `useChatScroll` to `<ScrollArea>` viewport/container, passing `messages` and `isGenerating`.
   - Render `<ScrollToBottomButton>` overlaid inside `ai-chat-sidebar.tsx`.
   - Attach keyboard shortcut handlers to container and input `Textarea` (`Ctrl/Cmd+Down`, `Ctrl/Cmd+Up`, `PageDown`, `PageUp`).
3. Run `bun run typecheck` and `bun run lint` to verify 0 errors.
4. DO NOT CHEAT. All implementations must be genuine.
5. Write your handoff report to `/home/amir/projects/personal/inkest/.agents/teamwork_preview_worker_m1_remediation/handoff.md` and send a message to the orchestrator.
