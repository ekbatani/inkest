import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";
import type { Annotation, Citation, Note } from "@/server/db/schema";
import { createNote } from "@/server/notes/service";

async function getContext() {
  const user = await getCurrentUser();
  if (!user) return null;
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) return null;
  return { user, workspace };
}

export async function createAnnotation(input: {
  documentId: string;
  highlightText: string;
  comment?: string;
  color?: string;
  pageNumber?: number;
  positionSelector?: string;
}): Promise<Annotation | null> {
  const ctx = await getContext();
  if (!ctx) return null;

  const annotationId = randomId();
  const values: typeof schema.annotations.$inferInsert = {
    id: annotationId,
    userId: ctx.user.id,
    documentId: input.documentId,
    noteId: null,
    highlightText: input.highlightText,
    comment: input.comment ?? null,
    color: input.color ?? "yellow",
    pageNumber: input.pageNumber ?? null,
    positionSelector: input.positionSelector ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.annotations).values(values);

  const rows = await db
    .select()
    .from(schema.annotations)
    .where(eq(schema.annotations.id, annotationId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listAnnotationsForDocument(
  documentId: string,
): Promise<Annotation[]> {
  const ctx = await getContext();
  if (!ctx) return [];

  return db
    .select()
    .from(schema.annotations)
    .where(
      and(
        eq(schema.annotations.documentId, documentId),
        eq(schema.annotations.userId, ctx.user.id),
      ),
    )
    .orderBy(desc(schema.annotations.createdAt));
}

export async function deleteAnnotation(id: string): Promise<boolean> {
  const ctx = await getContext();
  if (!ctx) return false;

  await db
    .delete(schema.annotations)
    .where(
      and(
        eq(schema.annotations.id, id),
        eq(schema.annotations.userId, ctx.user.id),
      ),
    );

  return true;
}

export async function extractAnnotationToNote(input: {
  annotationId: string;
  documentTitle: string;
}): Promise<{ note: Note; citation: Citation } | null> {
  const ctx = await getContext();
  if (!ctx) return null;

  const annRows = await db
    .select()
    .from(schema.annotations)
    .where(
      and(
        eq(schema.annotations.id, input.annotationId),
        eq(schema.annotations.userId, ctx.user.id),
      ),
    )
    .limit(1);

  const annotation = annRows[0];
  if (!annotation) return null;

  const title = `Extract: ${input.documentTitle}`;
  const contentMd = `> ${annotation.highlightText || ""}\n\n${
    annotation.comment ? `**Annotation Note:**\n${annotation.comment}\n\n` : ""
  }_Source: [${input.documentTitle}](/reader/${annotation.documentId})_`;

  const note = await createNote({
    title,
    contentMd,
    type: "note",
  });

  const citationId = randomId();
  const citationValues: typeof schema.citations.$inferInsert = {
    id: citationId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.id,
    sourceType: "document",
    sourceId: annotation.documentId,
    targetNoteId: note.id,
    targetAiEventId: null,
    locationPointer: JSON.stringify({
      annotationId: annotation.id,
      pageNumber: annotation.pageNumber,
      positionSelector: annotation.positionSelector,
    }),
    quotedText: annotation.highlightText,
    isBroken: false,
    createdAt: new Date(),
  };

  await db.insert(schema.citations).values(citationValues);

  // Link annotation to the extract note
  await db
    .update(schema.annotations)
    .set({ noteId: note.id, updatedAt: new Date() })
    .where(eq(schema.annotations.id, annotation.id));

  const citRows = await db
    .select()
    .from(schema.citations)
    .where(eq(schema.citations.id, citationId))
    .limit(1);

  return { note, citation: citRows[0] };
}
