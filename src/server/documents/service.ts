import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { randomId } from "@/lib/slug";
import type { Document as DocType } from "@/server/db/schema";
import { saveLocalAttachment, serveAttachment } from "@/server/attachments/service";

async function getContext() {
  const user = await getCurrentUser();
  if (!user) return null;
  const workspace = await getWorkspaceForUser(user.id);
  if (!workspace) return null;
  return { user, workspace };
}

export async function listDocuments(): Promise<DocType[]> {
  const ctx = await getContext();
  if (!ctx) return [];

  return db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.userId, ctx.user.id),
        eq(schema.documents.workspaceId, ctx.workspace.id),
      ),
    )
    .orderBy(desc(schema.documents.createdAt));
}

export async function getDocumentById(id: string): Promise<DocType | null> {
  const ctx = await getContext();
  if (!ctx) return null;

  const rows = await db
    .select()
    .from(schema.documents)
    .where(
      and(
        eq(schema.documents.id, id),
        eq(schema.documents.userId, ctx.user.id),
        eq(schema.documents.workspaceId, ctx.workspace.id),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function importDocument(
  file: File,
): Promise<{ document: DocType } | { error: string }> {
  const ctx = await getContext();
  if (!ctx) return { error: "Unauthorized" };

  const result = await saveLocalAttachment(file);
  if ("error" in result) {
    return { error: result.error };
  }

  const { attachment } = result;
  const docId = randomId();

  let fileType: "pdf" | "text" | "markdown" = "pdf";
  if (attachment.mimeType === "text/plain") {
    fileType = "text";
  } else if (attachment.mimeType === "text/markdown") {
    fileType = "markdown";
  }

  const newDoc: typeof schema.documents.$inferInsert = {
    id: docId,
    userId: ctx.user.id,
    workspaceId: ctx.workspace.id,
    attachmentId: attachment.id,
    title: attachment.originalName.replace(/\.[^/.]+$/, ""),
    fileType,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    pageCount: null,
    checksum: attachment.checksum,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.documents).values(newDoc);

  const doc = await getDocumentById(docId);
  if (!doc) return { error: "Failed to create document record" };

  return { document: doc };
}

export async function getDocumentContent(
  docId: string,
): Promise<{ content: string | Buffer; mimeType: string } | { error: string }> {
  const doc = await getDocumentById(docId);
  if (!doc || !doc.attachmentId) {
    return { error: "Document not found" };
  }

  const attachmentResult = await serveAttachment(doc.attachmentId);
  if ("error" in attachmentResult) {
    return { error: attachmentResult.error };
  }

  if (doc.fileType === "text" || doc.fileType === "markdown") {
    return {
      content: attachmentResult.data.toString("utf8"),
      mimeType: doc.mimeType,
    };
  }

  return {
    content: attachmentResult.data,
    mimeType: doc.mimeType,
  };
}

export async function deleteDocument(docId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const doc = await getDocumentById(docId);
  if (!doc) return false;

  await db
    .delete(schema.documents)
    .where(
      and(
        eq(schema.documents.id, docId),
        eq(schema.documents.userId, user.id),
      ),
    );

  return true;
}
