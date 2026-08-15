import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentRequest, getHermesToolManifest, getOpenClawToolManifest } from "@/server/agent/harness-protocol";
import { AGENT_TOOLS } from "@/server/agent/tools";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const auth = await authenticateAgentRequest(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const format = req.nextUrl.searchParams.get("format") || "openai";

  if (format === "hermes") {
    return NextResponse.json(await getHermesToolManifest());
  }

  if (format === "openclaw") {
    return NextResponse.json(await getOpenClawToolManifest());
  }

  // Default OpenAI Function Calling / standard tools format
  return NextResponse.json({
    version: "v1",
    tools: AGENT_TOOLS.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
  });
}
