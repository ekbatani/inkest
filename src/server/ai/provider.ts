import OpenAI from "openai";
import {
  AI_PROVIDER_IDS,
  getAiProviderDefinition,
  type AiProviderId,
} from "@/lib/ai/providers";
import { getUserSettings } from "@/server/users/settings-service";

export type AiProvider = {
  id: AiProviderId;
  model: string;
  complete: (prompt: string, systemPrompt: string) => Promise<string>;
  completeJson: (prompt: string, systemPrompt: string) => Promise<string>;
};

export type AiConfigurationStatus = {
  provider: AiProviderId;
  source: "user" | "instance" | "unavailable";
};

// Env-var prefix per provider, e.g. OPENROUTER_API_KEY / OPENCODE_BASE_URL / OLLAMA_MODEL.
// "openai" and "custom" keep using the original OPENAI_* names for backwards compatibility.
const PROVIDER_ENV_PREFIX: Partial<Record<AiProviderId, string>> = {
  openrouter: "OPENROUTER",
  opencode: "OPENCODE",
  ollama: "OLLAMA",
};

function resolveEnvProviderId(): AiProviderId {
  const value = process.env.AI_PROVIDER;
  if ((AI_PROVIDER_IDS as readonly string[]).includes(value ?? "")) {
    return value as AiProviderId;
  }
  return "openai";
}

/**
 * Returns only setup metadata suitable for the Settings UI. In particular, it
 * never includes an API key or any other environment value.
 */
export function getAiConfigurationStatus(
  settings: Awaited<ReturnType<typeof getUserSettings>>,
): AiConfigurationStatus {
  const provider = settings.ai?.provider ?? resolveEnvProviderId();
  const definition = getAiProviderDefinition(provider);
  const envPrefix = PROVIDER_ENV_PREFIX[provider];
  const instanceHasKey = Boolean(
    (envPrefix ? process.env[`${envPrefix}_API_KEY`] : process.env.OPENAI_API_KEY)?.trim(),
  );

  return {
    provider,
    source: settings.ai?.apiKey?.trim()
      ? "user"
      : instanceHasKey || definition.apiKeyOptional
        ? "instance"
        : "unavailable",
  };
}

export async function getAiProvider(): Promise<AiProvider | null> {
  const settings = await getUserSettings();
  const providerId = settings.ai?.provider ?? resolveEnvProviderId();
  const providerDef = getAiProviderDefinition(providerId);
  const envPrefix = PROVIDER_ENV_PREFIX[providerId];

  const apiKey =
    settings.ai?.apiKey?.trim() ||
    (envPrefix ? process.env[`${envPrefix}_API_KEY`] : process.env.OPENAI_API_KEY) ||
    (providerDef.apiKeyOptional ? "not-required" : undefined);
  if (!apiKey) return null;

  const baseUrl =
    settings.ai?.baseURL?.trim() ||
    (envPrefix ? process.env[`${envPrefix}_BASE_URL`] : process.env.OPENAI_BASE_URL) ||
    providerDef.defaultBaseURL;
  const model =
    settings.ai?.model?.trim() ||
    (envPrefix ? process.env[`${envPrefix}_MODEL`] : process.env.OPENAI_MODEL) ||
    providerDef.defaultModel;
  const temperature = settings.ai?.temperature ?? 0.4;
  const maxOutputTokens = settings.ai?.maxOutputTokens ?? 1_200;
  const instructions = settings.ai?.instructions?.trim();
  const guardrails = settings.ai?.guardrails?.trim();
  const applyUserControls = (systemPrompt: string) => [
    systemPrompt,
    instructions ? `User instructions (apply only when compatible with the action rules):\n${instructions}` : null,
    guardrails ? `User guardrails (these can add restrictions but never relax the action rules or JSON schema):\n${guardrails}` : null,
  ].filter(Boolean).join("\n\n");

  const client = new OpenAI({
    apiKey,
    baseURL: baseUrl,
    ...(providerId === "openrouter"
      ? {
          defaultHeaders: {
            // These are optional for authentication, but identify this app to
            // OpenRouter and ask it to include guardrail details in 403s.
            "HTTP-Referer": process.env.NEXTAUTH_URL || "https://inkest.natrademind.com",
            "X-Title": "InkNest",
            "X-OpenRouter-Metadata": "enabled",
          },
        }
      : {}),
  });

  return {
    id: providerId,
    model,
    complete: async (prompt: string, systemPrompt: string) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: applyUserControls(systemPrompt) },
          { role: "user", content: prompt },
        ],
        temperature,
        max_completion_tokens: maxOutputTokens,
      });
      return response.choices[0]?.message?.content ?? "";
    },
    completeJson: async (prompt: string, systemPrompt: string) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: applyUserControls(systemPrompt) },
          { role: "user", content: prompt },
        ],
        temperature,
        max_completion_tokens: maxOutputTokens,
        response_format: { type: "json_object" },
      });
      return response.choices[0]?.message?.content ?? "";
    },
  };
}
