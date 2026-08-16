/**
 * Background Incremental Knowledge Indexing Pipeline.
 * Synchronizes Markdown documents with Turso document_blocks, FTS5 index,
 * document_links graph, and document_embeddings without blocking editor typing.
 */

import { db, schema } from "@/server/db/client";
import { eq, and, inArray } from "drizzle-orm";
import { parseDocument } from "@/lib/document-engine/parser";
import { syncDocumentFts, deleteDocumentFts } from "./fts-service";
import { upsertBlockEmbedding, deleteBlockEmbeddings, deleteDocumentEmbeddings } from "./vector-service";
import { getAiProvider } from "@/server/ai/provider";
import { randomId } from "@/lib/slug";
import type { DocumentBlock } from "@/lib/document-engine/types";

/**
 * Indexes a document incrementally into Turso/libSQL.
 */
export async function indexDocument(args: {
  documentId: string;
  workspaceId: string;
  userId: string;
  title: string;
  content: string;
  version?: number;
}): Promise<void> {
  const { documentId, workspaceId, userId, title, content, version = 1 } = args;
  const now = new Date();

  // 1. Update index state to 'processing'
  try {
    await db
      .insert(schema.documentIndexState)
      .values({
        documentId,
        workspaceId,
        userId,
        contentVersion: version,
        status: "processing",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: schema.documentIndexState.documentId,
        set: {
          contentVersion: version,
          status: "processing",
          updatedAt: now,
        },
      });
  } catch (err) {
    console.warn("Could not set indexing status to processing:", err);
  }

  try {
    // 2. Parse document into canonical blocks
    const model = parseDocument(content, documentId, version);
    const newBlocks = model.blocks;

    // 3. Fetch existing blocks from Turso
    const existingBlocks = await db
      .select({
        id: schema.documentBlocks.id,
        contentHash: schema.documentBlocks.contentHash,
        blockIndex: schema.documentBlocks.blockIndex,
      })
      .from(schema.documentBlocks)
      .where(
        and(
          eq(schema.documentBlocks.documentId, documentId),
          eq(schema.documentBlocks.workspaceId, workspaceId),
        ),
      );

    const existingBlockMap = new Map(existingBlocks.map((b) => [b.id, b]));
    const newBlockIds = new Set(newBlocks.map((b) => b.id));

    // Determine blocks to delete
    const blocksToDelete = existingBlocks.filter((b) => !newBlockIds.has(b.id));

    // Determine blocks to insert or update
    const blocksToUpsert: DocumentBlock[] = [];
    const changedBlockIdsForEmbedding: DocumentBlock[] = [];

    for (let i = 0; i < newBlocks.length; i++) {
      const block = newBlocks[i];
      const existing = existingBlockMap.get(block.id);

      if (!existing || existing.contentHash !== block.hash || existing.blockIndex !== i) {
        blocksToUpsert.push(block);
        if (!existing || existing.contentHash !== block.hash) {
          changedBlockIdsForEmbedding.push(block);
        }
      }
    }

    // 4. Apply deletions to document_blocks
    if (blocksToDelete.length > 0) {
      const deleteIds = blocksToDelete.map((b) => b.id);
      await db
        .delete(schema.documentBlocks)
        .where(inArray(schema.documentBlocks.id, deleteIds));

      // Clean up orphaned embeddings
      await deleteBlockEmbeddings(deleteIds);
    }

    // 5. Apply upserts to document_blocks
    for (const block of blocksToUpsert) {
      const blockIdx = model.blockIndex[block.id] ?? 0;
      await db
        .insert(schema.documentBlocks)
        .values({
          id: block.id,
          documentId,
          workspaceId,
          userId,
          documentVersion: version,
          blockIndex: blockIdx,
          blockType: block.type,
          content: block.content,
          contentHash: block.hash,
          startOffset: block.sourceRange.start,
          endOffset: block.sourceRange.end,
          startLine: block.sourceRange.startLine,
          endLine: block.sourceRange.endLine,
          headingAnchor: block.metadata.sectionAnchorId ?? block.metadata.headingAnchorId,
          sectionTitle: block.metadata.sectionTitle,
          metadataJson: JSON.stringify(block.metadata),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: schema.documentBlocks.id,
          set: {
            documentVersion: version,
            blockIndex: blockIdx,
            blockType: block.type,
            content: block.content,
            contentHash: block.hash,
            startOffset: block.sourceRange.start,
            endOffset: block.sourceRange.end,
            startLine: block.sourceRange.startLine,
            endLine: block.sourceRange.endLine,
            headingAnchor: block.metadata.sectionAnchorId ?? block.metadata.headingAnchorId,
            sectionTitle: block.metadata.sectionTitle,
            metadataJson: JSON.stringify(block.metadata),
            updatedAt: now,
          },
        });
    }

    // 6. Synchronize FTS5 index
    await syncDocumentFts({
      documentId,
      workspaceId,
      userId,
      title,
      blocks: newBlocks,
    });

    // 7. Synchronize document links (Wiki links & structural relations)
    await syncDocumentLinks({
      documentId,
      workspaceId,
      userId,
      blocks: newBlocks,
    });

    // 8. Generate & store embeddings for changed/new semantic blocks
    if (changedBlockIdsForEmbedding.length > 0) {
      await generateAndStoreEmbeddings({
        documentId,
        workspaceId,
        userId,
        blocks: changedBlockIdsForEmbedding,
      });
    }

    // 9. Update index state to 'ready'
    await db
      .update(schema.documentIndexState)
      .set({
        ftsVersion: version,
        embeddingVersion: version,
        relationshipVersion: version,
        status: "ready",
        lastIndexedAt: new Date(),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.documentIndexState.documentId, documentId));
  } catch (err) {
    console.error("Incremental indexing failed for document:", documentId, err);
    await db
      .update(schema.documentIndexState)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(schema.documentIndexState.documentId, documentId));
  }
}

/**
 * Synchronizes explicit Wiki links in document_links.
 */
async function syncDocumentLinks(args: {
  documentId: string;
  workspaceId: string;
  userId: string;
  blocks: DocumentBlock[];
}): Promise<void> {
  const { documentId, workspaceId, userId, blocks } = args;

  // Extract all target note slugs from blocks
  const targetSlugs = new Set<string>();
  for (const block of blocks) {
    if (block.metadata.links) {
      for (const link of block.metadata.links) {
        targetSlugs.add(link.toLowerCase());
      }
    }
  }

  // Clear previous parser links for this document
  await db
    .delete(schema.documentLinks)
    .where(
      and(
        eq(schema.documentLinks.sourceDocumentId, documentId),
        eq(schema.documentLinks.origin, "parser"),
      ),
    );

  if (targetSlugs.size === 0) return;

  // Resolve slugs to notes in the same workspace
  const resolvedNotes = await db
    .select({ id: schema.notes.id, slug: schema.notes.slug, title: schema.notes.title })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.workspaceId, workspaceId),
        eq(schema.notes.userId, userId),
      ),
    );

  const slugToId = new Map<string, string>();
  for (const n of resolvedNotes) {
    slugToId.set(n.slug.toLowerCase(), n.id);
    slugToId.set(n.title.toLowerCase(), n.id);
  }

  for (const slug of targetSlugs) {
    const targetId = slugToId.get(slug);
    if (targetId && targetId !== documentId) {
      await db
        .insert(schema.documentLinks)
        .values({
          id: randomId("lnk"),
          workspaceId,
          userId,
          sourceDocumentId: documentId,
          targetDocumentId: targetId,
          linkType: "wiki",
          origin: "parser",
          confidence: 1.0,
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    }
  }
}

/**
 * Generates and stores embeddings for semantic blocks.
 */
async function generateAndStoreEmbeddings(args: {
  documentId: string;
  workspaceId: string;
  userId: string;
  blocks: DocumentBlock[];
}): Promise<void> {
  const { documentId, workspaceId, userId, blocks } = args;

  // Filter blocks with meaningful text (ignore empty thematic breaks)
  const semanticBlocks = blocks.filter(
    (b) => b.content.trim().length > 10 && b.type !== "thematic-break",
  );

  if (semanticBlocks.length === 0) return;

  const provider = await getAiProvider(userId);
  const textsToEmbed = semanticBlocks.map((b) => {
    const prefix = b.metadata.sectionTitle ? `[Section: ${b.metadata.sectionTitle}] ` : "";
    return `${prefix}${b.content.slice(0, 1000)}`;
  });

  let vectors: number[][] = [];
  if (provider && provider.embed) {
    try {
      vectors = await provider.embed(textsToEmbed);
    } catch {
      // Fallback
    }
  }

  // If no vectors returned, use deterministic embedding fallback
  if (vectors.length === 0) {
    const { generateDeterministicEmbedding } = await import("@/server/ai/provider");
    vectors = textsToEmbed.map((t) => generateDeterministicEmbedding(t, 384));
  }

  for (let i = 0; i < semanticBlocks.length; i++) {
    const block = semanticBlocks[i];
    const vector = vectors[i];
    if (!vector) continue;

    const embeddingId = `emb-${block.id}`;
    await upsertBlockEmbedding({
      id: embeddingId,
      documentId,
      blockId: block.id,
      workspaceId,
      userId,
      contentHash: block.hash,
      textHash: block.hash,
      embeddingModel: provider?.embeddingModel || "text-embedding-3-small",
      dimensions: vector.length,
      vector,
    });
  }
}

/**
 * Completely purges a document's derived knowledge indexes.
 */
export async function purgeDocumentIndex(documentId: string): Promise<void> {
  await deleteDocumentFts(documentId);
  await deleteDocumentEmbeddings(documentId);
  await db
    .delete(schema.documentBlocks)
    .where(eq(schema.documentBlocks.documentId, documentId));
  await db
    .delete(schema.documentLinks)
    .where(eq(schema.documentLinks.sourceDocumentId, documentId));
  await db
    .delete(schema.documentIndexState)
    .where(eq(schema.documentIndexState.documentId, documentId));
}
