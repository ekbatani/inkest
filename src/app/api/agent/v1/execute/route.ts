import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentRequest } from "@/server/agent/harness-protocol";
import { executeAgentTool } from "@/server/agent/tools";
import { runWithAuthContext } from "@/server/auth/context";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const auth = await authenticateAgentRequest(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const toolName = body.tool || body.name;
    const args = body.arguments || body.args || {};

    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required 'tool' name in request body" },
        { status: 400 },
      );
    }

    const result = await runWithAuthContext(
      { userId: auth.userId, workspaceId: auth.workspaceId, isAgent: true },
      () => executeAgentTool(toolName, args),
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse tool execution payload",
      },
      { status: 400 },
    );
  }
}
