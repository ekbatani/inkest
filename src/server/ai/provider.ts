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

  const client = new OpenAI({ apiKey, baseURL: baseUrl });

  return {
    id: providerId,
    model,
    complete: async (prompt: string, systemPrompt: string) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content ?? "";
    },
    completeJson: async (prompt: string, systemPrompt: string) => {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      });
      return response.choices[0]?.message?.content ?? "";
    },
  };
}
