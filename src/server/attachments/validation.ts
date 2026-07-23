import path from "node:path";

const INLINE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

/**
 * Attachment records only ever point below the private attachment prefix. This
 * guards local filesystem reads if an old or manually edited record contains a
 * traversal path.
 */
export function isSafeAttachmentStoragePath(storagePath: string): boolean {
  if (!storagePath || storagePath.includes("\\") || path.posix.isAbsolute(storagePath)) {
    return false;
  }

  const normalized = path.posix.normalize(storagePath);
  return (
    normalized === storagePath &&
    normalized.startsWith("attachments/") &&
    !normalized.split("/").includes("..")
  );
}

export function contentDispositionType(mimeType: string): "inline" | "attachment" {
  return INLINE_MIME_TYPES.has(mimeType) ? "inline" : "attachment";
}

export function contentDispositionFileName(fileName: string): string {
  const normalized = fileName.normalize("NFKC").replace(/[\x00-\x1F\x7F"\\;]/g, "_");
  return normalized.trim().slice(0, 150) || "attachment";
}

export function hasExpectedFileSignature(mimeType: string, data: Buffer): boolean {
  if (data.length === 0) return false;

  switch (mimeType) {
    case "image/png":
      return data.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    case "image/jpeg":
      return data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    case "image/gif":
      return data.subarray(0, 6).toString("ascii") === "GIF87a" || data.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/webp":
      return data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/svg+xml":
      return /^\s*(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(data.subarray(0, 4096).toString("utf8"));
    case "application/pdf":
      return data.subarray(0, 5).toString("ascii") === "%PDF-";
    case "text/plain":
    case "text/markdown":
      return !data.subarray(0, 512).includes(0); // Ensure non-binary UTF-8 text
    case "application/epub+zip":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    case "application/msword":
      return data.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"));
    default:
      return false;
  }
}
