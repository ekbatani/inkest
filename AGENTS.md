<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Inkest contributor guide

Inkest is a private, Markdown-first personal workspace. It is a Bun-run Next.js
16 App Router application with a TypeScript UI, Drizzle/libSQL data layer, and
optional AI, Google Calendar, Telegram, and MinIO integrations.

## Where changes belong

- `src/app` contains App Router pages, route handlers, metadata, and server
  actions close to their routes.
- `src/components` contains interactive UI, organized by product area.
- `src/server` owns domain logic, authorization, validation, database access,
  and external integrations.
- `src/server/db/schema.ts` is the data-model source of truth; generated
  migrations belong in `drizzle/`.
- `docs/` holds durable product, architecture, and operations documentation.

Keep domain rules in server services and validate untrusted input with Zod at
the boundary. Prefer small, explicit modules over cross-layer shortcuts.

## Non-negotiable boundaries

- Authenticate every server action and API route, then scope all reads and
  mutations to the current user and workspace. An ID alone is never
  authorization.
- Treat note content as user-owned Markdown. Preserve it through editor,
  preview, export, wiki-link, checklist, and Mermaid changes; keep rendered
  content sanitized.
- Attachments stay private behind the authenticated attachment route. A storage
  driver change must not make attachment data public.
- Use Drizzle migrations for schema changes. Do not hand-edit a deployed
  database or change an existing committed migration.
- Treat provider keys, OAuth tokens, Telegram credentials, and environment
  variables as secrets. Never commit them or expose them to the client.
- Preserve keyboard access, RTL behavior, and reduced-motion support when
  changing writing or navigation experiences.

## Working and verification

Use Bun and the repository scripts:

```bash
bun install
bun run typecheck
bun run lint
bun run build
```

Run the smallest relevant check while iterating, then run the proportionate
typecheck, lint, and build checks before handoff. For changes to authenticated
flows, attachments, or integrations, also exercise both the success path and a
failure or unauthorized path. Run `bun run db:generate` after a schema change,
commit the resulting migration, and use `bun run db:migrate` to apply it.

Before changing Next.js behavior, read the applicable local guide under
`node_modules/next/dist/docs/`; this repository intentionally does not assume
older Next.js conventions. Keep [README.md](README.md) and the relevant file
under `docs/` aligned when a user-facing, architectural, or operational
contract changes.
