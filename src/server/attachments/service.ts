import { eq, and } from "drizzle-orm";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { randomId } from "@/lib/slug";
import type { Attachment } from "@/server/db/schema";
import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";

const STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT ?? "./storage";
const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

const ALLOWED_TYPES = (
  process.env.ALLOWED_UPLOAD_TYPES ??
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
).split(",");

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
): { dir: string; filePath: string; relativePath: string } {
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
  const dir = path.join(STORAGE_ROOT, "attachments", userId, year, month);
  const filePath = path.join(dir, `${attachmentId}-${safeName}`);
  return { dir, filePath, relativePath };
}

export async function saveLocalAttachment(
  file: File,
): Promise<{ attachment: Attachment; markdown: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  if (file.size > MAX_UPLOAD_SIZE) {
    return { error: `File too large. Max ${MAX_UPLOAD_SIZE_MB}MB.` };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: `File type ${file.type} not allowed.` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const attachmentId = randomId();
  const originalName = file.name || `upload-${attachmentId.slice(0, 8)}`;
  const ext = path.extname(originalName);
  const fileName = `${attachmentId.slice(0, 8)}${ext}`;

  const { dir, filePath, relativePath } = getStoragePath(
    user.id,
    attachmentId,
    fileName,
  );

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  await db.insert(schema.attachments).values({
    id: attachmentId,
    userId: user.id,
    noteId: null,
    fileName,
    originalName,
    mimeType: file.type,
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
    mimeType: file.type,
    sizeBytes: file.size,
    width: null,
    height: null,
    storagePath: relativePath,
    publicPath: null,
    checksum,
    createdAt: new Date(),
  };

  const markdown = `![${originalName}](/api/attachments/${attachmentId})`;

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
): Promise<{ data: Buffer; mimeType: string } | { error: string; status: number }> {
  const attachment = await getAttachmentForUser(id);
  if (!attachment) {
    return { error: "Not found", status: 404 };
  }

  const filePath = path.join(STORAGE_ROOT, attachment.storagePath);
  try {
    const data = await fs.readFile(filePath);
    return { data, mimeType: attachment.mimeType };
  } catch {
    return { error: "File not found on disk", status: 404 };
  }
}

export async function deleteAttachment(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const attachment = await getAttachmentForUser(id);
  if (!attachment) return;

  const filePath = path.join(STORAGE_ROOT, attachment.storagePath);
  try {
    await fs.unlink(filePath);
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
