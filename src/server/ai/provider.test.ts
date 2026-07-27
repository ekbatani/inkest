import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AI_PROVIDER_IDS, getAiProviderDefinition } from "@/lib/ai/providers";

describe("AI provider configuration", () => {
  test("includes nvidia as a supported provider ID", () => {
    assert.equal(AI_PROVIDER_IDS.includes("nvidia"), true);
  });

  test("returns correct default configuration for nvidia provider", () => {
    const def = getAiProviderDefinition("nvidia");
    assert.equal(def.id, "nvidia");
    assert.equal(def.label, "NVIDIA Build");
    assert.equal(def.defaultBaseURL, "https://integrate.api.nvidia.com/v1");
    assert.equal(def.defaultModel, "meta/llama-3.3-70b-instruct");
    assert.equal(def.apiKeyPlaceholder, "nvapi-...");
  });
});
