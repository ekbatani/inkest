/**
 * High-performance compression and binary packing utilities for document persistence.
 * Uses browser-native CompressionStream (Deflate/Gzip) with zero external dependencies.
 */

import type { DocumentModel } from "./types";

/**
 * Compresses a UTF-8 string into a Deflate-compressed Uint8Array.
 */
export async function compressText(text: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(text);

  if (typeof CompressionStream !== "undefined") {
    const cs = new CompressionStream("deflate");
    const writer = cs.writable.getWriter();
    writer.write(bytes);
    writer.close();

    const response = new Response(cs.readable);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  // Fallback: uncompressed bytes
  return bytes;
}

/**
 * Decompresses a Deflate-compressed Uint8Array back into a UTF-8 string.
 */
export async function decompressText(compressed: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate");
      const writer = ds.writable.getWriter();
      writer.write(compressed as unknown as ArrayBufferView<ArrayBuffer>);
      writer.close();

      const response = new Response(ds.readable);
      const arrayBuffer = await response.arrayBuffer();
      return new TextDecoder().decode(arrayBuffer);
    } catch {
      // If decompression fails, try plain text decode (e.g. uncompressed fallback)
      return new TextDecoder().decode(compressed);
    }
  }

  return new TextDecoder().decode(compressed);
}

/**
 * Packs a DocumentModel into a compressed snapshot buffer.
 */
export async function serializeAndCompressModel(model: DocumentModel): Promise<Uint8Array> {
  // Only serialize essential fields (source, id, version, stats)
  // Derived block arrays can be rebuilt or re-parsed in milliseconds on load.
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
  compressed: Uint8Array,
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

