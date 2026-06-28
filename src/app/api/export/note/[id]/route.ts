import { NextRequest, NextResponse } from "next/server";
import { buildSingleNoteMarkdown } from "@/server/export/service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await buildSingleNoteMarkdown(id);
  if (!result) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }
  return new NextResponse(result.content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}