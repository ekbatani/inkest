import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { updateNote } from "@/server/notes/service";
import { syncMarkdownTasks } from "@/server/tasks/service";

const PRIVATE_NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST(
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
    const body = await request.json();
    const { title, contentMd } = body;

    const patch: { title?: string; contentMd?: string } = {};
    if (typeof title === "string") patch.title = title;
    if (typeof contentMd === "string") patch.contentMd = contentMd;

    const updated = await updateNote(id, patch);
    if (!updated) {
      return NextResponse.json(
        { error: "Note not found or unauthorized" },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    if (patch.contentMd !== undefined) {
      try {
        await syncMarkdownTasks(id, patch.contentMd);
      } catch {
        // Sync failure should not block note save response.
      }
    }

    return NextResponse.json(
      { success: true, updatedAt: updated.updatedAt },
      { headers: PRIVATE_NO_STORE_HEADERS },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save note";
    return NextResponse.json(
      { error: message },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }
}
