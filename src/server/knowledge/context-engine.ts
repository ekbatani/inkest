/**
 * Context Engine & Hybrid Retrieval Layer.
 * Assembles a structured, ranked ContextPack by fusing:
 * 1. Active Document Context & Selection
 * 2. Lexical Search (FTS5 BM25)
 * 3. Vector Similarity Search (Turso Cosine Distance)
 * 4. Structural Knowledge Graph (document_links, backlinks, parent/child)
 */

import { db, schema } from "@/server/db/client";
import { eq, and, inArray } from "drizzle-orm";
import { searchFts } from "./fts-service";
import { searchVector } from "./vector-service";
import { getAiProvider, generateDeterministicEmbedding } from "@/server/ai/provider";
import type { ContextPack, ContextSource } from "@/lib/document-engine/types";

export interface BuildContextOptions {
  workspaceId: string;
  userId: string;
  query?: string;
  currentDocumentId?: string;
  currentBlockId?: string;
  selectedText?: string;
  maxSources?: number;
  allowedDocumentIds?: string[];
}

/**
 * Builds an enriched ContextPack for AI actions, chats, and search prompts.
 */
export async function buildContextPack(
  options: BuildContextOptions,
): Promise<ContextPack> {
  const {
    workspaceId,
    userId,
    query = "",
    currentDocumentId,
    currentBlockId,
    selectedText,
    maxSources = 8,
    allowedDocumentIds,
  } = options;

  const sources: ContextSource[] = [];
  const candidateScores = new Map<string, { source: ContextSource; rrfScore: number }>();

  // 1. If user provided a selection, add as highest priority source
  if (selectedText && selectedText.trim()) {
    sources.push({
      documentId: currentDocumentId || "current",
      blockId: currentBlockId,
      type: "current-selection",
      score: 1.0,
      content: selectedText.trim(),
      sectionTitle: "Editor Selection",
    });
  }

  // 2. Fetch current document metadata if provided
  let currentDocInfo: { id: string; title: string } | undefined;
  if (currentDocumentId) {
    const docRow = await db
      .select({ id: schema.notes.id, title: schema.notes.title })
      .from(schema.notes)
      .where(
        and(
          eq(schema.notes.id, currentDocumentId),
          eq(schema.notes.workspaceId, workspaceId),
          eq(schema.notes.userId, userId),
        ),
      )
      .limit(1);

    if (docRow[0]) {
      currentDocInfo = { id: docRow[0].id, title: docRow[0].title };
    }
  }

  const cleanQuery = query.trim();

  if (cleanQuery) {
    // 3. Lexical Search (FTS5 BM25)
    const ftsResults = await searchFts({
      workspaceId,
      userId,
      query: cleanQuery,
      limit: 15,
    });

    const scopedFts = allowedDocumentIds && allowedDocumentIds.length > 0
      ? ftsResults.filter((r) => allowedDocumentIds.includes(r.documentId))
      : ftsResults;

    for (let rank = 0; rank < scopedFts.length; rank++) {
      const item = scopedFts[rank];
      const key = `${item.documentId}:${item.blockId}`;
      const rrf = 1 / (60 + rank + 1); // RRF standard constant k=60

      const existing = candidateScores.get(key);
      if (existing) {
        existing.rrfScore += rrf;
      } else {
        candidateScores.set(key, {
          source: {
            documentId: item.documentId,
            documentTitle: item.title,
            blockId: item.blockId,
            type: "fts",
            score: Math.abs(item.bm25Rank),
            content: item.snippet.replace(/<\/?mark>/g, ""),
            sectionTitle: item.sectionTitle,
          },
          rrfScore: rrf,
        });
      }
    }

    // 4. Vector Semantic Search
    let queryVector: number[] = [];
    const provider = await getAiProvider(userId);
    if (provider && provider.embed) {
      try {
        const embeddings = await provider.embed([cleanQuery]);
        if (embeddings[0]) queryVector = embeddings[0];
      } catch {
        // Fallback
      }
    }

    if (queryVector.length === 0) {
      queryVector = generateDeterministicEmbedding(cleanQuery, 384);
    }

    const vectorResults = await searchVector({
      workspaceId,
      userId,
      queryVector,
      limit: 15,
    });

    const scopedVector = allowedDocumentIds && allowedDocumentIds.length > 0
      ? vectorResults.filter((r) => allowedDocumentIds.includes(r.documentId))
      : vectorResults;

    // Hydrate vector block contents
    if (scopedVector.length > 0) {
      const blockIds = scopedVector.map((v) => v.blockId);
      const blocks = await db
        .select({
          id: schema.documentBlocks.id,
          documentId: schema.documentBlocks.documentId,
          content: schema.documentBlocks.content,
          sectionTitle: schema.documentBlocks.sectionTitle,
          startLine: schema.documentBlocks.startLine,
          endLine: schema.documentBlocks.endLine,
          blockIndex: schema.documentBlocks.blockIndex,
        })
        .from(schema.documentBlocks)
        .where(
          and(
            inArray(schema.documentBlocks.id, blockIds),
            eq(schema.documentBlocks.workspaceId, workspaceId),
            eq(schema.documentBlocks.userId, userId),
          ),
        );

      const blockMap = new Map(blocks.map((b) => [b.id, b]));

      for (let rank = 0; rank < scopedVector.length; rank++) {
        const item = scopedVector[rank];
        const block = blockMap.get(item.blockId);
        if (!block) continue;

        const key = `${item.documentId}:${item.blockId}`;
        const rrf = 1 / (60 + rank + 1);

        const existing = candidateScores.get(key);
        if (existing) {
          existing.rrfScore += rrf * 1.2; // slight boost for multi-channel match
          if (existing.source.type === "fts") {
            existing.source.type = "vector"; // promote to hybrid
          }
        } else {
          candidateScores.set(key, {
            source: {
              documentId: item.documentId,
              blockId: item.blockId,
              blockIndex: block.blockIndex,
              type: "vector",
              score: item.similarity,
              content: block.content,
              sectionTitle: block.sectionTitle ?? undefined,
              startLine: block.startLine,
              endLine: block.endLine,
            },
            rrfScore: rrf,
          });
        }
      }
    }

    // 5. Structural Link Traversal (if currentDocumentId is set)
    if (currentDocumentId) {
      const links = await db
        .select({
          targetDocumentId: schema.documentLinks.targetDocumentId,
          linkType: schema.documentLinks.linkType,
        })
        .from(schema.documentLinks)
        .where(
          and(
            eq(schema.documentLinks.sourceDocumentId, currentDocumentId),
            eq(schema.documentLinks.workspaceId, workspaceId),
            eq(schema.documentLinks.userId, userId),
          ),
        )
        .limit(5);

      if (links.length > 0) {
        const linkedDocIds = links.map((l) => l.targetDocumentId);
        const linkedNotes = await db
          .select({
            id: schema.notes.id,
            title: schema.notes.title,
            contentMd: schema.notes.contentMd,
          })
          .from(schema.notes)
          .where(
            and(
              inArray(schema.notes.id, linkedDocIds),
              eq(schema.notes.workspaceId, workspaceId),
              eq(schema.notes.userId, userId),
            ),
          );

        for (const note of linkedNotes) {
          const key = `link:${note.id}`;
          candidateScores.set(key, {
            source: {
              documentId: note.id,
              documentTitle: note.title,
              type: "link",
              score: 0.75,
              content: note.contentMd.slice(0, 300),
              sectionTitle: "Linked Document",
            },
            rrfScore: 1 / (60 + 10),
          });
        }
      }
    }
  }

  // Sort candidates by combined RRF score
  const rankedCandidates = Array.from(candidateScores.values())
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, maxSources)
    .map((c) => c.source);

  sources.push(...rankedCandidates);

  // Estimate total tokens (roughly 1 token ≈ 4 characters)
  const totalChars = sources.reduce((acc, s) => acc + s.content.length, 0);
  const totalTokensEstimate = Math.ceil(totalChars / 4);

  const currentBlockIds = sources
    .map((s) => s.blockId)
    .filter((id): id is string => Boolean(id));

  return {
    query: cleanQuery || undefined,
    currentDocument: currentDocInfo,
    currentBlockIds,
    sources,
    totalTokensEstimate,
    generatedAt: Date.now(),
  };
}

/**
 * Formats a ContextPack into a clean, provenance-labeled prompt block for LLMs.
 */
export function formatContextPackForPrompt(pack: ContextPack): {
  contextBlock: string;
  sourceCount: number;
} {
  if (pack.sources.length === 0) {
    return { contextBlock: "", sourceCount: 0 };
  }

  const lines: string[] = [];
  lines.push("--- RETRIEVED KNOWLEDGE CONTEXT ---");

  for (let i = 0; i < pack.sources.length; i++) {
    const s = pack.sources[i];
    const sourceIdx = i + 1;
    const docLabel = s.documentTitle ? `"${s.documentTitle}"` : `Doc ID: ${s.documentId}`;
    const sectionLabel = s.sectionTitle ? ` | Section: ${s.sectionTitle}` : "";
    const blockLabel = s.blockId ? ` | Block: ${s.blockId}` : "";
    const lineLabel = s.startLine !== undefined ? ` | Lines ${s.startLine + 1}-${(s.endLine ?? s.startLine) + 1}` : "";

    lines.push(
      `[Source ${sourceIdx}] (${s.type.toUpperCase()}) ${docLabel}${sectionLabel}${blockLabel}${lineLabel}:\n${s.content}\n`,
    );
  }

  lines.push("--- END KNOWLEDGE CONTEXT ---");
  lines.push("When using information from above, reference [Source N].");

  return {
    contextBlock: `\n\n${lines.join("\n")}`,
    sourceCount: pack.sources.length,
  };
}
