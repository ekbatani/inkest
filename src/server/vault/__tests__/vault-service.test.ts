import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  createVaultItemSchema,
  MAX_VAULT_FILENAME_LENGTH,
  MAX_VAULT_CONTENT_LENGTH,
  MAX_VAULT_CIPHERTEXT_LENGTH,
  vaultCategoryEnum,
} from "../vault-service";

describe("vault service validation & limits", () => {
  test("defines expected limits for file name and secret text area", () => {
    assert.equal(MAX_VAULT_FILENAME_LENGTH, 255);
    assert.equal(MAX_VAULT_CONTENT_LENGTH, 50_000);
    assert.equal(MAX_VAULT_CIPHERTEXT_LENGTH, 200_000);
  });

  test("validates valid secret file items with various categories", () => {
    for (const category of vaultCategoryEnum) {
      const parsed = createVaultItemSchema.safeParse({
        title: `.env.${category}`,
        category,
        ciphertext: "abcd1234ef56",
        iv: "1234567890abcdef12345678",
        salt: "abcdef1234567890abcdef1234567890",
      });
      assert.equal(parsed.success, true);
      if (parsed.success) {
        assert.equal(parsed.data.title, `.env.${category}`);
        assert.equal(parsed.data.category, category);
      }
    }
  });

  test("trims and accepts multi-extension secret file names", () => {
    const parsed = createVaultItemSchema.safeParse({
      title: "  docker-compose.secret.prod.yml  ",
      category: "key",
      ciphertext: "a1b2c3d4",
      iv: "1234567890abcdef",
      salt: "1234567890abcdef",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.title, "docker-compose.secret.prod.yml");
    }
  });

  test("rejects empty or whitespace-only file names", () => {
    const parsedEmpty = createVaultItemSchema.safeParse({
      title: "",
      category: "secret_note",
      ciphertext: "a1b2c3d4",
      iv: "1234567890abcdef",
      salt: "1234567890abcdef",
    });
    assert.equal(parsedEmpty.success, false);

    const parsedWhitespace = createVaultItemSchema.safeParse({
      title: "   ",
      category: "secret_note",
      ciphertext: "a1b2c3d4",
      iv: "1234567890abcdef",
      salt: "1234567890abcdef",
    });
    assert.equal(parsedWhitespace.success, false);
  });

  test("rejects file names exceeding MAX_VAULT_FILENAME_LENGTH", () => {
    const longName = "a".repeat(MAX_VAULT_FILENAME_LENGTH + 1);
    const parsed = createVaultItemSchema.safeParse({
      title: longName,
      category: "secret_note",
      ciphertext: "a1b2c3d4",
      iv: "1234567890abcdef",
      salt: "1234567890abcdef",
    });
    assert.equal(parsed.success, false);
  });

  test("rejects invalid categories", () => {
    const parsed = createVaultItemSchema.safeParse({
      title: "secret.txt",
      category: "unsupported_category" as unknown as "secret_note",
      ciphertext: "a1b2c3d4",
      iv: "1234567890abcdef",
      salt: "1234567890abcdef",
    });
    assert.equal(parsed.success, false);
  });

  test("rejects ciphertext payload exceeding MAX_VAULT_CIPHERTEXT_LENGTH", () => {
    const oversizedCiphertext = "a".repeat(MAX_VAULT_CIPHERTEXT_LENGTH + 1);
    const parsed = createVaultItemSchema.safeParse({
      title: "large_payload.bin",
      category: "secret_note",
      ciphertext: oversizedCiphertext,
      iv: "1234567890abcdef",
      salt: "1234567890abcdef",
    });
    assert.equal(parsed.success, false);
  });

  test("rejects missing IV or Salt", () => {
    const missingIv = createVaultItemSchema.safeParse({
      title: "secret.txt",
      category: "secret_note",
      ciphertext: "a1b2c3d4",
      iv: "",
      salt: "1234567890abcdef",
    });
    assert.equal(missingIv.success, false);

    const missingSalt = createVaultItemSchema.safeParse({
      title: "secret.txt",
      category: "secret_note",
      ciphertext: "a1b2c3d4",
      iv: "1234567890abcdef",
      salt: "",
    });
    assert.equal(missingSalt.success, false);
  });
});
