import assert from "node:assert/strict";
import { describe, test, beforeEach, afterEach } from "node:test";
import { telegramSettingsSchema } from "../../users/settings-service";
import { telegramBotToken, getEffectiveTelegramBotToken } from "../telegram";

describe("Telegram Settings Schema", () => {
  test("validates a complete telegram settings object", () => {
    const valid = {
      botToken: "123456789:ABCdefGhIJKlmNoPQRstuVWXyz",
      botUsername: "MyInkestBot",
      botName: "Inkest Bot",
      webhookUrl: "https://inkest.example.com/api/telegram/webhook",
      webhookSecret: "secret123",
      webhookConfiguredAt: 1700000000000,
    };
    const parsed = telegramSettingsSchema.safeParse(valid);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.botUsername, "MyInkestBot");
      assert.equal(parsed.data.webhookUrl, "https://inkest.example.com/api/telegram/webhook");
    }
  });

  test("permits empty or partial telegram settings", () => {
    const parsed = telegramSettingsSchema.safeParse({});
    assert.equal(parsed.success, true);
  });

  test("rejects invalid webhook URLs", () => {
    const invalid = {
      webhookUrl: "not-a-valid-url",
    };
    const parsed = telegramSettingsSchema.safeParse(invalid);
    assert.equal(parsed.success, false);
  });
});

describe("Telegram Bot Token Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("returns null when no token is configured in env or settings", async () => {
    assert.equal(telegramBotToken(), null);
    const effective = await getEffectiveTelegramBotToken("non-existent-user");
    assert.equal(effective, null);
  });

  test("resolves fallback token from TELEGRAM_BOT_TOKEN env variable", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "env-token-123";
    assert.equal(telegramBotToken(), "env-token-123");
    const effective = await getEffectiveTelegramBotToken("non-existent-user");
    assert.equal(effective, "env-token-123");
  });
});
