import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AI_PROVIDER_IDS, getAiProviderDefinition } from "@/lib/ai/providers";
import { normalizeAiBaseUrl } from "@/server/ai/provider";
import { formatAiErrorMessage } from "@/server/ai/runner";

describe("AI provider configuration", () => {
  test("includes nvidia as a supported provider ID", () => {
    assert.equal(AI_PROVIDER_IDS.includes("nvidia"), true);
  });

  test("includes opencode-go as a supported provider ID", () => {
    assert.equal(AI_PROVIDER_IDS.includes("opencode-go"), true);
  });

  test("returns correct default configuration for opencode Zen provider", () => {
    const def = getAiProviderDefinition("opencode");
    assert.equal(def.id, "opencode");
    assert.equal(def.label, "opencode Zen");
    assert.equal(def.defaultBaseURL, "https://opencode.ai/zen/v1");
    assert.equal(def.defaultModel, "deepseek-v4-flash-free");
  });

  test("returns correct default configuration for opencode Go provider", () => {
    const def = getAiProviderDefinition("opencode-go");
    assert.equal(def.id, "opencode-go");
    assert.equal(def.label, "opencode Go");
    assert.equal(def.defaultBaseURL, "https://opencode.ai/zen/go/v1");
    assert.equal(def.defaultModel, "deepseek-v4-flash");
  });

  test("normalizes opencode base URLs to include /v1 endpoint", () => {
    assert.equal(
      normalizeAiBaseUrl("opencode", "https://opencode.ai"),
      "https://opencode.ai/zen/v1",
    );
    assert.equal(
      normalizeAiBaseUrl("opencode", "https://opencode.ai/zen"),
      "https://opencode.ai/zen/v1",
    );
    assert.equal(
      normalizeAiBaseUrl("opencode-go", "https://opencode.ai"),
      "https://opencode.ai/zen/go/v1",
    );
    assert.equal(
      normalizeAiBaseUrl("opencode-go", "https://opencode.ai/zen/go"),
      "https://opencode.ai/zen/go/v1",
    );
    assert.equal(
      normalizeAiBaseUrl("opencode-go", "https://opencode.ai/go"),
      "https://opencode.ai/zen/go/v1",
    );
  });

  test("formats HTML error responses into clean human-readable messages", () => {
    const htmlError = new Error(
      "404 <!DOCTYPE html><html lang=\"en\"><head><title>Not Found | opencode</title></head><body>404</body></html>",
    );
    const formatted = formatAiErrorMessage(htmlError);
    assert.match(formatted, /HTTP 404/);
    assert.match(formatted, /https:\/\/opencode.ai\/zen\/go\/v1/);
    assert.equal(formatted.includes("<!DOCTYPE html>"), false);
  });
});
