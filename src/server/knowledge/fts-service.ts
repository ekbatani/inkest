/**
 * PostgreSQL Full-Text Search (FTS with tsvector & ts_rank) service for document blocks.
 * Provides block-level lexical retrieval with rank scoring and headline snippet generation.
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
 * Ensures the FTS table and indexes exist in PostgreSQL.
 */
export async function initFtsTable(): Promise<void> {
  if (ftsInitialized) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS document_blocks_fts (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        block_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        section_title TEXT,
        content TEXT NOT NULL,
        tsv TSVECTOR GENERATED ALWAYS AS (
          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(section_title, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(content, '')), 'C')
        ) STORED
      );
      CREATE INDEX IF NOT EXISTS doc_blocks_fts_tsv_idx ON document_blocks_fts USING GIN(tsv);
      CREATE INDEX IF NOT EXISTS doc_blocks_fts_doc_idx ON document_blocks_fts(document_id);
      CREATE INDEX IF NOT EXISTS doc_blocks_fts_ws_usr_idx ON document_blocks_fts(workspace_id, user_id);
    `);
    ftsInitialized = true;
  } catch (err) {
    console.warn("PostgreSQL FTS table initialization note:", err);
  }
}

/**
 * Searches document blocks using PostgreSQL tsvector and plainto_tsquery.
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

  try {
    let querySql;
    if (args.documentId) {
      querySql = sql`
        SELECT
          document_id,
          block_id,
          title,
          section_title,
          ts_headline('english', content, plainto_tsquery('english', ${sanitized}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS snip,
          ts_rank(tsv, plainto_tsquery('english', ${sanitized})) AS rank
        FROM document_blocks_fts
        WHERE tsv @@ plainto_tsquery('english', ${sanitized})
          AND workspace_id = ${args.workspaceId}
          AND user_id = ${args.userId}
          AND document_id = ${args.documentId}
        ORDER BY rank DESC
        LIMIT ${limit};
      `;
    } else {
      querySql = sql`
        SELECT
          document_id,
          block_id,
          title,
          section_title,
          ts_headline('english', content, plainto_tsquery('english', ${sanitized}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15') AS snip,
          ts_rank(tsv, plainto_tsquery('english', ${sanitized})) AS rank
        FROM document_blocks_fts
        WHERE tsv @@ plainto_tsquery('english', ${sanitized})
          AND workspace_id = ${args.workspaceId}
          AND user_id = ${args.userId}
        ORDER BY rank DESC
        LIMIT ${limit};
      `;
    }

    const res = await db.execute<{
      document_id: string;
      block_id: string;
      title: string;
      section_title: string | null;
      snip: string;
      rank: number;
    }>(querySql);

    return Array.from(res).map((r) => ({
      documentId: r.document_id,
      blockId: r.block_id,
      title: r.title,
      sectionTitle: r.section_title ?? undefined,
      snippet: r.snip,
      bm25Rank: Number(r.rank ?? 0),
    }));
  } catch (err) {
    console.error("FTS search failed:", err);
    return [];
  }
}

/**
 * Synchronizes FTS index for a document's blocks in PostgreSQL.
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
    await db.execute(sql`
      DELETE FROM document_blocks_fts
      WHERE document_id = ${args.documentId};
    `);

    // Insert new block rows
    for (const block of args.blocks) {
      if (!block.content.trim()) continue;
      const id = `${args.documentId}_${block.id}`;
      const sectionTitle = block.metadata.sectionTitle ?? "";
      await db.execute(sql`
        INSERT INTO document_blocks_fts (
          id,
          document_id,
          block_id,
          workspace_id,
          user_id,
          title,
          section_title,
          content
        ) VALUES (
          ${id},
          ${args.documentId},
          ${block.id},
          ${args.workspaceId},
          ${args.userId},
          ${args.title},
          ${sectionTitle},
          ${block.content}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          section_title = EXCLUDED.section_title,
          content = EXCLUDED.content;
      `);
    }
  } catch (err) {
    console.error("FTS sync failed for document:", args.documentId, err);
  }
}

/**
 * Deletes FTS entries when a document is deleted.
 */
export async function deleteDocumentFts(documentId: string): Promise<void> {
  await initFtsTable();
  try {
    await db.execute(sql`
      DELETE FROM document_blocks_fts
      WHERE document_id = ${documentId};
    `);
  } catch (err) {
    console.warn("FTS delete note:", err);
  }
}

