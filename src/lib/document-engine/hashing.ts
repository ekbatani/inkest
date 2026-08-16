/**
 * High-performance non-cryptographic hashing algorithms for document blocks and content addressing.
 * Optimized for maximum throughput (sub-microsecond execution) and zero allocations.
 */

const FNV_PRIME_32 = 0x01000193;
const FNV_OFFSET_32 = 0x811c9dc5;

/**
 * Computes 32-bit FNV-1a hash of a string, formatted as hex.
 * Extremely fast with low collision rate for block-sized strings.
 */
export function hashFnv1a32(str: string): string {
  let hash = FNV_OFFSET_32;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    hash ^= str.charCodeAt(i);
    // Multiply by FNV prime with 32-bit integer wrap
    hash = Math.imul(hash, FNV_PRIME_32);
  }

  // Convert to unsigned 32-bit hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Computes 64-bit FNV-1a style hash by combining two 32-bit seeds.
 */
export function hashFnv1a64(str: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x27d4eb2f;
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const code = str.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);

    h2 ^= code ^ (i & 0xff);
    h2 = Math.imul(h2, 0x5bd1e995);
  }

  const part1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const part2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${part1}${part2}`;
}

/**
 * Fast content hash specifically for DocumentBlock instances.
 * Incorporates block type and normalized content.
 */
export function hashBlock(type: string, content: string, extra = ""): string {
  return hashFnv1a64(`${type}:${extra}:${content}`);
}

/**
 * Fast content hash for Mermaid diagrams (code + theme + config).
 */
export function hashMermaid(code: string, theme = "default", config = ""): string {
  return hashFnv1a64(`mermaid:${theme}:${config}:${code.trim()}`);
}

/**
 * Web Crypto SHA-256 hash when cryptographic content addressing is required.
 */
export async function hashSha256(content: string | Uint8Array): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return hashFnv1a64(typeof content === "string" ? content : new TextDecoder().decode(content));
  }

  const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const digest = await crypto.subtle.digest("SHA-256", data as ArrayBufferView<ArrayBuffer>);
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
