/**
 * Turso/libSQL Vector Search Service.
 * Performs cosine similarity retrieval on document block embeddings with strict workspace scoping.
 */

import { db, schema } from "@/server/db/client";
import { sql, inArray } from "drizzle-orm";
import { randomId } from "@/lib/slug";

export interface VectorSearchResult {
  documentId: string;
  blockId: string;
  distance: number;
  similarity: number; // 1 - distance
}

function vectorToSqlLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * Searches document embeddings using libSQL vector distance (cosine metric).
 * Strictly filtered by workspaceId and userId.
 */
export async function searchVector(args: {
  workspaceId: string;
  userId: string;
  queryVector: number[];
  limit?: number;
  documentId?: string;
}): Promise<VectorSearchResult[]> {
  const limit = args.limit ?? 20;
  const vectorStr = vectorToSqlLiteral(args.queryVector);

  try {
    let querySql;
    if (args.documentId) {
      querySql = sql`
        SELECT
          document_id,
          block_id,
          vector_distance_cos(embedding, vector32(${vectorStr})) AS dist
        FROM document_embeddings
        WHERE workspace_id = ${args.workspaceId}
          AND user_id = ${args.userId}
          AND document_id = ${args.documentId}
          AND embedding IS NOT NULL
        ORDER BY dist ASC
        LIMIT ${limit};
      `;
    } else {
      querySql = sql`
        SELECT
          document_id,
          block_id,
          vector_distance_cos(embedding, vector32(${vectorStr})) AS dist
        FROM document_embeddings
        WHERE workspace_id = ${args.workspaceId}
          AND user_id = ${args.userId}
          AND embedding IS NOT NULL
        ORDER BY dist ASC
        LIMIT ${limit};
      `;
    }

    const rows = await db.all<{
      document_id: string;
      block_id: string;
      dist: number;
    }>(querySql);

    return rows.map((r) => {
      const dist = Number(r.dist ?? 1.0);
      return {
        documentId: r.document_id,
        blockId: r.block_id,
        distance: dist,
        similarity: Math.max(0, 1 - dist),
      };
    });
  } catch (err) {
    console.error("Vector search failed:", err);
    return [];
  }
}

/**
 * Stores or updates a block embedding in Turso/libSQL.
 */
export async function upsertBlockEmbedding(args: {
  id?: string;
  documentId: string;
  blockId: string;
  workspaceId: string;
  userId: string;
  contentHash: string;
  textHash: string;
  embeddingModel: string;
  embeddingVersion?: number;
  dimensions: number;
  vector: number[];
}): Promise<void> {
  const id = args.id || randomId("emb");
  const vectorStr = vectorToSqlLiteral(args.vector);
  const version = args.embeddingVersion ?? 1;

  try {
    await db.run(sql`
      INSERT INTO document_embeddings (
        id,
        document_id,
        block_id,
        workspace_id,
        user_id,
        content_hash,
        text_hash,
        embedding_model,
        embedding_version,
        dimensions,
        embedding,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${args.documentId},
        ${args.blockId},
        ${args.workspaceId},
        ${args.userId},
        ${args.contentHash},
        ${args.textHash},
        ${args.embeddingModel},
        ${version},
        ${args.dimensions},
        vector32(${vectorStr}),
        unixepoch(),
        unixepoch()
      )
      ON CONFLICT(id) DO UPDATE SET
        content_hash = excluded.content_hash,
        text_hash = excluded.text_hash,
        embedding_model = excluded.embedding_model,
        embedding_version = excluded.embedding_version,
        dimensions = excluded.dimensions,
        embedding = excluded.embedding,
        updated_at = unixepoch();
    `);
  } catch (err) {
    console.error("Failed to upsert block embedding:", args.blockId, err);
  }
}

/**
 * Deletes embeddings for an entire document.
 */
export async function deleteDocumentEmbeddings(documentId: string): Promise<void> {
  try {
    await db.run(sql`
      DELETE FROM document_embeddings
      WHERE document_id = ${documentId};
    `);
  } catch (err) {
    console.warn("Delete document embeddings note:", err);
  }
}

/**
 * Deletes embeddings for specific block IDs.
 */
export async function deleteBlockEmbeddings(blockIds: string[]): Promise<void> {
  if (blockIds.length === 0) return;
  try {
    await db
      .delete(schema.documentEmbeddings)
      .where(inArray(schema.documentEmbeddings.blockId, blockIds));
  } catch (err) {
    console.warn("Delete block embeddings note:", err);
  }
}
