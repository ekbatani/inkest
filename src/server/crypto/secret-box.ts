import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const LEGACY_SALT = Buffer.from("inkest-settings-v1");
const LEGACY_INFO = Buffer.from("ai-api-key");
const LEGACY_PREFIX = "enc:v1:";
const PREFIX = "enc:v2:";
const AAD = Buffer.from("inkest:user-credential:v2");
const KEY_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

type EncryptionKey = { id: string; key: Buffer };

function invalidKeyRing(): never {
  throw new Error("AI_CREDENTIAL_ENCRYPTION_KEYS must contain one or more id:base64-encoded 32-byte keys.");
}

function decodeKey(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) invalidKeyRing();
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) invalidKeyRing();
  return key;
}

/** First key encrypts; remaining keys permit a safe staged rotation. */
function getKeyRing(): EncryptionKey[] {
  const configured = process.env.AI_CREDENTIAL_ENCRYPTION_KEYS?.trim();
  if (!configured) {
    throw new Error("AI_CREDENTIAL_ENCRYPTION_KEYS must be configured before storing user credentials.");
  }
  const ids = new Set<string>();
  return configured.split(",").map((entry) => {
    const separator = entry.indexOf(":");
    const id = entry.slice(0, separator).trim();
    const encodedKey = entry.slice(separator + 1).trim();
    if (separator < 1 || !KEY_ID_RE.test(id) || ids.has(id)) invalidKeyRing();
    ids.add(id);
    return { id, key: decodeKey(encodedKey) };
  });
}

function decryptWithKey(value: string, key: Buffer, aad?: Buffer): string {
  const raw = Buffer.from(value, "base64");
  if (raw.length < 29) throw new Error("Stored credential is malformed.");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  if (aad) decipher.setAAD(aad);
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

function getLegacyKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("A legacy credential cannot be migrated without NEXTAUTH_SECRET.");
  return Buffer.from(hkdfSync("sha256", secret, LEGACY_SALT, LEGACY_INFO, 32));
}

export function encryptSecret(plaintext: string): string {
  const { id, key } = getKeyRing()[0]!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(AAD);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${PREFIX}${id}:${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64")}`;
}

/** Legacy plaintext and v1 values are readable only to re-encrypt them on the next authenticated use. */
export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) {
    return value.startsWith(LEGACY_PREFIX)
      ? decryptWithKey(value.slice(LEGACY_PREFIX.length), getLegacyKey(), undefined)
      : value;
  }
  const separator = value.indexOf(":", PREFIX.length);
  if (separator < PREFIX.length + 1) throw new Error("Stored credential is malformed.");
  const key = getKeyRing().find((candidate) => candidate.id === value.slice(PREFIX.length, separator));
  if (!key) throw new Error("The encryption key for this credential is unavailable.");
  return decryptWithKey(value.slice(separator + 1), key.key, AAD);
}

export function shouldReencryptSecret(value: string): boolean {
  if (!value.startsWith(PREFIX)) return true;
  const separator = value.indexOf(":", PREFIX.length);
  return separator < PREFIX.length + 1 || value.slice(PREFIX.length, separator) !== getKeyRing()[0]?.id;
}
