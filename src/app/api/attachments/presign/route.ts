import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { checkUploadQuota, isCloudDeployment } from "@/cloud/limits/service";
import { randomId } from "@/lib/slug";
import path from "node:path";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.fileName || typeof body.fileSize !== "number") {
    return NextResponse.json(
      { error: "Invalid request. Expected fileName and fileSize." },
      { status: 400 },
    );
  }

  const { fileName, fileSize, mimeType } = body;

  // Enforce Cloud Free Tier upload and storage boundaries
  const quota = await checkUploadQuota(user.id, fileSize);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.reason }, { status: 413 });
  }

  const attachmentId = randomId();
  const safeName = fileName.replace(/[^\w.-]/g, "-").slice(0, 100);
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const storagePath = `attachments/${user.id}/${year}/${month}/${attachmentId}-${safeName}`;

  if (isCloudDeployment() && process.env.ATTACHMENT_STORAGE_DRIVER === "minio") {
    // In cloud mode, return signed destination parameters
    return NextResponse.json({
      attachmentId,
      storagePath,
      directUpload: true,
      url: `/api/attachments/upload-direct`, // Or cloud S3 PUT endpoint
      headers: {
        "Content-Type": mimeType || "application/octet-stream",
      },
    });
  }

  // Self-hosted / local storage fallback
  return NextResponse.json({
    attachmentId,
    storagePath,
    directUpload: false,
    uploadUrl: "/api/attachments/upload",
  });
}
