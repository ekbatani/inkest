# Original User Request

## Initial Request — 2026-08-13T12:45:22Z

Enhance the Inkest AI Chat Sidebar with smooth scroll container functionality, persistent chat session history, context referencing for user notes, projects, and files via mention tags, and password-authenticated permissioned access to encrypted vault content on every request.

Working directory: /home/amir/projects/personal/inkest
Integrity mode: development

## Requirements

### R1. AI Sidebar Scroll & Layout
The AI chat sidebar must have a dedicated scroll container for chat messages with smooth autoscroll to the latest message, keyboard-accessible scroll controls, and layout preservation across responsive screen sizes.

### R2. Persistent Chat History
The AI sidebar must allow users to view previous chat threads/history, create new chat threads, switch between saved sessions, and clear/delete history. Chat history must persist across page refreshes and application restarts.

### R3. Context Referencing (@notes, @projects, @files)
The AI sidebar input must support selecting and referencing user notes, projects, and workspace files (e.g. via @mention autocompletion or selector tags). Referenced content metadata and text must be passed securely to the server action during AI inference.

### R4. Password-Protected Vault Access
When a prompt or referenced context includes vault content or requests vault access, the application must prompt the user for their vault password via a secure modal popup. Access to vault data must require explicit password verification on every access attempt without exposing cleartext credentials or persisting unencrypted vault data to client state.

### R5. Verification & Code Standards
All changes must maintain existing server authorization scoping (per user and workspace), preserve Markdown rendering, pass TypeScript type checking (`bun run typecheck`), pass ESLint validation (`bun run lint`), and pass Next.js production build (`bun run build`).

## Acceptance Criteria

### Scroll & History
- [ ] Chat messages in the AI sidebar scroll inside a bounded scroll container with smooth autoscroll on message generation.
- [ ] Users can start a new chat, view a list of historical chat sessions, switch to past sessions, and delete chat history.
- [ ] Chat history is persisted in the database/storage layer per user and workspace.

### Context Referencing
- [ ] Typing @ or clicking a context button triggers autocomplete or selection for user notes, projects, and files.
- [ ] Selected context tags are displayed in the chat input and included in the AI prompt payload sent to the backend.

### Vault Permission & Password Prompt
- [ ] Attempting to query or reference vault contents triggers a password prompt modal.
- [ ] Validating the vault password allows vault content to be decrypted and referenced for that prompt only.
- [ ] Providing an incorrect password displays an error toast/message and prevents vault access.

### Quality & Verification
- [ ] `bun run typecheck` completes with 0 errors.
- [ ] `bun run lint` completes with 0 errors.
- [ ] `bun run build` completes successfully.
