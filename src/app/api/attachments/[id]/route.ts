import { NextRequest, NextResponse } from "next/server";
import { serveAttachment } from "@/server/attachments/service";

function getContentDisposition(fileName: string, mimeType: string) {
  const sanitizedName = fileName.replace(/["\\]/g, "_");
  const dispositionType =
    mimeType.startsWith("image/") || mimeType === "application/pdf"
      ? "inline"
      : "attachment";

  return `${dispositionType}; filename="${sanitizedName}"`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await serveAttachment(id);

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": getContentDisposition(
        result.originalName || result.fileName,
        result.mimeType,
      ),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
