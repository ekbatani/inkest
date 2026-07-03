# Performance baseline — 2026-07-03

Captured before any Phase 2+ work (landing page, spotlight mode, animations, icons) so later
phases can be measured against a known starting point. Re-run this same procedure after each
phase that touches bundle size or runtime perf, and append a new dated section below.

## Method

- `bun run build` (Next.js 16.2.9, Turbopack, `output: "standalone"`).
- `bun run start` on port 3100 (production server, not dev).
- Lighthouse 13.0.1, headless Chrome, performance category only, no network throttling
  (local loopback — treat as a *ceiling*, not a real-world number; only relative
  before/after comparisons across phases are meaningful).
- A throwaway account (`perf-baseline-test@inkest.local`) and one note with a Mermaid
  block + ~2.5k characters of markdown were seeded directly via the DB for the
  authenticated pages, signed in through the real credentials flow to get a valid
  session cookie, then deleted after the run. No real data was touched.
- Pages tested: `/signin` (public, unauthenticated baseline), `/dashboard` (authenticated,
  app shell), `/notes/[id]` (authenticated, editor — heaviest route: CodeMirror +
  react-markdown + Mermaid).

## Build output

`next build` route table (Next.js 16's Turbopack build no longer prints per-route First
Load JS in the CLI table the way older Next.js did — sizes below come from Lighthouse's
resource summary instead, which is more accurate anyway since it reflects what's actually
requested per page rather than a static chunk graph).

23 app routes total: 3 static (`/`, `/signin`, `/signup`), 1 not-found, 19 dynamic
(server-rendered on demand — everything behind auth, plus API routes).

One build warning (pre-existing, not introduced by this pass): Turbopack flags
`next.config.ts` for an NFT trace because `src/server/attachments/storage.ts` does
filesystem ops (`path.join`/`fs`) for local attachment storage. Harmless — expected for
local disk storage — but worth an `ignore` comment if it gets noisy later.

## Lighthouse results

| Page | Perf score | FCP | LCP | TBT | CLS | Speed Index | TTI | Total transfer | Script transfer |
|---|---|---|---|---|---|---|---|---|---|
| `/signin` | 91 | 1.1s | 3.5s | 30ms | 0.055 | 1.1s | 4.0s | 426 KiB | 238 KiB |
| `/dashboard` | 88 | 1.2s | 3.9s | 20ms | 0 | 1.2s | 4.4s | 502 KiB | 308 KiB |
| `/notes/[id]` | 68 | 1.2s | 6.8s | 360ms | 0.001 | 2.5s | 7.5s | 997 KiB | 818 KiB |

Raw JSON reports are not committed (regenerate via the method above); numbers above are
the durable record.

## Reading the numbers

- **`/notes/[id]` is the clear outlier** — nearly 2x the byte weight of `/dashboard` and a
  perf score 20+ points lower, driven by script transfer (818 KiB vs 308 KiB). This is the
  CodeMirror + react-markdown + Mermaid stack loading together. Confirms Phase 9's premise:
  the editor route is where lazy-loading work pays off most. Mermaid is already
  `dynamic(..., { ssr: false })`; the next check is whether CodeMirror's markdown
  language support and the preview renderer are being pulled into the initial chunk
  together instead of split by edit/preview mode.
- **FCP and CLS are already good everywhere** (≤1.2s FCP, CLS ≈0) — the app shell and
  fonts aren't the problem. LCP and TBT/TTI on the note route are.
- **`/signin` and `/dashboard` are close** (91 vs 88, ~500 KiB either way) — the app shell
  itself is reasonably light; most of the room for improvement is route-specific, not
  global-layout related.

## Targets (from `docs/plan.md` Phase 9)

- Landing page (once built in Phase 2): < 100 KiB first-load JS, Lighthouse ≥ 95.
- Editor route interactive < 2s on mid-range hardware — currently 7.5s TTI locally
  (unthrottled loopback), so this needs real device/network testing once code-splitting
  lands, not just local Lighthouse.
- Bring `/notes/[id]` perf score up toward the `/dashboard` baseline (88) as a concrete,
  checkable milestone before chasing the harder < 2s target.
