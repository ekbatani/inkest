import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { decryptSecret, encryptSecret, shouldReencryptSecret } from "./secret-box";

const originalKeyRing = process.env.AI_CREDENTIAL_ENCRYPTION_KEYS;

afterEach(() => {
  if (originalKeyRing === undefined) delete process.env.AI_CREDENTIAL_ENCRYPTION_KEYS;
  else process.env.AI_CREDENTIAL_ENCRYPTION_KEYS = originalKeyRing;
});

describe("user credential encryption", () => {
  test("encrypts with the active key and decrypts without exposing plaintext", () => {
    process.env.AI_CREDENTIAL_ENCRYPTION_KEYS = "current:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const encrypted = encryptSecret("provider-secret");
    assert.ok(encrypted.startsWith("enc:v2:current:"));
    assert.ok(!encrypted.includes("provider-secret"));
    assert.equal(decryptSecret(encrypted), "provider-secret");
    assert.equal(shouldReencryptSecret(encrypted), false);
  });

  test("keeps an old key available only while records are re-encrypted", () => {
    process.env.AI_CREDENTIAL_ENCRYPTION_KEYS = "old:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const oldCiphertext = encryptSecret("provider-secret");
    process.env.AI_CREDENTIAL_ENCRYPTION_KEYS = "new://///////////////////wAAAAAAAAAAAAAAAAAAAAA=,old:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    assert.equal(decryptSecret(oldCiphertext), "provider-secret");
    assert.equal(shouldReencryptSecret(oldCiphertext), true);
    assert.ok(encryptSecret(decryptSecret(oldCiphertext)).startsWith("enc:v2:new:"));
  });
});
