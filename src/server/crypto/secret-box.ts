import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const SALT = Buffer.from("inkest-settings-v1");
const INFO = Buffer.from("ai-api-key");
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET must be set to store per-user AI API keys securely.",
    );
  }
  return Buffer.from(hkdfSync("sha256", secret, SALT, INFO, 32));
}

/** AES-256-GCM encrypt, keyed from NEXTAUTH_SECRET. Values without the `enc:v1:` prefix are
 * treated as legacy plaintext by `decryptSecret` so existing stored keys keep working. */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
