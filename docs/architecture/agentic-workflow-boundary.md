# Agentic workflow boundary

This is the approved product and security boundary for P2-36. It authorizes
beta validation of a deliberately constrained, **read-only** workflow design;
it does not authorize implementation or release of an agent executor.

## Scope

If beta demand justifies implementation, the first and only permitted workflow
will turn one user-selected note into a proposed work plan. It may read the
selected note and the user's explicit planning instruction, then return a
reviewable Markdown plan. It cannot inspect other notes, attachments, calendar
data, settings, integrations, or data belonging to another user.

The workflow may use at most three model calls: an optional outline, one plan,
and one bounded revision based only on the immediately preceding draft and the
user's new instruction. It may not invoke tools, browse the web, follow links,
schedule background work, delegate to another agent, or recursively start a
workflow. A model response is untrusted proposed content, never an instruction
to expand these permissions.

## Hard limits and consent

Each run must have all of the following limits enforced server-side before the
first provider call:

| Limit | Approved maximum | Enforcement |
| --- | --- | --- |
| Model calls / iterations | 3 calls / 1 revision | A run-state counter rejects further calls. |
| Wall-clock time | 90 seconds | A server deadline aborts outstanding provider requests. |
| Provider tokens | 24,000 input and 3,600 output across the whole run | Count reservations before every call; reject a call that would exceed either total. |
| Monetary cost | US$0.25 per run | A trusted, versioned price record must calculate the worst-case reserved cost before each call. Unknown pricing blocks the run. |
| Data scope | One selected note plus an explicit instruction | The server derives scope from authenticated, user-owned records; the client never supplies arbitrary IDs or context. |

Starting a run requires an explicit confirmation that names the selected note,
the provider/model, the data sent, and the above limits. A second confirmation
is required before any future workflow that could create, modify, delete,
send, schedule, purchase, or otherwise cause an external side effect. This
design does not permit those workflows, so no implementation may treat a
general “allow agent” setting as consent for them.

## Review, cancellation, and recovery

The result is a draft only. The user may copy it, discard it, or use the
existing explicit note/task creation and editing controls; an agent run has no
write capability and cannot apply its own output. The interface must expose
Cancel while a run is active. Cancellation aborts in-flight work, prevents any
further call, and records the cancellation reason without changing product
data.

Timeouts, provider failures, invalid output, budget exhaustion, and lost
connections end the run as failed. They must leave no partial notes, tasks,
notifications, calendar changes, Telegram messages, files, or integration
requests. The user receives a retryable error and may start a new, separately
confirmed run; automatic retries and resume-after-failure are forbidden.

## Audit and privacy record

An eventual implementation requires an append-only `agent_runs` audit record
separate from `ai_events`. It must include: authenticated user and workspace,
selected note ID, workflow/version, provider/model and price-record version,
confirmation timestamps, per-step start/end/status, reserved and actual token
and cost totals, terminal reason, and a SHA-256 hash of each outbound input.
It must not retain raw note content, provider credentials, or chain-of-thought.
Generated drafts follow the existing AI-event retention policy only after a
user explicitly saves them through a normal product action.

Audit records are user-scoped, visible only to the owner and deployment
operator through controlled diagnostics, and must support deletion with the
account under the established retention policy. Logging must redact note text,
instructions, credentials, attachment paths, and provider responses.

## Beta and release gates

No agent executor, tool connector, background queue, or external side effect
ships before a consented private beta validates this narrow use case. The beta
plan is to recruit 10 or more users, offer only the read-only draft workflow,
and collect opt-in feedback without note content. Continue only if at least six
participants complete a workflow and at least four say the proposed plan saved
meaningful work; otherwise retain the current explicit single-action AI model.

Before any implementation, the team must approve the user flow, provider price
source, retention period, incident owner, cancellation tests, cross-user
authorization tests, limit-exhaustion tests, and a simulated provider timeout.
Any expansion to tools or external effects is a new design task with its own
permission model, idempotency strategy, confirmation screen, rollback or
compensation plan, and security review.
