import { createHash } from "node:crypto";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";
import { getAiProvider } from "./provider";
import { randomId } from "@/lib/slug";

const SUMMARIZE_SYSTEM_PROMPT = `You are a concise summarizer for personal notes.
Summarize the user's note as Markdown with:
- A 1-2 sentence summary at the top
- 3-5 key points as a bulleted list
- Any action items mentioned in the note

Keep it short and useful. Respond in Markdown only.`;

export type AiActionResult =
  | { ok: true; output: string }
  | { ok: false; error: string; notConfigured?: boolean };

export async function summarizeNote(
  noteId: string,
  noteTitle: string,
  noteContent: string,
): Promise<AiActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  const provider = getAiProvider();
  if (!provider) {
    return {
      ok: false,
      error:
        "AI is not configured. Set OPENAI_API_KEY in .env.local to enable AI actions.",
      notConfigured: true,
    };
  }

  const inputText = `# ${noteTitle}\n\n${noteContent}`;
  const inputHash = createHash("sha256").update(inputText).digest("hex");

  try {
    const output = await provider.complete(inputText, SUMMARIZE_SYSTEM_PROMPT);

    await db.insert(schema.aiEvents).values({
      id: randomId(),
      userId: user.id,
      noteId,
      action: "summarize",
      inputHash,
      outputMd: output,
      provider: process.env.AI_PROVIDER ?? "openai",
      model: provider.model,
    });

    return { ok: true, output };
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
