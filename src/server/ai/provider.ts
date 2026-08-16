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
  embeddingModel?: string;
  complete: (prompt: string, systemPrompt: string) => Promise<string>;
  completeJson: (prompt: string, systemPrompt: string) => Promise<string>;
  embed: (texts: string[]) => Promise<number[][]>;
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
  "opencode-go": "OPENCODE_GO",
  nvidia: "NVIDIA",
  ollama: "OLLAMA",
};

export function normalizeAiBaseUrl(providerId: AiProviderId, baseUrl: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return trimmed;

  if (providerId === "opencode" || providerId === "opencode-go") {
    const stripped = trimmed.replace(/\/+$/, "");
    if (
      stripped === "https://opencode.ai" ||
      stripped.startsWith("https://opencode.ai/")
    ) {
      return providerId === "opencode-go"
        ? "https://opencode.ai/zen/go/v1"
        : "https://opencode.ai/zen/v1";
    }
  }

  return trimmed;
}

function resolveEnvProviderId(): AiProviderId {
  const value = process.env.AI_PROVIDER;
  if ((AI_PROVIDER_IDS as readonly string[]).includes(value ?? "")) {
    return value as AiProviderId;
  }
  return "openai";
}

function getEnvValue(
  providerId: AiProviderId,
  keyType: "API_KEY" | "BASE_URL" | "MODEL",
): string | undefined {
  const envPrefix = PROVIDER_ENV_PREFIX[providerId];
  if (!envPrefix) return process.env[`OPENAI_${keyType}`]?.trim();

  const primary = process.env[`${envPrefix}_${keyType}`]?.trim();
  if (primary) return primary;

  // Fall back to OPENCODE_* env vars for opencode-go if OPENCODE_GO_* is not set
  if (providerId === "opencode-go") {
    const fallback = process.env[`OPENCODE_${keyType}`]?.trim();
    if (fallback) return fallback;
  }

  return undefined;
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
  const instanceHasKey = Boolean(getEnvValue(provider, "API_KEY"));

  return {
    provider,
    source: settings.ai?.apiKey?.trim()
      ? "user"
      : instanceHasKey || definition.apiKeyOptional
        ? "instance"
        : "unavailable",
  };
}

export async function getAiProvider(userId?: string): Promise<AiProvider | null> {
  const settings = await getUserSettings(userId);
  const providerId = settings.ai?.provider ?? resolveEnvProviderId();
  const providerDef = getAiProviderDefinition(providerId);

  const apiKey =
    settings.ai?.apiKey?.trim() ||
    getEnvValue(providerId, "API_KEY") ||
    (providerDef.apiKeyOptional ? "not-required" : undefined);
  if (!apiKey) return null;

  const rawBaseUrl =
    settings.ai?.baseURL?.trim() ||
    getEnvValue(providerId, "BASE_URL") ||
    providerDef.defaultBaseURL;
  const baseUrl = normalizeAiBaseUrl(providerId, rawBaseUrl);

  let rawModel =
    settings.ai?.model?.trim() ||
    getEnvValue(providerId, "MODEL") ||
    providerDef.defaultModel;

  if (providerId === "opencode-go" && rawModel === "deepseek-v4-flash-free") {
    rawModel = "deepseek-v4-flash";
  } else if (providerId === "opencode" && rawModel === "deepseek-v4-flash") {
    rawModel = "deepseek-v4-flash-free";
  }
  const model = rawModel;
  const temperature = settings.ai?.temperature ?? 0.4;
  const minOutputTokens = settings.ai?.minOutputTokens ?? 0;
  const maxOutputTokens = settings.ai?.maxOutputTokens ?? 1_200;
  const instructions = settings.ai?.instructions?.trim();
  const guardrails = settings.ai?.guardrails?.trim();
  const applyUserControls = (systemPrompt: string) => [
    systemPrompt,
    minOutputTokens > 0 ? `Target minimum response length: at least ${minOutputTokens} tokens.` : null,
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
    embed: async (texts: string[]): Promise<number[][]> => {
      if (texts.length === 0) return [];
      const embeddingModel =
        process.env.EMBEDDING_MODEL || "text-embedding-3-small";
      try {
        const res = await client.embeddings.create({
          model: embeddingModel,
          input: texts,
        });
        return res.data.map((d) => d.embedding);
      } catch {
        // Transparent fallback to deterministic offline embedding
        return texts.map((t) => generateDeterministicEmbedding(t, 384));
      }
    },
  };
}

/**
 * Deterministic, normalized pseudo-semantic embedding for offline and fallback operation.
 * Utilizes feature hashing with sub-word n-grams and L2 normalization.
 */
export function generateDeterministicEmbedding(
  text: string,
  dimensions = 384,
): number[] {
  const vector = new Float64Array(dimensions);
  const normalized = text.toLowerCase().trim();
  if (!normalized) return Array.from(vector);

  const tokens = normalized.match(/[\p{L}\p{N}_-]+/gu) || [normalized];

  for (const token of tokens) {
    // Word hash
    let h1 = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
      h1 ^= token.charCodeAt(i);
      h1 = Math.imul(h1, 0x01000193);
    }
    const idx1 = Math.abs(h1) % dimensions;
    const sign1 = h1 & 1 ? 1 : -1;
    vector[idx1] += sign1 * 1.5;

    // Character 3-grams
    if (token.length >= 3) {
      for (let i = 0; i <= token.length - 3; i++) {
        const gram = token.slice(i, i + 3);
        let h2 = 0x27d4eb2f;
        for (let j = 0; j < gram.length; j++) {
          h2 ^= gram.charCodeAt(j);
          h2 = Math.imul(h2, 0x5bd1e995);
        }
        const idx2 = Math.abs(h2) % dimensions;
        const sign2 = h2 & 1 ? 1 : -1;
        vector[idx2] += sign2 * 0.8;
      }
    }
  }

  // Compute L2 norm
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

