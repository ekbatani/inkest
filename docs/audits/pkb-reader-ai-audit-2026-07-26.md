# Audit of PKB, Reader, and AI-Grounding Surfaces

> **Date:** 2026-07-26  
> **Author:** Antigravity AI / Inkest Architecture Team  
> **Task Reference:** R0-01 in [`docs/DONE.md`](../DONE.md) and [`docs/TODO.md`](../TODO.md)  
> **Requirements Coverage:** FR-LINKS, FR-PKB, FR-RESEARCH, FR-READER, AI-GROUNDED

---

## 1. Executive Summary

This audit inventories Inkest's current capabilities across personal knowledge building (PKB), reading/document management, and AI context grounding to establish a clear baseline for Phase R1–R3 execution. Existing source modules will be extended rather than rebuilt.

---

## 2. Capability Surface Audit Ledger

| Capability Surface | Status | Existing File References | Implemented Features | Gap Analysis & Requirements |
|---|---|---|---|---|
| **Wiki Links (`[[...]]`)** | **PARTIAL** | [`src/lib/markdown/wiki.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/lib/markdown/wiki.ts)<br>[`src/components/markdown/markdown-preview.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/markdown/markdown-preview.tsx)<br>[`src/components/editor/note-editor.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/editor/note-editor.tsx) | Regex parsing of `[[Title]]` & `[[Title#Section]]`, target resolution by slug/title, transformation to Markdown links in preview. | **Gaps (FR-LINKS):** Missing auto-complete menu while typing `[[` in CodeMirror; missing click-to-create affordance on unlinked/broken wiki links. |
| **Backlinks** | **PARTIAL** | [`src/server/notes/service.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/notes/service.ts) (`getBacklinks`) <br>[`src/components/notes/note-metadata-panel.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/notes/note-metadata-panel.tsx) | Server service scans workspace candidate notes (up to 500) for `[[...]]` references to the current note and displays list in the right metadata rail. | **Gaps (FR-LINKS):** Linear scan uncached over 500 notes; no dedicated `note_links` join table; backlink items do not render surrounding snippet text. |
| **Tags & Re-finding** | **PARTIAL** | [`src/server/tags/service.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/tags/service.ts)<br>[`src/server/db/schema.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/db/schema.ts) (`tags`, `note_tags`) | Full tag lifecycle, note-tag assignment, search/filter by tag, workspace scoping. | **Gaps (FR-PKB):** Missing saved query views (e.g. "untagged", "recently linked"); missing pinned collections UI. |
| **Reader & Focus Mode** | **PARTIAL** | [`src/components/notes/super-focus-reader.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/notes/super-focus-reader.tsx)<br>[`src/server/attachments/service.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/attachments/service.ts) | Distraction-free full-screen overlay (`Ctrl+Shift+R`), typography choices, accessible contrast, attachment security route (`P0-41`). | **Gaps (FR-READER / FR-RESEARCH):** PDF and plain-text attachment rendering inside reader engine absent; highlighting, persistent margin annotations, and extract-to-note with source pointers absent. |
| **AI Context & Grounding** | **PARTIAL** | [`src/server/ai/runner.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/ai/runner.ts)<br>[`src/server/ai/specs.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/ai/specs.ts)<br>[`src/components/ai/ai-context-panel.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/ai/ai-context-panel.tsx) | Multi-provider runner (OpenAI/Anthropic/custom), server-enforced input/output budgets, event audit logging in `ai_events`, review-before-apply context panel. | **Gaps (AI-GROUNDED / AI-EXPLAIN):** AI answers over multi-note queries lack openable source chunk citations; uncertainty/confidence indicator missing. |

---

## 3. Extension Plan for Phases R1–R3

1. **Phase R1 (Second Brain):**
   - Extend [`src/components/editor/note-editor.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/editor/note-editor.tsx) with a CodeMirror extension for `[[` trigger autocompletion.
   - Add snippet preview to `getBacklinks` in [`src/server/notes/service.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/notes/service.ts).
   - Add saved views schema/service in [`src/server/notes/service.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/notes/service.ts).

2. **Phase R2 (Reader & Research):**
   - Extend [`src/components/notes/super-focus-reader.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/notes/super-focus-reader.tsx) to render uploaded PDF/text attachments from `/api/attachments/[id]`.
   - Add `annotations` and `extracts` entity schemas to [`src/server/db/schema.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/db/schema.ts).

3. **Phase R3 (Grounded AI):**
   - Extend [`src/server/ai/runner.ts`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/server/ai/runner.ts) to accept citation chunk references and render clickable source badges in [`src/components/ai/ai-context-panel.tsx`](file:///c:/Users/a.ekbatani/source/personal/inknest/src/components/ai/ai-context-panel.tsx).

---

## 4. Verification

- [x] Audit completed with explicit file references and status classifications.
- [x] R1–R3 extension plan aligned with existing modules.
