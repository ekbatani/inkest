# Repository Coverage Ledger

| Row | Boundary | Family | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| auth-and-session | NextAuth and Compose | auth/session | suppressed | Fixed explicit deployment secret requirement; service auth reviewed. |
| data-ownership | notes/tasks/tags/versions | object isolation | suppressed | Fixed tag response ownership; all remaining reviewed queries scope current user. |
| ai-credentials-and-egress | settings/provider/API | SSRF/secrets | suppressed | Fixed user-controlled endpoint restriction and credential redaction. |
| telegram-webhook | webhook/linking | auth/integrity | suppressed | Fixed mandatory secret and atomic link consumption. |
| attachments | upload/download/storage | file/resource exhaustion | deferred | Requires streaming/platform body limit. |
| exports | workspace archive | resource exhaustion | deferred | Requires streaming and aggregate quota. |
| calendar-oauth | OAuth callbacks/service | OAuth/token secrecy | no_issue_found | State, authenticated persistence, and token redaction reviewed. |
| markdown-and-mermaid | preview/rendering | stored XSS | no_issue_found | Sanitized Markdown and Mermaid strict-mode reviewed. |
| deployment-storage | Compose/MinIO | secrets/storage exposure | suppressed | Fixed MinIO defaults and public port publication. |
