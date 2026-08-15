import { createHash } from "node:crypto";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { getAiProvider } from "./provider";
import { getUserSettings } from "@/server/users/settings-service";
import { randomId } from "@/lib/slug";
import { type CitationItem, getGroundedContext, persistCitations } from "./retrieval-service";

export type AiActionResult<T = string> =
  | {
      ok: true;
      output: T;
      model: string;
      provider: string;
      citations?: CitationItem[];
      transformType?: string;
      uncertaintyNote?: string;
    }
  | { ok: false; error: string; notConfigured?: boolean };

export const AI_NOT_CONFIGURED_ERROR =
  "AI is not configured. Add an AI provider in Settings or set the server AI environment variables.";

/**
 * Sanitize prompt inputs to defend against basic prompt injection attacks
 * within untrusted content or uploaded documents.
 */
export function sanitizePromptInput(text: string): string {
  if (!text) return "";
  return text
    .replace(/ignore\s+(previous|above)\s+instructions/gi, "[redacted command]")
    .replace(/system\s+prompt:/gi, "[redacted role]")
    .replace(/you\s+are\s+now\s+a/gi, "[redacted role assumption]");
}

function limitPromptToInputBudget(prompt: string, maxInputTokens: number) {
  const maxCharacters = maxInputTokens * 4;
  if (prompt.length <= maxCharacters) return prompt;
  return `${prompt.slice(0, maxCharacters)}\n\n[Input truncated to your AI input limit.]`;
}

export async function getCurrentUserOrError(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  return { ok: true, userId: user.id };
}

export async function getProviderOrUnconfigured() {
  const provider = await getAiProvider();
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
 */
export async function runTextAction(args: {
  noteId: string | null;
  workspaceId?: string;
  action: string;
  systemPrompt: string;
  inputForAudit: string;
  promptToModel: string;
  enableGrounding?: boolean;
  transformType?: string;
}): Promise<AiActionResult<string>> {
  const user = await getCurrentUserOrError();
  if (!user.ok) return { ok: false, error: user.error };

  const [providerResult, settings] = await Promise.all([
    getProviderOrUnconfigured(),
    getUserSettings(),
  ]);
  const { ok, result, provider } = providerResult;
  if (!ok || !provider) return result;

  const sanitizedInput = sanitizePromptInput(args.promptToModel);
  let finalPrompt = sanitizedInput;
  let citations: CitationItem[] = [];
  let resolvedWorkspaceId = args.workspaceId;

  if (args.enableGrounding) {
    if (!resolvedWorkspaceId) {
      const ws = await getWorkspaceForUser(user.userId);
      if (ws) resolvedWorkspaceId = ws.id;
    }

    if (resolvedWorkspaceId) {
      const grounded = await getGroundedContext({
        userId: user.userId,
        workspaceId: resolvedWorkspaceId,
        query: args.inputForAudit,
      });
      finalPrompt += grounded.contextBlock;
      citations = grounded.citations;
    }
  }

  const inputHash = createHash("sha256").update(args.inputForAudit).digest("hex");
  const providerName = provider.id;
  const eventId = randomId();

  try {
    const output = await provider.complete(
      limitPromptToInputBudget(finalPrompt, settings.ai?.maxInputTokens ?? 8_000),
      args.systemPrompt,
    );

    await db.insert(schema.aiEvents).values({
      id: eventId,
      userId: user.userId,
      noteId: args.noteId,
      action: args.action,
      inputHash,
      outputMd: output,
      provider: providerName,
      model: provider.model,
    });

    if (citations.length > 0 && resolvedWorkspaceId) {
      await persistCitations({
        userId: user.userId,
        workspaceId: resolvedWorkspaceId,
        targetNoteId: args.noteId,
        targetAiEventId: eventId,
        citations,
      });
    }

    const uncertaintyNote = citations.length === 0 && args.enableGrounding
      ? "Note: No specific note/document sources matched this query; response is generated without external citations."
      : undefined;

    return {
      ok: true,
      output,
      model: provider.model,
      provider: providerName,
      citations: citations.length > 0 ? citations : undefined,
      transformType: args.transformType ?? args.action,
      uncertaintyNote,
    };
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
 * Run an action that expects a JSON response matching a predicate.
 */
export async function runJsonAction<T>(args: {
  noteId: string | null;
  workspaceId?: string;
  action: string;
  systemPrompt: string;
  inputForAudit: string;
  promptToModel: string;
  parse: (raw: string) => T | null;
  enableGrounding?: boolean;
  transformType?: string;
}): Promise<AiActionResult<T>> {
  const user = await getCurrentUserOrError();
  if (!user.ok) return { ok: false, error: user.error };

  const [providerResult, settings] = await Promise.all([
    getProviderOrUnconfigured(),
    getUserSettings(),
  ]);
  const { ok, result, provider } = providerResult;
  if (!ok || !provider) return result;

  const sanitizedInput = sanitizePromptInput(args.promptToModel);
  let finalPrompt = sanitizedInput;
  let citations: CitationItem[] = [];
  let resolvedWorkspaceId = args.workspaceId;

  if (args.enableGrounding) {
    if (!resolvedWorkspaceId) {
      const ws = await getWorkspaceForUser(user.userId);
      if (ws) resolvedWorkspaceId = ws.id;
    }

    if (resolvedWorkspaceId) {
      const grounded = await getGroundedContext({
        userId: user.userId,
        workspaceId: resolvedWorkspaceId,
        query: args.inputForAudit,
      });
      finalPrompt += grounded.contextBlock;
      citations = grounded.citations;
    }
  }

  const inputHash = createHash("sha256").update(args.inputForAudit).digest("hex");
  const providerName = provider.id;
  const eventId = randomId();

  try {
    const raw = await provider.completeJson(
      limitPromptToInputBudget(finalPrompt, settings.ai?.maxInputTokens ?? 8_000),
      args.systemPrompt,
    );
    const parsed = args.parse(raw);
    if (parsed === null) {
      return { ok: false, error: "AI returned invalid JSON." };
    }

    await db.insert(schema.aiEvents).values({
      id: eventId,
      userId: user.userId,
      noteId: args.noteId,
      action: args.action,
      inputHash,
      outputJson: JSON.stringify(parsed),
      provider: providerName,
      model: provider.model,
    });

    if (citations.length > 0 && resolvedWorkspaceId) {
      await persistCitations({
        userId: user.userId,
        workspaceId: resolvedWorkspaceId,
        targetNoteId: args.noteId,
        targetAiEventId: eventId,
        citations,
      });
    }

    const uncertaintyNote = citations.length === 0 && args.enableGrounding
      ? "Note: No specific note/document sources matched this query; response is generated without external citations."
      : undefined;

    return {
      ok: true,
      output: parsed,
      model: provider.model,
      provider: providerName,
      citations: citations.length > 0 ? citations : undefined,
      transformType: args.transformType ?? args.action,
      uncertaintyNote,
    };
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
