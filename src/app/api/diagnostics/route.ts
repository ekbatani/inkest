import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth";
import { reportClientDiagnostic } from "@/server/diagnostics/service";

const diagnosticSchema = z.object({
  surface: z.enum(["app", "note", "project"]),
  digest: z.string().max(128).optional(),
}).strict();

export async function POST(request: NextRequest) {
  if (!(await getCurrentUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = diagnosticSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid diagnostic." }, { status: 400 });
  }

  await reportClientDiagnostic(parsed.data);
  return new NextResponse(null, { status: 204 });
}
