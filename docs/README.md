# Documentation

This directory contains the durable documentation for Inkest. It intentionally
does not keep implementation diaries, duplicate exports, or agent prompts.

| Document | Use it for |
| --- | --- |
| [Product](PRODUCT.md) | Product purpose, scope, principles, and roadmap |
| [Architecture](ARCHITECTURE.md) | Application boundaries, data, security, and integration contracts |
| [Design system](design-system.md) | Shared visual tokens, components, interaction rules, and intentional exceptions |
| [Operations](OPERATIONS.md) | Configuration, deployment, verification, and performance work |
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
