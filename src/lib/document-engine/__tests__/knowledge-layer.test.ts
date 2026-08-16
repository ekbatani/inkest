import { describe, expect, it, beforeAll } from "bun:test";
import { generateDeterministicEmbedding } from "@/server/ai/provider";
import { searchFts, syncDocumentFts, initFtsTable } from "@/server/knowledge/fts-service";
import { searchVector, upsertBlockEmbedding } from "@/server/knowledge/vector-service";
import { indexDocument, purgeDocumentIndex } from "@/server/knowledge/indexing-service";
import { buildContextPack, formatContextPackForPrompt } from "@/server/knowledge/context-engine";
import { parseDocument } from "@/lib/document-engine/parser";
import { db, schema } from "@/server/db/client";
import { eq } from "drizzle-orm";

describe("Knowledge Layer - Deterministic Embeddings", () => {
  it("generates normalized unit-length vectors", () => {
    const v1 = generateDeterministicEmbedding("Turso knowledge intelligence architecture", 384);
    expect(v1.length).toBe(384);

    let norm = 0;
    for (const val of v1) norm += val * val;
    expect(Math.abs(Math.sqrt(norm) - 1.0) < 1e-4).toBe(true);
  });

  it("produces higher cosine similarity for semantically related texts", () => {
    const vRef = generateDeterministicEmbedding("High performance document engine with Web Workers", 384);
    const vSimilar = generateDeterministicEmbedding("Document engine and Web Worker performance", 384);
    const vDissimilar = generateDeterministicEmbedding("Baking sourdough bread with active yeast starter", 384);

    // Compute cosine similarity (dot product of unit vectors)
    let simSimilar = 0;
    let simDissimilar = 0;
    for (let i = 0; i < 384; i++) {
      simSimilar += vRef[i] * vSimilar[i];
      simDissimilar += vRef[i] * vDissimilar[i];
    }

    expect(simSimilar > simDissimilar).toBe(true);
    expect(simSimilar > 0.5).toBe(true);
  });
});

describe("Knowledge Layer - Turso FTS5 & Vector Search Integration", () => {
  const ws1 = "test-ws-1";
  const ws2 = "test-ws-2";
  const user1 = "test-user-1";
  const user2 = "test-user-2";

  beforeAll(async () => {
    await initFtsTable();

    // Create test user and workspaces if not present
    try {
      await db.insert(schema.users).values([
        { id: user1, email: "user1@inkest.test" },
        { id: user2, email: "user2@inkest.test" },
      ]).onConflictDoNothing();

      await db.insert(schema.workspaces).values([
        { id: ws1, userId: user1, name: "Workspace 1", slug: "ws-1" },
        { id: ws2, userId: user2, name: "Workspace 2", slug: "ws-2" },
      ]).onConflictDoNothing();

      await db.insert(schema.notes).values([
        {
          id: "doc-fts-test-1",
          userId: user1,
          workspaceId: ws1,
          title: "Event-Driven Processing",
          slug: "event-driven-processing",
          contentMd: "",
        },
        {
          id: "doc-vec-test-1",
          userId: user1,
          workspaceId: ws1,
          title: "Vector Test Document",
          slug: "vector-test-document",
          contentMd: "",
        },
      ]).onConflictDoNothing();
    } catch {
      // ignore
    }
  });

  it("indexes and retrieves document blocks via FTS5 with BM25 ranking", async () => {
    const docId = "doc-fts-test-1";
    const sampleMd = `# Event-Driven Processing
This section covers event-driven architecture and asynchronous message queues.

## Database Storage
We persist all events into Turso libSQL tables for durable replay.`;

    const model = parseDocument(sampleMd, docId);
    await syncDocumentFts({
      documentId: docId,
      workspaceId: ws1,
      userId: user1,
      title: "Event-Driven Processing",
      blocks: model.blocks,
    });

    const results = await searchFts({
      workspaceId: ws1,
      userId: user1,
      query: "asynchronous message",
    });

    expect(results.length >= 1).toBe(true);
    expect(results[0].documentId).toBe(docId);
    expect(results[0].snippet.includes("asynchronous") || results[0].snippet.includes("message")).toBe(true);
  });

  it("enforces strict workspace boundaries for FTS5 queries (preventing data leaks)", async () => {
    // Querying with workspace 2 must not return workspace 1 documents
    const leakResults = await searchFts({
      workspaceId: ws2,
      userId: user2,
      query: "asynchronous message",
    });

    expect(leakResults.length).toBe(0);
  });

  it("stores and retrieves vector embeddings using libSQL cosine distance", async () => {
    const docId = "doc-vec-test-1";
    const blockId = "blk-vec-1";
    const text = "Incremental parsing minimizes UI latency and prevents main thread blocking.";
    const vector = generateDeterministicEmbedding(text, 384);

    await upsertBlockEmbedding({
      documentId: docId,
      blockId,
      workspaceId: ws1,
      userId: user1,
      contentHash: "hash-vec-1",
      textHash: "hash-vec-1",
      embeddingModel: "deterministic-384",
      dimensions: 384,
      vector,
    });

    const queryVec = generateDeterministicEmbedding("Incremental parsing latency", 384);
    const searchResults = await searchVector({
      workspaceId: ws1,
      userId: user1,
      queryVector: queryVec,
      limit: 5,
    });

    expect(searchResults.length >= 1).toBe(true);
    expect(searchResults[0].blockId).toBe(blockId);
    expect(searchResults[0].similarity > 0.6).toBe(true);
  });

  it("enforces strict workspace boundaries for vector search queries", async () => {
    const queryVec = generateDeterministicEmbedding("Incremental parsing latency", 384);
    const leakResults = await searchVector({
      workspaceId: ws2,
      userId: user2,
      queryVector: queryVec,
      limit: 5,
    });

    expect(leakResults.length).toBe(0);
  });
});

describe("Knowledge Layer - Incremental Indexing & Context Engine", () => {
  const wsId = "test-ws-kb";
  const userId = "test-user-kb";
  const noteId = "note-kb-1";

  beforeAll(async () => {
    try {
      await db.insert(schema.users).values({ id: userId, email: "kb@inkest.test" }).onConflictDoNothing();
      await db.insert(schema.workspaces).values({ id: wsId, userId, name: "KB WS", slug: "kb-ws" }).onConflictDoNothing();
      await db.insert(schema.notes).values({
        id: noteId,
        userId,
        workspaceId: wsId,
        title: "Knowledge Intelligence Architecture",
        slug: "knowledge-intelligence-architecture",
        contentMd: "# Knowledge Intelligence\n\nTurso powers the semantic search layer with FTS and vector indexes.\n\nLink to [[other-note]].",
      }).onConflictDoNothing();
    } catch {
      // ignore
    }
  });

  it("incrementally indexes a note and creates durable blocks, FTS, and index state", async () => {
    const content = `# Knowledge Intelligence Architecture

Turso powers the semantic search layer with FTS5 and vector indexes.

## Document Engine Integration
The local Web Worker parses Markdown and syncs blocks incrementally.`;

    await indexDocument({
      documentId: noteId,
      workspaceId: wsId,
      userId,
      title: "Knowledge Intelligence Architecture",
      content,
      version: 1,
    });

    // Verify document_blocks in DB
    const blocksInDb = await db
      .select()
      .from(schema.documentBlocks)
      .where(eq(schema.documentBlocks.documentId, noteId));

    expect(blocksInDb.length >= 3).toBe(true);
    expect(blocksInDb[0].documentId).toBe(noteId);
    expect(blocksInDb[0].sectionTitle).toBe("Knowledge Intelligence Architecture");

    // Verify document_index_state in DB
    const stateInDb = await db
      .select()
      .from(schema.documentIndexState)
      .where(eq(schema.documentIndexState.documentId, noteId));

    expect(stateInDb.length).toBe(1);
    expect(stateInDb[0].status).toBe("ready");
  });

  it("assembles a hybrid ContextPack with provenance and RRF ranking", async () => {
    const pack = await buildContextPack({
      workspaceId: wsId,
      userId,
      query: "semantic search FTS",
      currentDocumentId: noteId,
      maxSources: 5,
    });

    expect(pack.sources.length >= 1).toBe(true);
    expect(pack.currentDocument?.id).toBe(noteId);
    expect(pack.totalTokensEstimate > 0).toBe(true);

    const firstSource = pack.sources[0];
    expect(firstSource.documentId).toBe(noteId);
    expect(firstSource.content.length > 0).toBe(true);

    const formatted = formatContextPackForPrompt(pack);
    expect(formatted.contextBlock.includes("RETRIEVED KNOWLEDGE CONTEXT")).toBe(true);
    expect(formatted.contextBlock.includes("[Source 1]")).toBe(true);
  });

  it("purges knowledge index on document deletion", async () => {
    await purgeDocumentIndex(noteId);

    const blocksAfter = await db
      .select()
      .from(schema.documentBlocks)
      .where(eq(schema.documentBlocks.documentId, noteId));

    expect(blocksAfter.length).toBe(0);
  });
});
