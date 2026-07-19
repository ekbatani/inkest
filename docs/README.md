# Documentation

This directory contains the durable documentation for Inkest. It intentionally
does not keep implementation diaries, duplicate exports, or agent prompts.

| Document | Use it for |
| --- | --- |
| [Product](PRODUCT.md) | Product purpose, scope, principles, and roadmap |
| [Architecture](ARCHITECTURE.md) | Application boundaries, data, security, and integration contracts |
| [Agentic workflow boundary](agentic-workflow-boundary.md) | Approved pre-implementation limits, consent, audit, and beta gates for any future agent workflow |
| [Semantic search decision](semantic-search-decision.md) | Go/no-go decision, privacy comparison, and gated proposal for future semantic search and note-aware chat |
| [Design system](design-system.md) | Shared visual tokens, components, interaction rules, and intentional exceptions |
| [Operations](OPERATIONS.md) | Configuration, deployment, verification, and performance work |
| [Docker deployment and publishing](docker-publishing.md) | Clean-host Compose deployment, Docker Hub release gate, tags, attestations, and updates |
| [Backup and restore](backup-restore.md) | Local recovery procedure, secret boundary, and portable-export verification |
| [Privacy-safe diagnostics](diagnostics.md) | Self-hosted error monitoring, retention, alert webhook, and verification |
| [Beta feedback](beta-feedback.md) | Public beta bug reporting, privacy rules, severity, and triage cadence |

The repository [README](../README.md) is the canonical quick-start and complete
environment-variable reference.

## Documentation rules

- Describe the implemented product in the present tense; keep proposals in the
  roadmap only.
- Link to source files for behavior that changes frequently instead of copying
  detailed implementation lists.
- Update the relevant document in the same change as a product, architecture,
  deployment, or performance decision.
