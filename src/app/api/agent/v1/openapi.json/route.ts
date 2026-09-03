import { NextRequest, NextResponse } from "next/server";
import { AGENT_TOOLS } from "@/server/agent/tools";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const spec = {
    openapi: "3.0.3",
    info: {
      title: "Inkest Workspace Second Brain API",
      version: "1.0.0",
      description:
        "External AI integration API for Inkest Markdown Workspace. Query project-scoped second brain knowledge bases, manage notes, explore project trees, and track tasks with grounded citations.",
    },
    servers: [
      {
        url: `${origin}/api/agent/v1`,
        description: "Inkest Personal Workspace Instance",
      },
    ],
    security: [
      {
        BearerAuth: [],
      },
    ],
    paths: {
      "/execute": {
        post: {
          summary: "Execute workspace agent tool",
          description:
            "Executes any available workspace tool (e.g. query_project_knowledge, get_project_tree, read_note, create_note, update_task).",
          operationId: "executeTool",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["tool"],
                  properties: {
                    tool: {
                      type: "string",
                      enum: AGENT_TOOLS.map((t) => t.name),
                      description: "The name of the tool to execute.",
                    },
                    arguments: {
                      type: "object",
                      description: "Tool-specific parameter object.",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful tool execution result.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      data: { type: "object" },
                      error: { type: "string" },
                    },
                  },
                },
              },
            },
            "400": { description: "Invalid arguments or malformed request payload." },
            "401": { description: "Missing or invalid Bearer authentication token." },
          },
        },
      },
      "/tools": {
        get: {
          summary: "List all available workspace tools",
          description: "Returns the definitions and JSON schemas for all tools available to external agents.",
          operationId: "listTools",
          responses: {
            "200": {
              description: "Tool definitions list.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      version: { type: "string" },
                      tools: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            type: { type: "string" },
                            function: { type: "object" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/notes/{id}": {
        get: {
          summary: "Read note or project",
          description: "Fetches complete markdown body, metadata, and attached tasks for a note or project by its ID.",
          operationId: "getNote",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Unique note or project ID.",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Note record and attached task items.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      contentMd: { type: "string" },
                      type: { type: "string" },
                      status: { type: "string" },
                      tasks: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
            "401": { description: "Unauthorized" },
            "404": { description: "Note not found" },
          },
        },
        patch: {
          summary: "Update note content or status",
          description: "Appends or replaces markdown content and updates status for a note.",
          operationId: "updateNote",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    contentMd: { type: "string" },
                    appendContent: { type: "string" },
                    status: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Note updated successfully." },
            "401": { description: "Unauthorized" },
            "404": { description: "Note not found" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "ink_agent_...",
          description: "Provide your Inkest Agent API Token in the Authorization header: Bearer ink_agent_<token>",
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
