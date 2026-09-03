import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { getNoteById, updateNote } from "@/server/notes/service";
import { syncMarkdownTasks } from "@/server/tasks/service";
import { saveNotePayloadSchema } from "@/server/notes/validation";
import { applyTextEdits, computeContentHash } from "@/lib/document-engine/diff-patch";
import { decompressPayload } from "@/lib/document-engine/compression";

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
    let rawBody: unknown;
    const contentEncoding = request.headers.get("content-encoding")?.toLowerCase();
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

    if (
      contentEncoding === "deflate" ||
      contentEncoding === "gzip" ||
      contentType.includes("application/octet-stream")
    ) {
      const buffer = await request.arrayBuffer();
      rawBody = await decompressPayload(buffer);
    } else {
      rawBody = await request.json();
    }

    const parsed = saveNotePayloadSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload format", details: parsed.error.issues },
        { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    const { title, contentMd, baseHash, patches } = parsed.data;

    // 1. Partial patch save workflow
    if (patches && patches.length > 0) {
      const currentNote = await getNoteById(id);
      if (!currentNote) {
        return NextResponse.json(
          { error: "Note not found or unauthorized" },
          { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
        );
      }

      if (baseHash) {
        const currentHash = computeContentHash(currentNote.contentMd);
        if (baseHash !== currentHash) {
          return NextResponse.json(
            { error: "BASE_MISMATCH", requireFullSync: true, currentHash },
            { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
          );
        }
      }

      let patchedContent: string;
      try {
        patchedContent = applyTextEdits(currentNote.contentMd, patches);
      } catch {
        return NextResponse.json(
          { error: "PATCH_FAILED", requireFullSync: true },
          { status: 409, headers: PRIVATE_NO_STORE_HEADERS },
        );
      }

      const updateInput: { title?: string; contentMd?: string } = {
        contentMd: patchedContent,
      };
      if (typeof title === "string" && title.length > 0) {
        updateInput.title = title;
      }

      const updated = await updateNote(id, updateInput);
      if (!updated) {
        return NextResponse.json(
          { error: "Failed to update note" },
          { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
        );
      }

      try {
        await syncMarkdownTasks(id, patchedContent);
      } catch {
        // Sync failure should not block note save response.
      }

      revalidatePath(`/notes/${id}`);
      revalidatePath("/notes");

      return NextResponse.json(
        {
          success: true,
          updatedAt: updated.updatedAt,
          contentHash: computeContentHash(patchedContent),
          patched: true,
        },
        { headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    // 2. Full content save workflow
    const patchInput: { title?: string; contentMd?: string } = {};
    if (typeof title === "string" && title.length > 0) patchInput.title = title;
    if (typeof contentMd === "string") patchInput.contentMd = contentMd;

    const updated = await updateNote(id, patchInput);
    if (!updated) {
      return NextResponse.json(
        { error: "Note not found or unauthorized" },
        { status: 404, headers: PRIVATE_NO_STORE_HEADERS },
      );
    }

    if (patchInput.contentMd !== undefined) {
      try {
        await syncMarkdownTasks(id, patchInput.contentMd);
      } catch {
        // Sync failure should not block note save response.
      }
    }

    revalidatePath(`/notes/${id}`);
    revalidatePath("/notes");

    return NextResponse.json(
      {
        success: true,
        updatedAt: updated.updatedAt,
        contentHash: computeContentHash(updated.contentMd),
        patched: false,
      },
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

