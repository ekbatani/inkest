import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { GET as mcpGet, POST as mcpPost } from "@/app/api/agent/v1/mcp/route";
import { NextRequest } from "next/server";

describe("Model Context Protocol (MCP) Endpoint", () => {
  test("rejects unauthenticated GET requests with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/v1/mcp");
    const res = await mcpGet(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error, "Should return error message on 401");
  });

  test("rejects unauthenticated POST requests with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/v1/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      }),
    });
    const res = await mcpPost(req);
    assert.equal(res.status, 401);
  });

  test("rejects invalid Bearer token format with 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/agent/v1/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer not_an_ink_token",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
      }),
    });
    const res = await mcpPost(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "Invalid agent token format");
  });
});
