# Overview

InkNest is a self-hosted Next.js personal workspace for authenticated Markdown notes, projects, attachments, exports, optional AI providers, Google Calendar, and Telegram notifications. Its deployed runtime is the App Router application, libSQL/Drizzle data store, private attachment driver, and optional third-party integrations. Documentation, migrations, tests, and build scripts are supporting rather than primary request surfaces.

# Threat Model, Trust Boundaries, and Assumptions

The principal assets are private notes, note versions, tasks, tags, project relationships, attachments, exports, user credentials, encrypted AI and OAuth credentials, Telegram destinations, and instance configuration. Every user-owned database object must remain scoped to the authenticated user and workspace. Attachments and exports must remain inaccessible without that same scope. Provider keys and OAuth tokens remain server-only and encrypted at rest.

Trust boundaries are browser-to-server actions/API routes; session-to-user/workspace resolution; database query predicates; application-to-local/MinIO attachment storage; application-to AI, Google, and Telegram providers; and operator environment configuration. Browser input, route parameters, multipart bodies, webhook bodies, OAuth callback parameters, stored Markdown, user provider settings, and user-provided attachment metadata are attacker controlled. Environment variables, deployment storage, and secrets are operator controlled; source, migrations, and CI inputs are developer controlled.

The application assumes NextAuth session integrity, a correctly configured NEXTAUTH_SECRET, a private database and attachment volume, and operators protecting environment configuration. It does not assume that an authenticated account is trusted to access another account's objects, make arbitrary network requests, or select an unverified webhook sender.

# Attack Surface, Mitigations, and Attacker Stories

Primary request surfaces are server actions under `src/server`, route handlers under `src/app/api`, auth configuration, and `src/proxy.ts`. The main object-authorization controls use `getCurrentUser()` and Drizzle predicates combining object id and `userId`; note services also scope workspace ownership. Attachment reads go through authenticated route handlers and attachment storage paths are opaque IDs. Markdown rendering is expected to be sanitized. The credential box in `src/server/crypto/secret-box.ts` provides versioned authenticated encryption.

The highest-risk attacker stories are: an authenticated user invokes an action with another user's identifier; a public integration callback is forged or brute-forced; a user-controlled provider URL reaches private network services; a multipart/export request exhausts shared runtime memory; stored Markdown or an attachment is rendered in an unsafe browser context; or a provider/OAuth/Telegram secret leaks through a response, export, or log. OAuth state/callback binding, session cookies, webhook authentication, egress controls, upload limits, parser limits, rate limits, and private download headers are critical supporting controls.

Out of scope are an attacker with server filesystem/database access, compromise of a configured external provider, or a malicious instance operator. However, self-hosted deployments may be multi-user, so global operator notification channels must not silently receive a user's private output.

# Severity Calibration (Critical, High, Medium, Low)

Critical issues include remote code execution, arbitrary database compromise, or unauthenticated disclosure of all users' notes/credentials. High issues include an authenticated cross-user bulk disclosure/mutation, SSRF into reachable internal services, exposure of private note output to an operator-controlled external chat, or bypass of webhook authentication that permits account linking or protected state changes. Medium issues include targeted object disclosure requiring a high-entropy identifier, unauthenticated request-body resource exhaustion, unbounded authenticated exports, unsafe attachment rendering, or weak link-code consumption/rate controls. Low issues include self-only display issues, low-impact metadata disclosure, or hardening gaps without a reachable cross-boundary exploit.

Repository: C:\Users\a.ekbatani\source\personal\inknest
Version: a99f69ddaf6b4201aa763052932d625f2f051aff
