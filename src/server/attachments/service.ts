import { eq, and } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { randomId } from "@/lib/slug";
import type { Attachment } from "@/server/db/schema";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  deleteAttachmentData,
  readAttachmentData,
  writeAttachmentData,
} from "@/server/attachments/storage";

const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = (
  process.env.ALLOWED_UPLOAD_TYPES ??
  [
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "application/pdf",
    "application/epub+zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ].join(",")
).split(",");

const FALLBACK_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".epub": "application/epub+zip",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function getStoragePath(
  userId: string,
  attachmentId: string,
  fileName: string,
): { relativePath: string } {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const safeName = sanitizeFileName(fileName);
  const relativePath = path.posix.join(
    "attachments",
    userId,
    year,
    month,
    `${attachmentId}-${safeName}`,
  );
  return { relativePath };
}

function resolveMimeType(file: File, originalName: string) {
  if (file.type && ALLOWED_TYPES.includes(file.type)) {
    return file.type;
  }

  const fallback = FALLBACK_MIME_TYPES[path.extname(originalName).toLowerCase()];
  if (fallback && ALLOWED_TYPES.includes(fallback)) {
    return fallback;
  }

  return null;
}

function buildAttachmentMarkdown(originalName: string, attachmentId: string, mimeType: string) {
  const href = `/api/attachments/${attachmentId}`;
  if (mimeType.startsWith("image/")) {
    return `![${originalName}](${href})`;
  }

  return `[${originalName}](${href})`;
}

export async function saveLocalAttachment(
  file: File,
): Promise<{ attachment: Attachment; markdown: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  if (file.size > MAX_UPLOAD_SIZE) {
    return { error: `File too large. Max ${MAX_UPLOAD_SIZE_MB}MB.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const attachmentId = randomId();
  const originalName = file.name || `upload-${attachmentId.slice(0, 8)}`;
  const mimeType = resolveMimeType(file, originalName);

  if (!mimeType) {
    return { error: `File type ${file.type || path.extname(originalName)} not allowed.` };
  }

  const ext = path.extname(originalName);
  const fileName = `${attachmentId.slice(0, 8)}${ext}`;

  const { relativePath } = getStoragePath(
    user.id,
    attachmentId,
    fileName,
  );

  await writeAttachmentData(relativePath, buffer, mimeType);

  await db.insert(schema.attachments).values({
    id: attachmentId,
    userId: user.id,
    noteId: null,
    fileName,
    originalName,
    mimeType,
    sizeBytes: file.size,
    storagePath: relativePath,
    checksum,
  });

  const attachment: Attachment = {
    id: attachmentId,
    userId: user.id,
    noteId: null,
    fileName,
    originalName,
    mimeType,
    sizeBytes: file.size,
    width: null,
    height: null,
    storagePath: relativePath,
    publicPath: null,
    checksum,
    createdAt: new Date(),
  };

  const markdown = buildAttachmentMarkdown(originalName, attachmentId, mimeType);

  return { attachment, markdown };
}

export async function getAttachmentForUser(
  id: string,
): Promise<Attachment | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await db
    .select()
    .from(schema.attachments)
    .where(
      and(
        eq(schema.attachments.id, id),
        eq(schema.attachments.userId, user.id),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function serveAttachment(
  id: string,
): Promise<
  | { data: Buffer; mimeType: string; fileName: string; originalName: string }
  | { error: string; status: number }
> {
  const attachment = await getAttachmentForUser(id);
  if (!attachment) {
    return { error: "Not found", status: 404 };
  }

  try {
    const data = await readAttachmentData(attachment.storagePath);
    if (!data) {
      return { error: "File not found in storage", status: 404 };
    }

    return {
      data,
      mimeType: attachment.mimeType,
      fileName: attachment.fileName,
      originalName: attachment.originalName,
    };
  } catch {
    return { error: "File not found in storage", status: 404 };
  }
}

export async function deleteAttachment(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const attachment = await getAttachmentForUser(id);
  if (!attachment) return;

  try {
    await deleteAttachmentData(attachment.storagePath);
  } catch {
    // File may already be gone
  }

  await db
    .delete(schema.attachments)
    .where(
      and(
        eq(schema.attachments.id, id),
        eq(schema.attachments.userId, user.id),
      ),
    );
}
