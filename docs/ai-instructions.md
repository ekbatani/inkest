# AI Instruction Contracts

InkNest now defines every AI feature through a shared action spec in `src/server/ai/specs.ts`.

Each action spec is responsible for:

- Declaring which request context the model receives.
- Defining the exact output schema with Zod.
- Listing action-specific rules so the model knows what to produce.
- Reusing one common prompt format for every AI request.

## Current actions

| Action | Request context | Output schema |
| --- | --- | --- |
| `summarize` | `noteTitle`, `noteContent`, optional `selectedText` | `{ contentMd: string }` |
| `improve-writing` | `noteTitle`, `noteContent`, optional `selectedText` | `{ contentMd: string }` |
| `extract-tasks` | `noteTitle`, `noteContent`, optional `selectedText` | `{ tasks: Task[] }` |
| `create-project-plan` | `noteTitle`, `noteContent`, optional `promptHint` | `ProjectPlanSchema` |
| `generate-mermaid` | `noteTitle`, `noteContent`, optional `selectedText`, optional `promptHint` | `MermaidSchema` |
| `explain` | `noteTitle`, `selectedText` | `{ contentMd: string }` |
| `translate` | `noteTitle`, `selectedText`, `targetLanguage` | `{ contentMd: string }` |
| `create-note-from-prompt` | `prompt` | `{ title: string, contentMd: string }` |

## How to add a new AI feature

1. Add a schema and action spec entry in `src/server/ai/specs.ts`.
2. Use `buildAiSystemPrompt(...)` and `buildAiUserPrompt(...)` for the model request.
3. Parse the response with `createSchemaParser(...)`.
4. If the UI expects Markdown, render the structured object into Markdown after validation.

This keeps every AI request explicit about both context and output shape instead of relying on ad hoc prompts.
