import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { getNoteById } from "@/server/notes/service";
import { summarizeNote } from "@/server/ai/summarize-note";

const RequestSchema = z.object({
  action: z.enum(["summarize"]),
  noteId: z.string(),
  selectedText: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { action, noteId, selectedText } = parsed.data;

  const note = await getNoteById(noteId);
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  if (action === "summarize") {
    const content = selectedText?.trim()
      ? selectedText
      : note.contentMd;
    const result = await summarizeNote(note.id, note.title, content);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, notConfigured: result.notConfigured },
        { status: result.notConfigured ? 503 : 500 },
      );
    }
    return NextResponse.json({ output: result.output });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
