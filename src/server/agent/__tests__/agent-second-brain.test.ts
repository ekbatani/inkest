import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { AGENT_TOOLS } from "@/server/agent/tools";
import { runWithAuthContext, getActiveAuthContext } from "@/server/auth/context";
import { GET as getOpenApiSpec } from "@/app/api/agent/v1/openapi.json/route";
import { NextRequest } from "next/server";

describe("Second Brain Agent Tools & Schemas", () => {
  test("AGENT_TOOLS registers query_project_knowledge with correct schema", () => {
    const tool = AGENT_TOOLS.find((t) => t.name === "query_project_knowledge");
    assert.ok(tool, "query_project_knowledge should be registered in AGENT_TOOLS");
    assert.equal(tool.parameters.type, "object");
    assert.ok(tool.parameters.properties.projectId, "Should require projectId property");
    assert.ok(tool.parameters.properties.query, "Should require query property");
    assert.deepEqual(tool.parameters.required, ["projectId", "query"]);
  });

  test("AGENT_TOOLS registers get_project_tree with correct schema", () => {
    const tool = AGENT_TOOLS.find((t) => t.name === "get_project_tree");
    assert.ok(tool, "get_project_tree should be registered in AGENT_TOOLS");
    assert.equal(tool.parameters.type, "object");
    assert.ok(tool.parameters.properties.projectId, "Should require projectId property");
    assert.deepEqual(tool.parameters.required, ["projectId"]);
  });

  test("AuthContext correctly tracks active execution context via AsyncLocalStorage", async () => {
    assert.equal(getActiveAuthContext(), undefined, "Context should be undefined outside of run");

    await runWithAuthContext(
      { userId: "test-user-123", workspaceId: "test-ws-456", isAgent: true },
      async () => {
        const ctx = getActiveAuthContext();
        assert.ok(ctx, "Context should be accessible inside runWithAuthContext");
        assert.equal(ctx?.userId, "test-user-123");
        assert.equal(ctx?.workspaceId, "test-ws-456");
        assert.equal(ctx?.isAgent, true);
      },
    );

    assert.equal(getActiveAuthContext(), undefined, "Context should clean up after run exits");
  });

  test("OpenAPI 3.0 specification endpoint generates valid schema for ChatGPT Actions", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/v1/openapi.json");
    const response = await getOpenApiSpec(req);
    assert.equal(response.status, 200);

    const json = await response.json();
    assert.equal(json.openapi, "3.0.3");
    assert.equal(json.info.title, "Inkest Workspace Second Brain API");
    assert.ok(json.paths["/execute"], "Should expose /execute path");
    assert.ok(json.paths["/tools"], "Should expose /tools path");
    assert.ok(json.paths["/notes/{id}"], "Should expose /notes/{id} path");

    // Verify Bearer authentication scheme
    assert.ok(json.components.securitySchemes.BearerAuth, "Should define BearerAuth");
    assert.equal(json.components.securitySchemes.BearerAuth.type, "http");
    assert.equal(json.components.securitySchemes.BearerAuth.scheme, "bearer");

    // Verify /execute tool enum contains query_project_knowledge
    const toolEnum =
      json.paths["/execute"].post.requestBody.content["application/json"].schema.properties.tool.enum;
    assert.ok(
      toolEnum.includes("query_project_knowledge"),
      "/execute schema should allow query_project_knowledge",
    );
    assert.ok(
      toolEnum.includes("get_project_tree"),
      "/execute schema should allow get_project_tree",
    );
  });
});
