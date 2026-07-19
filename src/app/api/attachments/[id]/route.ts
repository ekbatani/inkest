import { NextRequest, NextResponse } from "next/server";
import { serveAttachment } from "@/server/attachments/service";
import {
  contentDispositionFileName,
  contentDispositionType,
} from "@/server/attachments/validation";

function getContentDisposition(fileName: string, mimeType: string) {
  const sanitizedName = contentDispositionFileName(fileName);
  const dispositionType = contentDispositionType(mimeType);

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
      {
        status: result.status,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": getContentDisposition(
        result.originalName || result.fileName,
        result.mimeType,
      ),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
