---
name: nextjs16-conventions
description: Background knowledge for writing App Router code against this repo's custom Next.js 16 fork, which has breaking changes vs. the Next.js in training data. Consult before writing or editing files under src/app/, next.config, middleware, or route handlers.
user-invocable: false
---

# Next.js 16 (custom fork) conventions

This repo pins a Next.js build (`next@16.2.9`) that diverges from the public Next.js most training
data was written against. Per [AGENTS.md](../../../AGENTS.md), do not assume pre-16 App Router
behavior — verify against the docs actually shipped in this install before writing code that
touches routing, data fetching, config, or route handlers.

## Where to look

The authoritative docs for this exact version live in the package itself:

- `node_modules/next/dist/docs/01-app/01-getting-started/` — basic App Router setup
- `node_modules/next/dist/docs/01-app/02-guides/` — task-oriented guides (data fetching, caching, forms, etc.)
- `node_modules/next/dist/docs/01-app/03-api-reference/` — exact API surface (functions, config options, file conventions)
- `node_modules/next/dist/docs/03-architecture/` — routing/rendering model, if behavior seems structurally different

## When to check

Before writing or editing code that touches:
- `src/app/**` (layouts, pages, route handlers, loading/error conventions)
- `next.config.*`
- middleware
- any Next.js-provided function/import that training data has strong priors about (e.g. `redirect`,
  `notFound`, `revalidatePath`, dynamic APIs, caching directives, config keys)

Grep the relevant `03-api-reference` file for the exact function/config name first. If its signature,
async/sync behavior, or defaults differ from what you'd normally assume, follow what the local docs say,
not training-data priors — this fork's deprecation notices take precedence.

## Signal that you're relying on stale assumptions

If you catch yourself writing something because "that's how Next.js normally works," stop and check
the doc first. This fork exists specifically because some of those assumptions are wrong here.
