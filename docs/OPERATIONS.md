# Operations

## Local development and deployment

The root [README](../README.md) is the canonical source for prerequisites,
environment variables, Docker deployment, storage-driver settings, and keyboard
shortcuts. The normal local loop is:

```bash
bun install
cp .env.example .env.local
bun run db:migrate
bun run dev
```

Production uses the standalone Docker image. Persist `/app/data` and
`/app/storage` when using local storage; the supplied Docker Compose setup does
this with named volumes. Run migrations as part of deployment rather than
altering the database manually.

## Configuration and secrets

Required deployment values are the application URL, authentication secret, and
database location. AI, Telegram, Google Calendar, MinIO, and upload limits are
optional integrations. Set secrets in the deployment platform, never commit
them, and rotate a secret if it is exposed.

Instance-level AI and Telegram variables are suitable for simple self-hosting.
User-specific settings and integrations must remain isolated by user. Before a
hosted offering, encrypt stored provider credentials and review token lifecycle
and deletion behavior.

## Verification

Run the smallest relevant checks before handing off a change:

```bash
bun run typecheck
bun run lint
bun run build
```

For a change to an authenticated flow, manually verify the real flow with a
test account: sign in, perform the action, confirm data persists, and confirm a
different account cannot read it. For attachments and integrations, also test
failure states (wrong owner, invalid file, missing provider configuration, or
expired authorization).

## Performance baseline

The last recorded baseline is **2026-07-03**, using a production build, local
loopback server, Lighthouse 13, and an authenticated seeded test account. These
are comparative local measurements, not field performance.

| Route | Performance | LCP | TBT | Total transfer | Script transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/signin` | 91 | 3.5 s | 30 ms | 426 KiB | 238 KiB |
| `/dashboard` | 88 | 3.9 s | 20 ms | 502 KiB | 308 KiB |
| `/notes/[id]` | 68 | 6.8 s | 360 ms | 997 KiB | 818 KiB |

The editor is the performance priority: CodeMirror, Markdown preview, and
Mermaid currently concentrate too much script on that route. Mermaid is already
loaded client-side; measure code splitting for the editor and preview before
adding further optimization. Re-run the same production-mode measurement after
changes that affect bundles, fonts, editor behavior, or rendering.

Targets: landing page Lighthouse at least 95 with under 100 KiB first-load
JavaScript; substantially narrow the editor gap to the dashboard; validate
editor interactivity on representative hardware and a throttled connection.

### Editor typing trace — 2026-07-14

Chrome DevTools traces were captured on the local development route on a
Windows host (device-pixel ratio 1) for the user-labelled short, medium, and
large note cases. The table reports `WidgetBaseInputHandler::OnHandleInputEvent`
durations on the renderer main thread; the corresponding
`WebFrameWidgetImpl::HandleInputEvent` event is intentionally not counted a
second time.

| Case | Input events | Mean input handling | Worst input handling | Worst layout update |
| --- | ---: | ---: | ---: | ---: |
| Short | 296 | 1.5 ms | 44.5 ms | 16.9 ms |
| Medium | 130 | 2.7 ms | 39.6 ms | 6.1 ms |
| Large | 334 | 0.7 ms | 46.7 ms | 6.1 ms |

No captured editor input handler exceeded the 50 ms long-task threshold. The
separate 54.9–192 ms main-thread samples are DevTools CPU-profiler/debugger
startup and callback work (`CpuProfiler::StartProfiling`,
`V8.InvokeApiInterruptCallbacks`, and `EvaluateScript`), rather than input
handling. The traces therefore do not identify a further editor bottleneck
beyond the parent-route update that is now scheduled as a React transition.

These are post-change development measurements, not a production or throttled
before/after comparison. Capture that comparison on representative hardware
before declaring the P0-10 performance gate complete.

## Accessibility and responsive audit

### 2026-07-18 application-shell audit

The authenticated application shell has a skip-to-content link, a labelled
`main` landmark, labelled navigation, visible keyboard focus for sidebar
navigation and controls, and a keyboard-operable desktop sidebar resizer.
When the resizer has focus, use Left/Right Arrow to change its width by 20 px,
Shift+Arrow to change it by 50 px, or Home/End for its minimum/maximum width.
The note editor route also supplies a descriptive document title so Next.js
route announcements do not fall back to an opaque URL.

Static review covered the core authenticated shell, the mobile navigation
sheet, focus reader, editor direction handling, and global reduced-motion
rules. `bun.cmd run typecheck` passed. Focused ESLint remains blocked by the
pre-existing `react-hooks/set-state-in-effect` warning in
`sidebar-toggle-wrapper.tsx` when it restores the saved sidebar width; it is
unrelated to the keyboard-resizer change.

Before public release, the release maintainer (P0) must complete the manual
assistive-technology pass on a real mobile device and desktop browser: keyboard
order at 200% zoom, NVDA/VoiceOver landmark and dialog announcements, light and
dark contrast checks, and mixed Persian/English note editing. No known
user-facing blocker is deferred by this note; this is the required final
environment-specific validation.

### Editor route code-splitting measurement — 2026-07-14

The P0-11 production build was inspected through the generated client-reference
and build manifests. The initial `/notes/[id]` dependency set contains 23 script
files: **1,045.3 KiB raw / 323.5 KiB gzip**. This is a 60% reduction from the
previously recorded 818 KiB editor script transfer, using the gzip manifest
measurement as a reproducible conservative proxy for browser transfer.

CodeMirror remains the write-mode dependency. Markdown preview, Mermaid, and
the focus reader remain dynamically imported; the AI panel is now loaded only
after the AI button or the command-menu action is used. Its separate production chunk
is 13.6 KiB raw / 4.6 KiB gzip and is absent from the initial note-route entry
set. `bun run typecheck` and an isolated `bun run build` passed. Repeat the
same authenticated browser measurement on representative hardware when browser
automation is available.

## Release readiness

- Confirm migrations, persistent volumes, and environment values in a clean
  deployment.
- Verify signup/signin, notes, private attachment access, export, AI setup,
  and any enabled calendar or Telegram integration.
- Review the license, privacy disclosure, AI disclosure, backup/restore path,
  and dependency/security updates before a public release.
- Keep Docker, README, and environment examples aligned with the shipped image.
