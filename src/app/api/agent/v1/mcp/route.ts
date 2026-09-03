import { NextRequest, NextResponse } from "next/server";
import { authenticateAgentRequest } from "@/server/agent/harness-protocol";
import { AGENT_TOOLS, executeAgentTool } from "@/server/agent/tools";
import { runWithAuthContext } from "@/server/auth/context";
import { getNoteById, listNotes } from "@/server/notes/service";

const MCP_PROMPTS = [
  {
    name: "synthesize_project_sources",
    description: "Synthesize all research and source notes in a project into a coherent article draft or executive summary with citations.",
    arguments: [
      {
        name: "projectId",
        description: "The unique ID of the project in Inkest",
        required: true,
      },
      {
        name: "focus",
        description: "Specific topic or angle to focus on in the synthesis",
        required: false,
      },
    ],
  },
  {
    name: "review_project_tasks",
    description: "Review open tasks and deadlines across a project hierarchy and prioritize immediate next actions.",
    arguments: [
      {
        name: "projectId",
        description: "The unique ID of the project in Inkest",
        required: true,
      },
    ],
  },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const auth = await authenticateAgentRequest(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // MCP Server info and discovery response
  return NextResponse.json({
    name: "inkest-mcp-server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    description: "Inkest Markdown Workspace MCP Server — connects Claude Desktop, Cursor, and AI agents to private projects, notes, and hybrid knowledge retrieval.",
    endpoints: {
      jsonrpc: req.nextUrl.pathname,
    },
    capabilities: {
      tools: true,
      resources: true,
      prompts: true,
    },
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const auth = await authenticateAgentRequest(authHeader);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return runWithAuthContext(
    { userId: auth.userId, workspaceId: auth.workspaceId, isAgent: true },
    async () => {
      try {
        const body = await req.json();
        const { id, method, params } = body;

        // Handle notifications (no id)
        if (method === "notifications/initialized") {
          return new NextResponse(null, { status: 204 });
        }

        switch (method) {
          case "initialize": {
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: { listChanged: false },
                  resources: { subscribe: false, listChanged: false },
                  prompts: { listChanged: false },
                },
                serverInfo: {
                  name: "inkest-workspace",
                  version: "1.0.0",
                },
                instructions:
                  "Inkest is a private Markdown personal workspace. Use 'query_project_knowledge' to query notes within a specific project, 'get_project_tree' to view project hierarchy, and 'create_note' or 'update_task' to capture items.",
              },
            });
          }

          case "ping": {
            return NextResponse.json({ jsonrpc: "2.0", id, result: {} });
          }

          case "tools/list": {
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                tools: AGENT_TOOLS.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.parameters,
                })),
              },
            });
          }

          case "tools/call": {
            const toolName = params?.name;
            const toolArgs = params?.arguments || {};

            if (!toolName || typeof toolName !== "string") {
              return NextResponse.json({
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: "Missing tool name in params" },
              });
            }

            const execution = await executeAgentTool(toolName, toolArgs);
            const contentText =
              typeof execution.data === "string"
                ? execution.data
                : JSON.stringify(execution.data ?? execution.error, null, 2);

            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                content: [{ type: "text", text: contentText }],
                isError: !execution.success,
              },
            });
          }

          case "resources/list": {
            const projects = await listNotes({ type: "project", limit: 50 });
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                resources: projects.map((p) => ({
                  uri: `inkest://projects/${p.id}`,
                  name: p.title,
                  description: `Inkest Project: ${p.title} (${p.status || "active"})`,
                  mimeType: "text/markdown",
                })),
              },
            });
          }

          case "resources/read": {
            const uri = params?.uri;
            if (!uri || typeof uri !== "string") {
              return NextResponse.json({
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: "Missing uri parameter" },
              });
            }

            // Supports inkest://notes/:id and inkest://projects/:id
            const match = uri.match(/^inkest:\/\/(?:notes|projects)\/([^/]+)$/);
            if (!match) {
              return NextResponse.json({
                jsonrpc: "2.0",
                id,
                error: { code: -32602, message: `Invalid Inkest URI scheme: ${uri}` },
              });
            }

            const noteId = match[1];
            const note = await getNoteById(noteId);
            if (!note) {
              return NextResponse.json({
                jsonrpc: "2.0",
                id,
                error: { code: -32004, message: `Note not found for ID: ${noteId}` },
              });
            }

            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                contents: [
                  {
                    uri,
                    mimeType: "text/markdown",
                    text: `# ${note.title}\n\n${note.contentMd}`,
                  },
                ],
              },
            });
          }

          case "prompts/list": {
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              result: {
                prompts: MCP_PROMPTS,
              },
            });
          }

          case "prompts/get": {
            const promptName = params?.name;
            const promptArgs = params?.arguments || {};

            if (promptName === "synthesize_project_sources") {
              const projectId = String(promptArgs.projectId ?? "");
              const focus = promptArgs.focus ? ` Focus area: ${promptArgs.focus}.` : "";
              return NextResponse.json({
                jsonrpc: "2.0",
                id,
                result: {
                  description: "Synthesize project research notes and sources",
                  messages: [
                    {
                      role: "user",
                      content: {
                        type: "text",
                        text: `Please inspect the project knowledge base using 'query_project_knowledge' or 'get_project_tree' for project ID '${projectId}'.${focus} Synthesize all collected source notes and research findings into a clear, comprehensive draft, grounding your insights and citing specific note titles.`,
                      },
                    },
                  ],
                },
              });
            }

            if (promptName === "review_project_tasks") {
              const projectId = String(promptArgs.projectId ?? "");
              return NextResponse.json({
                jsonrpc: "2.0",
                id,
                result: {
                  description: "Review and organize project tasks",
                  messages: [
                    {
                      role: "user",
                      content: {
                        type: "text",
                        text: `Please call 'get_project_tree' for project ID '${projectId}'. Analyze all attached tasks, their priorities, and due dates. Propose an immediate high-leverage action plan for today.`,
                      },
                    },
                  ],
                },
              });
            }

            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Unknown prompt: ${promptName}` },
            });
          }

          default: {
            return NextResponse.json({
              jsonrpc: "2.0",
              id,
              error: { code: -32601, message: `Method not found: ${method}` },
            });
          }
        }
      } catch (err) {
        return NextResponse.json({
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: err instanceof Error ? err.message : "Parse error or invalid JSON-RPC request",
          },
        });
      }
    },
  );
}
