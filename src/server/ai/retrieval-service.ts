import { db, schema } from "@/server/db/client";
import { randomId } from "@/lib/slug";

export interface CitationItem {
  id: string;
  sourceType: "note" | "document";
  sourceId: string;
  title: string;
  quotedText: string;
  locationPointer?: string;
}

export interface GroundedContext {
  contextBlock: string;
  citations: CitationItem[];
}

import { buildContextPack, formatContextPackForPrompt } from "@/server/knowledge/context-engine";

/**
 * Retrieve grounded context snippets from the current user's notes and documents
 * based on Turso hybrid retrieval (FTS5 + Vector + Knowledge Graph).
 */
export async function getGroundedContext(args: {
  userId: string;
  workspaceId: string;
  query: string;
  currentDocumentId?: string;
  maxSnippets?: number;
}): Promise<GroundedContext> {
  const maxSnippets = args.maxSnippets ?? 5;
  if (!args.query.trim()) {
    return { contextBlock: "", citations: [] };
  }

  // 1. Build hybrid ContextPack
  const pack = await buildContextPack({
    workspaceId: args.workspaceId,
    userId: args.userId,
    query: args.query,
    currentDocumentId: args.currentDocumentId,
    maxSources: maxSnippets,
  });

  const citations: CitationItem[] = [];

  for (const s of pack.sources) {
    if (s.type === "current-selection") continue;

    const citation: CitationItem = {
      id: randomId("cit"),
      sourceType: "note",
      sourceId: s.documentId,
      title: s.documentTitle || "Note",
      quotedText: s.content.slice(0, 300),
      locationPointer: s.blockId
        ? JSON.stringify({
            blockId: s.blockId,
            sectionTitle: s.sectionTitle,
            line: s.startLine,
          })
        : undefined,
    };
    citations.push(citation);
  }

  const { contextBlock } = formatContextPackForPrompt(pack);
  return { contextBlock, citations };
}

/**
 * Persist citations in the DB attached to a note or AI event.
 */
export async function persistCitations(args: {
  userId: string;
  workspaceId: string;
  targetNoteId?: string | null;
  targetAiEventId?: string | null;
  citations: CitationItem[];
}) {
  if (args.citations.length === 0) return;

  for (const item of args.citations) {
    await db.insert(schema.citations).values({
      id: item.id,
      userId: args.userId,
      workspaceId: args.workspaceId,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      targetNoteId: args.targetNoteId ?? null,
      targetAiEventId: args.targetAiEventId ?? null,
      quotedText: item.quotedText,
      locationPointer: item.locationPointer ?? null,
      isBroken: false,
    });
  }
}
