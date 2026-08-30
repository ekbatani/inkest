import { getAiProvider } from "./provider";
import { formatAiErrorMessage, sanitizePromptInput } from "./runner";
import { stripReasoningTags } from "./json-engine";

const SYSTEM_PROMPT =
  "You write a personal morning briefing for the Inkest workspace owner. " +
  "Using only the digest provided, reply with a warm, motivating plain-text " +
  "message of 2-4 short sentences (no markdown headers or bullet lists). " +
  "Reference concrete task and project titles, lead with the most urgent item, " +
  "and acknowledge recent progress. Never invent tasks or projects.";

/**
 * AI-polished morning briefing for the scheduler (which runs without a request
 * session, so the provider is resolved for an explicit userId). Returns null
 * when AI is unconfigured or fails — callers fall back to the static digest.
 */
export async function generateMorningBriefingText(
  userId: string,
  digest: string,
  today: string,
): Promise<string | null> {
  try {
    const provider = await getAiProvider(userId);
    if (!provider) return null;

    const raw = await provider.complete(
      sanitizePromptInput(
        `Today is ${today}. Morning digest:\n\n${digest}\n\nWrite the morning briefing per the system rules.`,
      ),
      SYSTEM_PROMPT,
    );
    const text = stripReasoningTags(raw).trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.warn("[ai-briefing] briefing generation failed:", formatAiErrorMessage(err));
    return null;
  }
}
