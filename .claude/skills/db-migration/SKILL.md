---
name: db-migration
description: Walk through changing the Drizzle schema and generating a matching migration for this repo (schema.ts edit -> db:generate -> review SQL -> commit). Use when adding/changing tables or columns in src/server/db/schema.ts.
---

# Database migration workflow

This project uses Drizzle ORM against SQLite (libsql/Turso). Migrations live in `drizzle/` and are
generated from `src/server/db/schema.ts` — they are not written by hand.

## Steps

1. **Edit the schema first.** Make the change in [src/server/db/schema.ts](../../../src/server/db/schema.ts).
   Follow existing conventions in that file:
   - `idCol()` helper for primary key `id` columns
   - `timestamp()` helper for `created_at`/`updated_at`-style columns
   - foreign keys use `.references(() => table.id, { onDelete: "cascade" })` unless there's a reason not to
   - add a one-line comment only when the column's purpose isn't obvious from its name

2. **Generate the migration.**
   ```
   npm run db:generate
   ```
   This writes a new numbered SQL file into `drizzle/` and updates `drizzle/meta/_journal.json` and the
   matching snapshot. Do not hand-edit `drizzle/meta/**` — always regenerate.

3. **Review the generated SQL** in the new `drizzle/000X_*.sql` file before applying it. Check that:
   - It matches the intended schema change (no accidental drops/renames from a column rename)
   - Destructive statements (`DROP COLUMN`, `DROP TABLE`) are actually intended
   - If Drizzle asks an interactive question about renames during `generate`, make sure the answer matches
     intent (rename vs. drop+add)

4. **Apply it locally** (if you have a local DB configured):
   ```
   npm run db:migrate
   ```
   Or `npm run db:push` for a quick dev-only sync without a migration file (schema prototyping only —
   prefer `db:generate` + `db:migrate` for anything that will be committed).

5. **Commit the schema.ts change together with the new migration file(s) and the updated
   `drizzle/meta/_journal.json`** — they must land in the same commit so history stays consistent.

## Don't

- Don't hand-write SQL migration files — always go through `db:generate`.
- Don't edit `drizzle/meta/_journal.json` or the snapshot JSON files directly.
- Don't split the schema.ts change and its generated migration across separate commits.
