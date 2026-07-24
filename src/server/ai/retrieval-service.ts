import { db, schema } from "@/server/db/client";
import { eq, and, isNull, like, or, desc } from "drizzle-orm";
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

/**
 * Retrieve grounded context snippets from the current user's notes and documents
 * based on lexical match against query terms.
 */
export async function getGroundedContext(args: {
  userId: string;
  workspaceId: string;
  query: string;
  maxSnippets?: number;
}): Promise<GroundedContext> {
  const maxSnippets = args.maxSnippets ?? 5;
  // Extract keywords (words longer than 3 chars)
  const keywords = args.query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((k) => k.length > 3)
    .slice(0, 4);

  if (keywords.length === 0) {
    return { contextBlock: "", citations: [] };
  }

  // Find notes matching any keyword
  const noteConditions = keywords.map((k) => like(schema.notes.contentMd, `%${k}%`));
  const matchedNotes = await db
    .select({
      id: schema.notes.id,
      title: schema.notes.title,
      contentMd: schema.notes.contentMd,
      updatedAt: schema.notes.updatedAt,
    })
    .from(schema.notes)
    .where(
      and(
        eq(schema.notes.userId, args.userId),
        eq(schema.notes.workspaceId, args.workspaceId),
        isNull(schema.notes.deletedAt),
        eq(schema.notes.archived, false),
        or(...noteConditions),
      ),
    )
    .orderBy(desc(schema.notes.updatedAt))
    .limit(maxSnippets);

  // Find documents matching title or annotations
  const docConditions = keywords.map((k) => like(schema.documents.title, `%${k}%`));
  const matchedDocs = await db
    .select({
      id: schema.documents.id,
      title: schema.documents.title,
      fileType: schema.documents.fileType,
    })
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, args.userId),
        eq(schema.documents.workspaceId, args.workspaceId),
        or(...docConditions),
      ),
    )
    .limit(3);

  const citations: CitationItem[] = [];
  const contextLines: string[] = [];

  let citationIndex = 1;

  for (const note of matchedNotes) {
    // Extract relevant snippet surrounding first matching keyword
    let snippet = note.contentMd.slice(0, 300);
    for (const kw of keywords) {
      const idx = note.contentMd.toLowerCase().indexOf(kw);
      if (idx !== -1) {
        const start = Math.max(0, idx - 60);
        const end = Math.min(note.contentMd.length, idx + 240);
        snippet = (start > 0 ? "..." : "") + note.contentMd.slice(start, end).trim() + (end < note.contentMd.length ? "..." : "");
        break;
      }
    }

    const citation: CitationItem = {
      id: randomId(),
      sourceType: "note",
      sourceId: note.id,
      title: note.title || "Untitled Note",
      quotedText: snippet,
    };
    citations.push(citation);

    contextLines.push(
      `[Source ${citationIndex}] Note: "${note.title}" (ID: ${note.id})\n"${snippet}"`,
    );
    citationIndex++;
  }

  for (const doc of matchedDocs) {
    const citation: CitationItem = {
      id: randomId(),
      sourceType: "document",
      sourceId: doc.id,
      title: doc.title,
      quotedText: `Uploaded ${doc.fileType.toUpperCase()} document`,
    };
    citations.push(citation);

    contextLines.push(
      `[Source ${citationIndex}] Document: "${doc.title}" (ID: ${doc.id})\n"${doc.title}"`,
    );
    citationIndex++;
  }

  const contextBlock = contextLines.length > 0
    ? `\n\n--- RETRIEVED GROUNDED KNOWLEDGE SOURCES ---\n${contextLines.join("\n\n")}\n--- END GROUNDED SOURCES ---\nWhen utilizing info from sources, refer to [Source N].`
    : "";

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
