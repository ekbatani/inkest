import { createHash } from "node:crypto";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getAiProvider } from "./provider";
import { randomId } from "@/lib/slug";

export type AiActionResult<T = string> =
  | { ok: true; output: T; model: string; provider: string }
  | { ok: false; error: string; notConfigured?: boolean };

export const AI_NOT_CONFIGURED_ERROR =
  "AI is not configured. Set OPENAI_API_KEY in .env.local to enable AI actions.";

export async function getCurrentUserOrError(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  return { ok: true, userId: user.id };
}

export function getProviderOrUnconfigured() {
  const provider = getAiProvider();
  if (!provider) {
    return {
      ok: false as const,
      result: {
        ok: false,
        error: AI_NOT_CONFIGURED_ERROR,
        notConfigured: true,
      } as AiActionResult<never>,
    };
  }
  return { ok: true as const, provider };
}

/**
 * Run a text-in/text-out AI action and log it to ai_events.
 * `inputText` is what gets hashed for audit logging; `promptToModel` is the
 * text actually sent to the model (may include selection + context).
 */
export async function runTextAction(args: {
  noteId: string | null;
  action: string;
  systemPrompt: string;
  inputForAudit: string;
  promptToModel: string;
}): Promise<AiActionResult<string>> {
  const user = await getCurrentUserOrError();
  if (!user.ok) return { ok: false, error: user.error };

  const { ok, result, provider } = getProviderOrUnconfigured();
  if (!ok || !provider) return result;

  const inputHash = createHash("sha256").update(args.inputForAudit).digest("hex");
  const providerName = process.env.AI_PROVIDER ?? "openai";

  try {
    const output = await provider.complete(args.promptToModel, args.systemPrompt);
    await db.insert(schema.aiEvents).values({
      id: randomId(),
      userId: user.userId,
      noteId: args.noteId,
      action: args.action,
      inputHash,
      outputMd: output,
      provider: providerName,
      model: provider.model,
    });
    return { ok: true, output, model: provider.model, provider: providerName };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `AI request failed: ${err.message}`
          : "AI request failed.",
    };
  }
}

/**
 * Run an action that expects a JSON response matching a predicate. Uses the
 * model's JSON mode when available; otherwise parses the first JSON object we
 * can find inside the response text.
 */
export async function runJsonAction<T>(args: {
  noteId: string | null;
  action: string;
  systemPrompt: string;
  inputForAudit: string;
  promptToModel: string;
  parse: (raw: string) => T | null;
}): Promise<AiActionResult<T>> {
  const user = await getCurrentUserOrError();
  if (!user.ok) return { ok: false, error: user.error };

  const { ok, result, provider } = getProviderOrUnconfigured();
  if (!ok || !provider) return result;

  const inputHash = createHash("sha256").update(args.inputForAudit).digest("hex");
  const providerName = process.env.AI_PROVIDER ?? "openai";

  try {
    const raw = await provider.completeJson(args.promptToModel, args.systemPrompt);
    const parsed = args.parse(raw);
    if (parsed === null) {
      return { ok: false, error: "AI returned invalid JSON." };
    }
    await db.insert(schema.aiEvents).values({
      id: randomId(),
      userId: user.userId,
      noteId: args.noteId,
      action: args.action,
      inputHash,
      outputJson: JSON.stringify(parsed),
      provider: providerName,
      model: provider.model,
    });
    return { ok: true, output: parsed, model: provider.model, provider: providerName };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `AI request failed: ${err.message}`
          : "AI request failed.",
    };
  }
}