<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Inkest Contributor & Agentic Coding Guide

Inkest is a private, Markdown-first personal workspace. It is built as a Next.js 16 (App Router) application powered by React 19, TypeScript (strict mode), Bun, Drizzle ORM (libSQL / PostgreSQL with `pgvector`), Tailwind CSS v4, and CodeMirror 6.

This guide provides clean code conduction standards and actionable directives for both AI coding agents and human contributors.

---

## 1. Codebase Structure & Ownership

Maintain a strict separation of concerns across application layers:

| Directory | Layer Responsibility | Rules & Restrictions |
| :--- | :--- | :--- |
| `src/app/` | App Router pages, layouts, route handlers, server actions | Keep route files thin. Colocate route-specific components or invoke server services directly. |
| `src/components/` | Interactive UI & presentational components | Grouped by product domain (`ai/`, `notes/`, `projects/`, `vault/`, `calendar/`, `ui/`). No direct DB queries. |
| `src/server/` | Pure domain logic, DB queries, auth, external services | Owns business logic, Drizzle data queries, and integrations (AI providers, Calendar, Telegram, MinIO). Never imports client-only code. |
| `src/lib/` | Shared utilities, formatting, crypto, markdown parsing | Stateless helpers, encryption utilities, document engine transforms. |
| `src/server/db/schema.ts` | Database schema source of truth | All table definitions live here. Generated migrations belong in `drizzle/`. |
| `documents/` | Local workspace documentation & research | Contains design decisions, business plans, and audit notes. **Local-only and excluded from git** to keep the repository codebase lean. |

---

## 2. Clean Code Conduction Standards

### Strict Type Safety & Validation
- **Zero `any` Policy**: Write explicit TypeScript types and interfaces. Use generics and discriminated unions where appropriate.
- **Boundary Validation with Zod**: Validate all inputs at the system boundary (API routes, Server Actions, webhook payloads, environment variables) using Zod before passing them to server services.
- **Fail Fast & Explicit Errors**: Prefer returning typed result objects or throwing domain-specific errors over silent failures.

### Multi-Tenant Security & Authorization
- **Authenticate Every Request**: Every Server Action and API Route handler must authenticate the active session (`auth()`) before executing any logic.
- **Explicit User & Workspace Scoping**: All database reads, inserts, updates, and deletes must explicitly filter by the authenticated user's ID (`userId`) and active workspace ID. **An ID in a URL or payload is never authorization.**
- **Secret Protection**: AI provider keys (BYOK), OAuth credentials, and encryption keys must never be logged, committed, or exposed to client-side bundles. BYOK keys are encrypted at rest with AES-256-GCM.

### Markdown & Document Engine Integrity
- **User Content Preservation**: Treat user notes as pristine Markdown. Never strip user formatting, whitespace, or custom syntax during parsing, backlink extraction, or Mermaid diagram rendering.
- **Sanitized Output**: Always sanitize rendered Markdown HTML output using `rehype-sanitize` to protect against XSS vulnerabilities.

### UX & Accessibility
- Preserve keyboard navigation, focus management, RTL/LTR bi-directional text alignment, and `prefers-reduced-motion` settings across writing and reading experiences.

---

## 3. Agentic Coding Guidelines & Workflow

When operating as an AI agent or pair programming with agents, adhere to the following workflow:

### A. Plan First for Non-Trivial Tasks
1. **Explore & Research**: Inspect relevant files, existing patterns, and test suites before writing code.
2. **Formulate a Plan**: For multi-step or architectural changes, outline the sequence of modifications and verification steps clearly.
3. **Execute Methodically**: Keep modifications scoped and surgical. Avoid unrelated refactors or sweeping stylistic re-writes.

### B. Surgical File Modifications
- Make precise, targeted changes.
- Preserve existing comments, docstrings, and architectural invariants unless explicitly refactoring them.
- Avoid introducing circular dependencies between `@/components` and `@/server`.

### C. Database Evolution Workflow
1. Modify schema definitions in `src/server/db/schema.ts`.
2. Generate migration files via:
   ```bash
   bun run db:generate
   ```
3. Apply migrations locally:
   ```bash
   bun run db:migrate
   ```
4. **Never modify existing, already-applied migrations** in `drizzle/`.

### D. Documentation & Git Hygiene
- Local documentation files (audits, research reports, operational notes) live under `documents/` and are ignored by git.
- Keep commits focused strictly on application code, tests, configuration, and developer guidelines.

---

## 4. Verification & Quality Assurance

Before concluding any task or submitting a pull request, run the verification pipeline using **Bun**:

```bash
# 1. Type verification
bun run typecheck

# 2. Linting & code style
bun run lint

# 3. Unit and integration tests
bun test

# 4. Standalone production build (for releases or major changes)
bun run build
```

Always verify both the **happy path** and **unauthorized / failure paths** when altering security, authentication, or external integration logic.

