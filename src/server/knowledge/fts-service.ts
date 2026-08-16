/**
 * Turso/libSQL Full-Text Search (FTS5) service for document blocks.
 * Provides block-level lexical retrieval with BM25 ranking and snippet generation.
 */

import { db } from "@/server/db/client";
import { sql } from "drizzle-orm";
import type { DocumentBlock } from "@/lib/document-engine/types";

export interface FtsSearchResult {
  documentId: string;
  blockId: string;
  title: string;
  sectionTitle?: string;
  snippet: string;
  bm25Rank: number;
}

let ftsInitialized = false;

/**
 * Ensures the FTS5 virtual table exists in Turso/libSQL.
 */
export async function initFtsTable(): Promise<void> {
  if (ftsInitialized) return;
  try {
    await db.run(sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS document_blocks_fts USING fts5(
        document_id UNINDEXED,
        block_id UNINDEXED,
        workspace_id UNINDEXED,
        user_id UNINDEXED,
        title,
        section_title,
        content,
        tokenize = 'unicode61'
      );
    `);
    ftsInitialized = true;
  } catch (err) {
    console.warn("FTS5 table initialization note:", err);
  }
}

/**
 * Searches document blocks using FTS5 BM25 ranking.
 * Strict workspace & user isolation is enforced.
 */
export async function searchFts(args: {
  workspaceId: string;
  userId: string;
  query: string;
  limit?: number;
  documentId?: string;
}): Promise<FtsSearchResult[]> {
  await initFtsTable();
  const limit = args.limit ?? 25;
  const sanitized = args.query
    .replace(/[^\p{L}\p{N}_\s-]/gu, " ")
    .trim();

  if (!sanitized) return [];

  // Prepare FTS query terms (prefix matching on tokens)
  const tokens = sanitized
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(" AND ");

  if (!tokens) return [];

  try {
    let querySql;
    if (args.documentId) {
      querySql = sql`
        SELECT
          document_id,
          block_id,
          title,
          section_title,
          snippet(document_blocks_fts, 6, '<mark>', '</mark>', '...', 16) AS snip,
          bm25(document_blocks_fts) AS rank
        FROM document_blocks_fts
        WHERE document_blocks_fts MATCH ${tokens}
          AND workspace_id = ${args.workspaceId}
          AND user_id = ${args.userId}
          AND document_id = ${args.documentId}
        ORDER BY rank ASC
        LIMIT ${limit};
      `;
    } else {
      querySql = sql`
        SELECT
          document_id,
          block_id,
          title,
          section_title,
          snippet(document_blocks_fts, 6, '<mark>', '</mark>', '...', 16) AS snip,
          bm25(document_blocks_fts) AS rank
        FROM document_blocks_fts
        WHERE document_blocks_fts MATCH ${tokens}
          AND workspace_id = ${args.workspaceId}
          AND user_id = ${args.userId}
        ORDER BY rank ASC
        LIMIT ${limit};
      `;
    }

    const res = await db.all<{
      document_id: string;
      block_id: string;
      title: string;
      section_title: string | null;
      snip: string;
      rank: number;
    }>(querySql);

    return res.map((r) => ({
      documentId: r.document_id,
      blockId: r.block_id,
      title: r.title,
      sectionTitle: r.section_title ?? undefined,
      snippet: r.snip,
      bm25Rank: r.rank,
    }));
  } catch (err) {
    console.error("FTS search failed:", err);
    return [];
  }
}

/**
 * Synchronizes FTS5 index for a document's blocks.
 */
export async function syncDocumentFts(args: {
  documentId: string;
  workspaceId: string;
  userId: string;
  title: string;
  blocks: DocumentBlock[];
}): Promise<void> {
  await initFtsTable();
  try {
    // Delete existing entries for this document
    await db.run(sql`
      DELETE FROM document_blocks_fts
      WHERE document_id = ${args.documentId};
    `);

    // Insert new block rows into FTS5
    for (const block of args.blocks) {
      if (!block.content.trim()) continue;
      const sectionTitle = block.metadata.sectionTitle ?? "";
      await db.run(sql`
        INSERT INTO document_blocks_fts(
          document_id,
          block_id,
          workspace_id,
          user_id,
          title,
          section_title,
          content
        ) VALUES (
          ${args.documentId},
          ${block.id},
          ${args.workspaceId},
          ${args.userId},
          ${args.title},
          ${sectionTitle},
          ${block.content}
        );
      `);
    }
  } catch (err) {
    console.error("FTS sync failed for document:", args.documentId, err);
  }
}

/**
 * Deletes FTS5 entries when a document is deleted.
 */
export async function deleteDocumentFts(documentId: string): Promise<void> {
  await initFtsTable();
  try {
    await db.run(sql`
      DELETE FROM document_blocks_fts
      WHERE document_id = ${documentId};
    `);
  } catch (err) {
    console.warn("FTS delete note:", err);
  }
}
