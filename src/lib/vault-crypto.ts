/**
 * Zero-Knowledge Vault WebCrypto Utilities.
 * All encryption & decryption occurs strictly client-side. The server strictly receives
 * and stores opaque ciphertext blobs, initialization vectors (IVs), and salts.
 */

async function getPBKDF2Key(masterPassword: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
}

export async function deriveVaultKey(
  masterPassword: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await getPBKDF2Key(masterPassword);
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function encryptVaultSecret(
  secretText: string,
  masterPassword: string,
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(masterPassword, salt);

  const enc = new TextEncoder();
  const encryptedBuf = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    enc.encode(secretText),
  );

  return {
    ciphertext: bufferToHex(encryptedBuf),
    iv: bufferToHex(iv.buffer as ArrayBuffer),
    salt: bufferToHex(salt.buffer as ArrayBuffer),
  };
}

export async function decryptVaultSecret(
  ciphertextHex: string,
  ivHex: string,
  saltHex: string,
  masterPassword: string,
): Promise<string> {
  const salt = hexToBuffer(saltHex);
  const iv = hexToBuffer(ivHex);
  const ciphertext = hexToBuffer(ciphertextHex);
  const key = await deriveVaultKey(masterPassword, salt);

  const decryptedBuf = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ciphertext),
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuf);
}
