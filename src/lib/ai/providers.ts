export const AI_PROVIDER_IDS = [
  "openai",
  "openrouter",
  "opencode",
  "ollama",
  "custom",
] as const;

export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export type AiProviderDefinition = {
  id: AiProviderId;
  label: string;
  defaultBaseURL: string;
  defaultModel: string;
  apiKeyPlaceholder: string;
  /** Local gateways (e.g. Ollama) don't check the key — any placeholder works. */
  apiKeyOptional?: boolean;
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
    id: "opencode",
    label: "opencode Zen",
    defaultBaseURL: "https://opencode.ai/zen/v1",
    defaultModel: "deepseek-v4-flash-free",
    apiKeyPlaceholder: "opencode Zen API key",
  },
  {
    id: "ollama",
    label: "Ollama (local, self-hosted)",
    defaultBaseURL: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    apiKeyPlaceholder: "not required for local Ollama",
    apiKeyOptional: true,
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
