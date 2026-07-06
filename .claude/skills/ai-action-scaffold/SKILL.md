---
name: ai-action-scaffold
description: Scaffold a new AI action module under src/server/ai/ following this repo's existing runner/specs pattern (e.g. summarize-note.ts, translate-text.ts). Use when adding a new AI-powered note action.
argument-hint: <action-id> "<goal description>"
---

# Adding a new AI action

This repo's AI actions (`src/server/ai/*.ts`) all follow the same shape: a Zod output schema + prompt
spec in [specs.ts](../../../src/server/ai/specs.ts), executed through a shared runner in
[runner.ts](../../../src/server/ai/runner.ts), exposed as one small function per action
(e.g. [summarize-note.ts](../../../src/server/ai/summarize-note.ts)).

Given an action id (e.g. `rewrite-title`) and a short goal description, do the following:

## 1. Add the action id

In `specs.ts`, add the new id to `NoteEditorActionSchema` (if it's a note-editor action) or to the
`AiActionId` union directly (if it's not, like `create-note-from-prompt`).

## 2. Define or reuse an output schema

If the output is free-form Markdown, reuse `MarkdownResponseSchema`. Otherwise define a new Zod schema
next to the existing ones (`ExtractTasksSchema`, `ProjectPlanSchema`, `MermaidSchema`, etc.) — keep field
constraints tight (`.trim().min(1)`, bounded `.max()` on titles) since these get embedded in the
model-facing JSON schema and enforced by `createSchemaParser`.

## 3. Add an entry to `AI_ACTION_SPECS`

Add a `goal`, `contextKeys` (only the fields the action actually needs — `noteTitle`, `noteContent`,
`selectedText`, `promptHint`, etc.), `rules` (explicit constraints — look at neighboring actions for the
house style: mention what to do with `selectedText` if present, forbid inventing facts, forbid
code-fencing the output, etc.), and the `outputSchema` from step 2.

## 4. Write the action function

Create `src/server/ai/<action-id>.ts` following `summarize-note.ts`:

```ts
import { type AiActionResult, runJsonAction } from "./runner";
import { buildAiSystemPrompt, buildAiUserPrompt, createSchemaParser } from "./specs";
// or createMarkdownResponseParser() if the output is MarkdownResponseSchema

export async function yourAction(args: {
  noteId: string;
  noteTitle: string;
  noteContent: string;
  selectedText?: string;
}): Promise<AiActionResult<YourOutputType>> {
  // build inputForAudit (usually selection if present, else full note) and promptToModel
  const result = await runJsonAction({
    noteId: args.noteId,
    action: "your-action-id",
    systemPrompt: buildAiSystemPrompt("your-action-id"),
    inputForAudit,
    promptToModel: buildAiUserPrompt("your-action-id", { /* contextKeys fields */ }),
    parse: createSchemaParser(YourOutputSchema),
  });

  return result.ok ? { ...result, output: /* shape as needed */ } : result;
}
```

Use `runTextAction` instead of `runJsonAction` only if the model call doesn't need structured JSON
output at all (rare — most actions go through JSON mode even for Markdown output, via
`MarkdownResponseSchema`).

## 5. Wire it into the caller

Find where existing actions are dispatched (check the editor/AI panel components that reference
`NoteEditorActionSchema` or `AiActionId`) and add the new action alongside them.

## Don't

- Don't call the OpenAI provider directly — always go through `runTextAction`/`runJsonAction` so audit
  logging (`ai_events`) and the "not configured" fallback stay consistent.
- Don't skip the Zod schema even for Markdown-only output — use `MarkdownResponseSchema` so parsing stays
  uniform.
