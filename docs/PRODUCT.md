# Product

## Purpose

Inkest is a calm, private, Markdown-first workspace for individual thinking.
It combines notes, lightweight projects and tasks, diagrams, attachments, and
explicit AI assistance without turning into a general-purpose team workspace.

The product is English-first, with per-note LTR, RTL, and automatic direction.
It is designed to be self-hosted, portable, and pleasant to use every day.

## Product principles

1. **Markdown is the source of truth.** Notes remain readable and exportable;
   Inkest does not use a block-editor data model.
2. **Private by default.** Data stays in the selected deployment and AI only
   receives content after a user explicitly starts an action.
3. **Focused over broad.** Project management is note-centered and lightweight;
   real-time collaboration, a plugin platform, and a Jira-like workflow are
   outside the product's current scope.
4. **Polish is functional.** Writing, reading, navigation, empty states,
   accessibility, and reduced-motion support are core product work.
5. **Self-hosting must stay viable.** No essential feature may require a paid
   hosted service.

## Current product

### Writing and knowledge

- Markdown editor and safe GitHub-flavored preview, including Mermaid diagrams.
- Notes, folders, tags, search, pinned/archive states, daily notes, wiki links,
  backlinks, version history, and Markdown/workspace export.
- Private images and document attachments, plus browser speech-to-text and
  text-to-speech.
- One Markdown writing surface with inline formatting cues, plus an explicit
  focus reader with spotlight controls and text-to-speech that returns to the
  editor caret on exit.

### Projects and planning

- Project notes with status, priority, due dates, and a linked task list.
- Per-project sharing: the owner adds other accounts by email as read-only
  viewers or editors. Sharing covers the project's whole subtree, including
  attached files; members see the project in their own Projects list.
- Markdown-checkbox synchronization, manual tasks, a kanban view for task
  notes, and a lightweight per-project checklist. Checking a box always
  completes a task; workflow statuses set in the planner (`doing`, `canceled`)
  are preserved when a box is unchecked.
- Dashboard views for recent notes, projects, and upcoming tasks.
- Planner buckets for overdue, today, upcoming, and unplanned tasks, with an
  actionable weekly review and an optional AI recap of the week.
- Opt-in morning briefing notification (in-app and Telegram) summarizing
  overdue tasks, today's tasks, and project deadlines; AI-polished when a
  provider is configured, plain digest otherwise.
- Calendar page and optional Google Calendar connection.

### AI and notifications

- User-invoked actions: summarize, improve writing, extract tasks, create a
  project plan, generate Mermaid, explain a selection, and translate a
  selection. Extracted tasks are reviewed in a dialog and can be saved into
  any project (or a new project/subproject) with chosen priorities and dates.
- Chat assistant grounded in workspace retrieval; on project pages it also
  receives the project's live checklist, task board, and subproject state.
- Configurable OpenAI-compatible providers, including OpenAI, OpenRouter,
  opencode, NVIDIA Build, Ollama, and a custom endpoint.
- In-product setup help and optional Telegram linking/notifications.

## Audience and commercial direction

Inkest is primarily for technical knowledge workers, independent makers,
writers, and self-hosters who value Markdown, ownership, and a focused web
experience. The intended model is free self-hosting with a future paid cloud
offering for convenience features such as managed hosting, backup, sync,
storage, and AI usage. Team workspaces, billing, and real-time co-editing are not current scope;
project sharing stays deliberate and owner-managed.

## Roadmap

These are candidates, not promises. Keep the list small and validate value
before adding a dependency or a new service.

1. Finish the performance pass: reduce editor-route JavaScript, improve hot
   database queries, and set appropriate attachment caching.
2. Improve the large-Markdown paste flow: detect a substantial Markdown paste,
   offer immediate preview, and preserve an easy return to editing.
3. Make AI setup and usage more direct: command-palette entry points and
   encrypted storage for user-supplied provider credentials.
4. Prepare a public release: choose a license, add contribution guidance and
   issue templates, document a demo path, and keep the landing page current.
5. Reconsider only after the above: PWA install support, wiki-link completion,
   folder import, hosted sync/backup, semantic search, or team workspaces.
