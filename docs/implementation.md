
Use this as the master prompt for your coding agent.

You are implementing a minimal, beautiful, English-first personal notes and lightweight project-management application called inkest.

Product goal:
Build a private Markdown-first workspace for notes, personal knowledge, project planning, Mermaid diagrams, image attachments, and simple explicit AI actions. The app must be self-hostable and use local filesystem storage for uploaded files in the MVP.

Primary priorities:

1. UI/UX quality
2. Simplicity
3. Privacy
4. Clean architecture
5. Markdown data ownership
6. Future extensibility

Stack:

* Next.js App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* Drizzle ORM
* Turso/libSQL
* CodeMirror 6
* react-markdown
* remark-gfm
* rehype-sanitize
* Mermaid
* Auth.js
* Local filesystem attachment storage
* OpenAI-compatible AI provider abstraction

Important product decisions:

* English-first UI.
* RTL support must exist at the note level using direction values: ltr, rtl, auto.
* Notes are stored as Markdown text.
* Do not build a block editor.
* Do not build collaboration in MVP.
* Do not expose local uploaded files publicly.
* AI must run only after explicit user action.
* Never silently send private note content to AI.

Core entities:

* users
* workspaces
* notes
* tags
* note_tags
* tasks
* attachments
* note_versions
* ai_events

Main app routes:

* /dashboard
* /notes
* /notes/[id]
* /projects
* /daily
* /tags
* /settings

Core UX:
The app should feel calm, premium, fast, and minimal. Use generous spacing, strong typography, subtle borders, polished empty states, responsive layouts, keyboard-friendly interactions, and a clear writing-focused interface.

Editor requirements:

* Markdown source editor using CodeMirror 6.
* Modes: edit, preview, split, focus.
* Markdown preview using react-markdown.
* GitHub-flavored Markdown support.
* Safe rendering using sanitization.
* Mermaid fenced blocks must render as diagrams.
* Invalid Mermaid code must show a graceful error.
* Image upload button should insert Markdown image syntax.

Storage requirements:
Use local filesystem storage for MVP.

Storage layout:
storage/
attachments/
{userId}/
{year}/
{month}/
{attachmentId}-{safeFileName}
exports/
{userId}/
tmp/

Attachment requirements:

* Validate authentication.
* Validate ownership.
* Validate MIME type and size.
* Store metadata in database.
* Serve attachments through an authenticated API route.
* Do not serve the storage folder as a public static folder.

AI requirements:
Create an AI provider abstraction. Implement these actions:

* summarize note
* improve writing
* extract tasks
* create project plan
* generate Mermaid diagram
* explain selected text
* translate selected text

AI UX:

* User opens AI menu from note editor.
* User chooses an action.
* Show loading state.
* Show generated output in a review panel.
* User can insert, replace selection, copy, or discard.
* Store action metadata in ai_events.

Security requirements:

* Every server action and API route must verify the user session.
* Every note query must be scoped by user_id.
* Every attachment access must verify ownership.
* Markdown rendering must not allow unsafe raw HTML.
* Mermaid should use strict or sandbox security mode.
* Validate all inputs with Zod.

Implementation approach:
Work phase by phase. After each phase, ensure:

* TypeScript passes.
* Lint passes.
* App runs.
* Core flows are manually testable.
* No placeholder UI remains unless explicitly marked as TODO.

Phase order:

1. Foundation and app shell
2. Database and auth
3. Notes CRUD
4. Markdown editor and preview
5. Mermaid support
6. Local image uploads
7. Tags, hierarchy, and search
8. Project notes and tasks
9. AI actions
10. Export and self-hosting polish

Do not over-engineer. Prefer small, clear modules. Keep business logic in server modules, UI in components, validation in schemas, and database access in repositories/services.

---

# Technical specification for the agent

## Environment variables

```env
DATABASE_URL=file:local.db
DATABASE_AUTH_TOKEN=

NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

STORAGE_DRIVER=local
LOCAL_STORAGE_ROOT=./storage
MAX_UPLOAD_SIZE_MB=20

AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5-mini
```

For local development, you can use local libSQL/SQLite first, then switch to Turso remote later.

---

## Package shortlist

```bash
pnpm add drizzle-orm @libsql/client
pnpm add zod
pnpm add next-auth
pnpm add @uiw/react-codemirror @codemirror/lang-markdown
pnpm add react-markdown remark-gfm rehype-sanitize
pnpm add mermaid
pnpm add lucide-react
pnpm add date-fns
pnpm add openai
```

Dev tools:

```bash
pnpm add -D drizzle-kit
pnpm add -D prettier eslint
```

---

## Service boundaries

Use these internal modules:

```txt
server/notes
- createNote
- updateNote
- getNoteById
- listNotes
- archiveNote
- deleteNoteSoft

server/attachments
- saveLocalAttachment
- getAttachmentForUser
- serveAttachment
- deleteAttachment

server/ai
- runAiAction
- summarizeNote
- improveWriting
- extractTasks
- createProjectPlan
- generateMermaid

server/search
- searchNotes
- normalizeSearchText

server/tasks
- parseMarkdownTasks
- syncTasksFromMarkdown
- updateTaskStatus
```

---

# AI action schemas

## Extract tasks schema

```ts
const ExtractTasksSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
      priority: z.enum(["none", "low", "medium", "high"]),
      dueDate: z.string().nullable(),
      sourceQuote: z.string().nullable()
    })
  )
});
```

## Create project plan schema

```ts
const ProjectPlanSchema = z.object({
  title: z.string(),
  summary: z.string(),
  milestones: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      tasks: z.array(z.string())
    })
  ),
  risks: z.array(z.string()),
  nextActions: z.array(z.string())
});
```

## Generate Mermaid schema

```ts
const MermaidSchema = z.object({
  title: z.string(),
  diagramType: z.enum(["flowchart", "sequence", "mindmap", "timeline"]),
  mermaidCode: z.string(),
  explanation: z.string()
});
```

---

# UX acceptance checklist

Before calling the MVP done, verify:

```txt
The first screen looks polished.
Creating a note is obvious.
Editing feels fast.
Preview looks beautiful.
Mermaid diagrams look integrated, not hacked in.
Image upload is simple.
Project notes feel like notes, not a separate heavy app.
AI output is reviewable before insertion.
RTL content looks correct inside the editor and preview.
Dark mode is high quality.
Empty states are useful.
Keyboard shortcuts exist for common actions.
Export works.
```

---

# Suggested first milestone

Build this first:

```txt
Auth
Dashboard
Notes list
Note editor
Markdown preview
Local image upload
Mermaid rendering
Basic AI summarize action
```

That gives you a usable product quickly and validates the whole concept.

After that, add project management and deeper AI.

[1]: https://nextjs.org/docs/app/getting-started/mutating-data?utm_source=chatgpt.com "Getting Started: Mutating Data"
[2]: https://orm.drizzle.team/docs/tutorials/drizzle-with-turso?utm_source=chatgpt.com "Drizzle with Turso"
[3]: https://codemirror.net/?utm_source=chatgpt.com "CodeMirror"
[4]: https://developers.openai.com/api/docs/guides/structured-outputs?utm_source=chatgpt.com "Structured model outputs | OpenAI API"
