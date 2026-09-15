import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { userSettingsSchema, DEFAULTS } from "../settings-service";

describe("User Settings Schema & Defaults", () => {
  test("DEFAULTS includes agentHarness configuration", () => {
    assert.ok(DEFAULTS.agentHarness, "DEFAULTS should include agentHarness");
    assert.equal(DEFAULTS.agentHarness?.enabled, true);
    assert.equal(DEFAULTS.agentHarness?.maxLoopSteps, 6);
    assert.equal(DEFAULTS.agentHarness?.allowModifyNotes, true);
    assert.equal(DEFAULTS.agentHarness?.allowCreateTasks, true);
  });

  test("userSettingsSchema parses valid agentHarness settings with API token", () => {
    const raw = {
      agentHarness: {
        enabled: true,
        apiToken: "ink_agent_1234567890abcdef1234567890abcdef",
        maxLoopSteps: 8,
        allowModifyNotes: true,
        allowCreateTasks: false,
      },
    };

    const parsed = userSettingsSchema.safeParse(raw);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.agentHarness?.apiToken, "ink_agent_1234567890abcdef1234567890abcdef");
      assert.equal(parsed.data.agentHarness?.enabled, true);
      assert.equal(parsed.data.agentHarness?.maxLoopSteps, 8);
      assert.equal(parsed.data.agentHarness?.allowCreateTasks, false);
    }
  });

  test("userSettingsSchema rejects invalid maxLoopSteps", () => {
    const raw = {
      agentHarness: {
        maxLoopSteps: 50,
      },
    };

    const parsed = userSettingsSchema.safeParse(raw);
    assert.equal(parsed.success, false);
  });

  test("DEFAULTS includes editor autocorrect enabled by default", () => {
    assert.equal(DEFAULTS.editor?.autocorrect, true);
    assert.equal(DEFAULTS.editor?.spellcheck, true);
  });

  test("userSettingsSchema parses and preserves editor autocorrect setting", () => {
    const disabled = userSettingsSchema.safeParse({
      editor: { autocorrect: false },
    });
    assert.equal(disabled.success, true);
    if (disabled.success) {
      assert.equal(disabled.data.editor?.autocorrect, false);
    }

    const enabled = userSettingsSchema.safeParse({
      editor: { autocorrect: true },
    });
    assert.equal(enabled.success, true);
    if (enabled.success) {
      assert.equal(enabled.data.editor?.autocorrect, true);
    }
  });
});
