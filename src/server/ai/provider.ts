import OpenAI from "openai";
import {
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

function resolveEnvProviderId(): AiProviderId {
  const value = process.env.AI_PROVIDER;
  if (value === "openrouter" || value === "custom") return value;
  return "openai";
}

export async function getAiProvider(): Promise<AiProvider | null> {
  const settings = await getUserSettings();
  const providerId = settings.ai?.provider ?? resolveEnvProviderId();
  const providerDef = getAiProviderDefinition(providerId);

  const apiKey =
    settings.ai?.apiKey?.trim() ||
    (providerId === "openrouter"
      ? process.env.OPENROUTER_API_KEY
      : process.env.OPENAI_API_KEY);
  if (!apiKey) return null;

  const baseUrl =
    settings.ai?.baseURL?.trim() ||
    (providerId === "openrouter"
      ? process.env.OPENROUTER_BASE_URL
      : process.env.OPENAI_BASE_URL) ||
    providerDef.defaultBaseURL;
  const model =
    settings.ai?.model?.trim() ||
    (providerId === "openrouter"
      ? process.env.OPENROUTER_MODEL
      : process.env.OPENAI_MODEL) ||
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
