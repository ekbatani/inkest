# Audit Note: PKB, Reader, and AI-Grounding Surfaces (R0-01)

> **Date:** 2026-07-23  
> **Purpose:** Inventory shipped capabilities vs. gaps defined in `docs/todo-research.md` (Requirements: `FR-LINKS`, `FR-PKB`, `FR-RESEARCH`, `FR-READER`, `AI-GROUNDED`).

---

## Executive Summary & Inventory Matrix

| Surface / Capability | Status | File References | Summary of Current State | Target Extension (R1–R3) |
|---|---|---|---|---|
| **Wiki Links (`[[...]]`)** | **Partial** | `src/components/editor/markdown-editor.tsx`<br>`src/server/notes/service.ts:507` | Text parser extracts `[[token]]` for backlinks. No editor autocompletion or unresolved link indicators. | **R1-01**: Autocompletion menu in CodeMirror, unresolved link affordance, preserved across export/preview. |
| **Backlinks Panel** | **Present** | `src/app/(app)/notes/[id]/page.tsx:56`<br>`src/server/notes/service.ts:470` | Server action fetches referencing notes via `getBacklinks(id)`. Shown in right metadata panel. | **R1-01**: Re-render/update panel within <1s on note edit. |
| **Tags & Saved Views** | **Partial** | `src/server/tags/service.ts`<br>`src/components/sidebar/` | Per-user tags exist with color; note-tag join table works. Saved views do not exist. | **R1-02**: Saved view query filter persistence (tag/date/relation filters). |
| **Re-finding & Pinned** | **Partial** | `src/server/notes/service.ts:281`<br>`src/components/sidebar/` | Notes can be pinned; keyword search exists (`listNotes({ search })`). Recent history drawer is absent. | **R1-03**: Starred collections, recent-history navigation with median time-to-refind <30s. |
| **Associative Graph** | **Absent** | N/A | No node/link visualization component exists. | **R1-04**: Lightweight opt-in connection view with keyboard & reduced-motion support. |
| **Document / PDF Ingestion** | **Partial** | `src/server/attachments/`<br>`src/app/api/attachments/` | Private attachment route handles upload, MIME validation, storage driver (local/MinIO), and metadata. PDF/plain text ingestion pipeline is absent. | **R2-01**: Dedicated document ingestion pipeline linking PDF/text to `DATA-MODEL`. |
| **Reader Engine** | **Partial** | `src/components/notes/super-focus-reader.tsx` | Super focus reader exists for distraction-free Markdown. No PDF/paged reader or position restoration exists. | **R2-02**: Reader engine with clean typography, continuous/paged toggle, scroll position restore. |
| **Highlight & Annotations** | **Absent** | N/A | No persistent margin annotations or text highlights on attachments exist. | **R2-03**: Persistent stable anchors across document reopens. |
| **Extract to Note** | **Absent** | N/A | Cannot extract highlighted document fragment to a note with back-citation. | **R2-04**: Extract creation with openable source citation pointer. |
| **AI Context Selection** | **Partial** | `src/server/ai/runner.ts`<br>`src/components/ai/ai-panel.tsx` | Selected text or current full note passed to AI action context. No retrieval over multi-note workspace. | **R3-01**: FTS5 retrieval-grounded answers with chunk citations. |
| **AI Explanation & Control** | **Partial** | `src/components/ai/ai-panel.tsx` | Review-before-apply panel exists (P1-33). Does not show uncertainty, action transformation, or full side-by-side diff. | **R3-02/R3-03**: Explanation metadata + full diff approve/reject controls. |

---

## Detailed Gap Analysis

### 1. Wiki Links & PKB (`FR-LINKS`, `FR-PKB`)
- **Existing:** `extractWikiTokens` in `service.ts` parses `[[slug]]` / `[[title]]` tokens (ignoring fenced code blocks) to populate the right sidebar backlinks list.
- **Gaps:**
  - CodeMirror editor does not suggest autocompletion when typing `[[`.
  - Unresolved/broken `[[links]]` render like standard text rather than distinct affordances.
  - No saved views (filter by tag, date range, link count).
  - No recent activity history drawer.

### 2. Document & Reader Workspace (`FR-RESEARCH`, `FR-READER`)
- **Existing:** Private attachment system (`src/server/attachments/service.ts`) enforces MIME validation, file signature magic byte checks, size limits, and workspace-scoped ownership. `super-focus-reader.tsx` provides a calm focus overlay for active Markdown notes.
- **Gaps:**
  - PDF parser/ingestion is missing. Uploaded PDFs are stored as generic attachment binaries.
  - Reader engine only operates on rendered Markdown text, not ingested documents.
  - Reading position, highlights, and margin annotations are not persisted in SQLite.
  - Extract-to-note with source citation pointer (`R2-04`) does not exist.

### 3. Grounded Safe AI (`AI-GROUNDED`, `AI-EXPLAIN`, `AI-CONTROL`)
- **Existing:** AI runner (`src/server/ai/runner.ts`) accepts note text or active text selection, sends encrypted API requests to personal or instance default providers, logs to `ai_events`, and returns proposed output to `ai-panel.tsx`. User can click Append, Replace, or Create Task.
- **Gaps:**
  - AI prompt context is limited to the single active note or selection; multi-note lexical retrieval chunking is missing.
  - Citation source pointers (note title + line number / chunk) are not generated or displayed in AI responses.
  - AI responses do not report confidence / uncertainty notices when evidence is sparse.
  - Mutations are applied directly without a structured side-by-side diff view.

---

## Execution Directives for R1–R3

1. **Extend, Do Not Rebuild:** Reuse `src/server/attachments/service.ts` for PDF storage; reuse `super-focus-reader.tsx` UI conventions for reader engine; extend `getBacklinks()` in `service.ts` for wiki link indexing.
2. **Schema Extension (R0-02):** Proceed directly to R0-02 schema updates to add `documents`, `annotations`, `saved_views`, `audit_logs`, and citation structures.
