import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getNoteById } from "@/server/notes/service";
import { computeContentHash } from "@/lib/document-engine/diff-patch";
import { compressPayload } from "@/lib/document-engine/compression";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  const { id } = await params;
  try {
    const note = await getNoteById(id);
    if (!note) {
      return NextResponse.json(
        { error: "Note not found or unauthorized" },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const payload = {
      id: note.id,
      title: note.title,
      contentMd: note.contentMd,
      contentHash: computeContentHash(note.contentMd),
      direction: note.direction,
      type: note.type,
      status: note.status,
      priority: note.priority,
      updatedAt: note.updatedAt,
    };

    const compressed = await compressPayload(payload);

    return new Response(compressed as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "deflate",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load compressed note";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
