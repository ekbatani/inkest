import { NextRequest, NextResponse } from "next/server";
import { saveLocalAttachment } from "@/server/attachments/service";
import { getCurrentUser } from "@/server/auth";

const MAX_UPLOAD_SIZE = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 20) * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "File too large." }, { status: 413 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const result = await saveLocalAttachment(file);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    id: result.attachment.id,
    markdown: result.markdown,
  });
}
