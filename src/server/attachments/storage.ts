import path from "node:path";
import fs from "node:fs/promises";
import { createHash, createHmac } from "node:crypto";
import { isSafeAttachmentStoragePath } from "@/server/attachments/validation";

const LOCAL_STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT ?? "./storage";
const STORAGE_DRIVER = (process.env.ATTACHMENT_STORAGE_DRIVER ?? "local").toLowerCase();

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT?.replace(/\/+$/, "");
const MINIO_BUCKET = process.env.MINIO_BUCKET;
const MINIO_REGION = process.env.MINIO_REGION ?? "us-east-1";
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;

function sha256Hex(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .map((part) => encodeRfc3986(part))
    .join("/");
}

function getMinioConfig() {
  if (!MINIO_ENDPOINT || !MINIO_BUCKET || !MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
    throw new Error(
      "MinIO storage requires MINIO_ENDPOINT, MINIO_BUCKET, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY.",
    );
  }

  const endpoint = new URL(MINIO_ENDPOINT);

  return {
    endpoint,
    bucket: MINIO_BUCKET,
    region: MINIO_REGION,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
  };
}

function assertSafeStoragePath(storagePath: string) {
  if (!isSafeAttachmentStoragePath(storagePath)) {
    throw new Error("Invalid attachment storage path.");
  }
}

function getLocalFilePath(storagePath: string) {
  assertSafeStoragePath(storagePath);
  const root = path.resolve(LOCAL_STORAGE_ROOT);
  const filePath = path.resolve(root, ...storagePath.split("/"));
  if (!filePath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid attachment storage path.");
  }
  return filePath;
}

function buildMinioRequest(
  method: "PUT" | "GET" | "DELETE",
  objectKey: string,
  body: Buffer | null,
  contentType?: string,
) {
  assertSafeStoragePath(objectKey);
  const config = getMinioConfig();
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body ?? "");
  const canonicalUri = `/${encodeRfc3986(config.bucket)}/${encodeObjectKey(objectKey)}`;
  const host = config.endpoint.host;

  const headers = new Headers();
  headers.set("host", host);
  headers.set("x-amz-content-sha256", payloadHash);
  headers.set("x-amz-date", amzDate);
  if (contentType) {
    headers.set("content-type", contentType);
  }

  const canonicalHeaders = Array.from(headers.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}:${value.trim()}\n`)
    .join("");
  const signedHeaders = Array.from(headers.keys())
    .sort((left, right) => left.localeCompare(right))
    .join(";");

  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(
      hmac(`AWS4${config.secretKey}`, dateStamp),
      config.region,
    ),
    "s3",
  );
  const signature = createHmac("sha256", hmac(signingKey, "aws4_request"))
    .update(stringToSign)
    .digest("hex");

  headers.set(
    "authorization",
    [
      `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", "),
  );

  const url = new URL(canonicalUri, config.endpoint);
  return { url, headers };
}

async function fetchMinio(
  method: "PUT" | "GET" | "DELETE",
  objectKey: string,
  body: Buffer | null,
  contentType?: string,
) {
  const { url, headers } = buildMinioRequest(method, objectKey, body, contentType);
  return fetch(url, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    cache: "no-store",
  });
}

export async function writeAttachmentData(
  storagePath: string,
  data: Buffer,
  mimeType: string,
) {
  if (STORAGE_DRIVER === "minio") {
    const response = await fetchMinio("PUT", storagePath, data, mimeType);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MinIO upload failed (${response.status}): ${text}`);
    }
    return;
  }

  const filePath = getLocalFilePath(storagePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function readAttachmentData(storagePath: string): Promise<Buffer | null> {
  if (STORAGE_DRIVER === "minio") {
    const response = await fetchMinio("GET", storagePath, null);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MinIO download failed (${response.status}): ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const filePath = getLocalFilePath(storagePath);
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteAttachmentData(storagePath: string) {
  if (STORAGE_DRIVER === "minio") {
    const response = await fetchMinio("DELETE", storagePath, null);
    if (response.status === 404) {
      return;
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`MinIO delete failed (${response.status}): ${text}`);
    }
    return;
  }

  const filePath = getLocalFilePath(storagePath);
  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be gone.
  }
}
