import { NextRequest, NextResponse } from "next/server";
import { saveLocalAttachment } from "@/server/attachments/service";

export async function POST(request: NextRequest) {
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
