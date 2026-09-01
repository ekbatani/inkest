/**
 * High-performance compression and binary packing utilities for document persistence.
 * Uses native Web Streams (CompressionStream / DecompressionStream) with Deflate/Gzip
 * and zero external dependencies for maximum browser and server throughput.
 */

import type { DocumentModel } from "./types";

/**
 * Compresses a UTF-8 string into a Deflate-compressed Uint8Array.
 */
export async function compressText(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length === 0) {
    return new Uint8Array(0);
  }

  if (typeof CompressionStream !== "undefined") {
    try {
      const cs = new CompressionStream("deflate");
      const stream = new Blob([bytes as unknown as ArrayBufferView<ArrayBuffer>])
        .stream()
        .pipeThrough(cs);
      const response = new Response(stream);
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch {
      return bytes;
    }
  }

  // Fallback: uncompressed bytes
  return bytes;
}

/**
 * Decompresses a Deflate-compressed Uint8Array or ArrayBuffer back into a UTF-8 string.
 */
export async function decompressText(
  compressed: Uint8Array | ArrayBuffer,
): Promise<string> {
  const bytes = compressed instanceof Uint8Array ? compressed : new Uint8Array(compressed);

  if (bytes.length === 0) {
    return "";
  }

  if (typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate");
      const stream = new Blob([bytes as unknown as ArrayBufferView<ArrayBuffer>])
        .stream()
        .pipeThrough(ds);
      const response = new Response(stream);
      const arrayBuffer = await response.arrayBuffer();
      return new TextDecoder().decode(arrayBuffer);
    } catch {
      // If decompression fails (e.g. uncompressed raw bytes), decode as plain text
      try {
        return new TextDecoder().decode(bytes);
      } catch {
        return "";
      }
    }
  }

  return new TextDecoder().decode(bytes);
}

/**
 * Packs a DocumentModel into a compressed snapshot buffer.
 */
export async function serializeAndCompressModel(
  model: DocumentModel,
): Promise<Uint8Array> {
  const payload = JSON.stringify({
    id: model.id,
    version: model.version,
    source: model.source,
    stats: model.stats,
  });

  return compressText(payload);
}

/**
 * Decompresses and deserializes a snapshot buffer into a DocumentModel.
 */
export async function decompressAndDeserializeModel(
  compressed: Uint8Array | ArrayBuffer,
  parseFunc: (source: string, id: string, version: number) => DocumentModel,
): Promise<DocumentModel> {
  const jsonStr = await decompressText(compressed);
  const data = JSON.parse(jsonStr);
  return parseFunc(data.source, data.id, data.version);
}

/**
 * Compresses an arbitrary serializable payload into a Deflate-compressed Uint8Array.
 */
export async function compressPayload(data: unknown): Promise<Uint8Array> {
  const json = JSON.stringify(data);
  return compressText(json);
}

/**
 * Decompresses a Deflate-compressed buffer or Uint8Array back into parsed JSON data.
 */
export async function decompressPayload<T = unknown>(
  buffer: ArrayBuffer | Uint8Array,
): Promise<T> {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const text = await decompressText(bytes);
  return JSON.parse(text) as T;
}

/**
 * Converts a Uint8Array into a Base64-encoded string safely in any environment.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts a Base64-encoded string back into a Uint8Array.
 */
export function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compresses a UTF-8 string into a Base64-encoded string.
 */
export async function compressToBase64(text: string): Promise<string> {
  const compressed = await compressText(text);
  return bytesToBase64(compressed);
}

/**
 * Decompresses a Base64-encoded Deflate string back into a UTF-8 string.
 */
export async function decompressFromBase64(base64: string): Promise<string> {
  const bytes = base64ToBytes(base64);
  return decompressText(bytes);
}
