import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  contentDispositionFileName,
  contentDispositionType,
  hasExpectedFileSignature,
  isSafeAttachmentStoragePath,
} from "./validation";

describe("attachment validation", () => {
  test("accepts only normalized paths under the private attachment prefix", () => {
    assert.equal(isSafeAttachmentStoragePath("attachments/user/2026/07/file.png"), true);
    assert.equal(isSafeAttachmentStoragePath("../local.db"), false);
    assert.equal(isSafeAttachmentStoragePath("attachments/user/../../local.db"), false);
    assert.equal(isSafeAttachmentStoragePath("attachments\\user\\file.png"), false);
  });

  test("forces SVG to download and prevents header injection through file names", () => {
    assert.equal(contentDispositionType("image/svg+xml"), "attachment");
    assert.equal(contentDispositionType("image/png"), "inline");
    assert.doesNotMatch(contentDispositionFileName('report\r\nX-Test: injected.svg'), /[\r\n]/);
  });

  test("rejects arbitrary bytes presented as a PNG", () => {
    assert.equal(hasExpectedFileSignature("image/png", Buffer.from("not an image")), false);
    assert.equal(hasExpectedFileSignature("image/png", Buffer.from("89504e470d0a1a0a", "hex")), true);
  });
});
