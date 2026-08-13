## 2026-08-13T09:18:03Z
You are an Explorer subagent for the Inkest project.
Your assigned working directory is `/home/amir/projects/personal/inkest/.agents/teamwork_preview_explorer_survey_vault`.

MANDATORY INSTRUCTIONS:
1. Read the original user request at `/home/amir/projects/personal/inkest/ORIGINAL_REQUEST.md`.
2. Also review `/home/amir/projects/personal/inkest/AGENTS.md` for project rules and conventions.
3. Investigate the codebase for Vault encryption, Password protection, Modal components, Context referencing (@notes, @projects, @files), and AI Server Action payload handling.
Specifically search in `src/server`, `src/components`, and `src/app` for:
- How vault contents and notes are stored, encrypted, and decrypted
- Existing vault password verification logic, encryption primitives, key management
- Modal UI components or dialog primitives for password prompts
- How context referencing (@notes, @projects, @files) will fetch text & metadata securely
- How vault password verification on every request (R4) should be integrated with AI server action payloads
4. Write your detailed analysis and findings to `/home/amir/projects/personal/inkest/.agents/teamwork_preview_explorer_survey_vault/analysis.md` and write a soft handoff to `/home/amir/projects/personal/inkest/.agents/teamwork_preview_explorer_survey_vault/handoff.md`.
5. Send a message to the orchestrator summarizing your findings and pointing to your handoff file. DO NOT modify any source code files.
