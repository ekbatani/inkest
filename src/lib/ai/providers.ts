export const AI_PROVIDER_IDS = ["openai", "openrouter", "custom"] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiProviderDefinition = {
  id: AiProviderId;
  label: string;
  defaultBaseURL: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
};

export const AI_PROVIDERS: readonly AiProviderDefinition[] = [
  {
    id: "openai",
    label: "OpenAI",
    defaultBaseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyPlaceholder: "sk-...",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
    apiKeyPlaceholder: "sk-or-...",
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    defaultBaseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    apiKeyPlaceholder: "API key",
  },
] as const;

export function getAiProviderDefinition(
  id: AiProviderId | string | null | undefined,
): AiProviderDefinition {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[0];
}
