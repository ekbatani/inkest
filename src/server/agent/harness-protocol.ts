import { getCurrentUser } from "@/server/auth";
import { getWorkspaceForUser } from "@/server/auth/users";
import { AGENT_TOOLS } from "./tools";
import { db, schema } from "@/server/db/client";

export function getHermesToolManifest() {
  return {
    schema_version: "v1",
    name_for_model: "inkest_workspace_agent",
    name_for_human: "Inkest Markdown Workspace",
    description_for_model: "Autonomous tools for searching notes, reading markdown files, writing content, and creating actionable task plans in Inkest.",
    description_for_human: "Connect Hermes to your private Inkest personal workspace.",
    tools: AGENT_TOOLS.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
  };
}

export function getOpenClawToolManifest() {
  return {
    protocol: "openclaw-v1",
    agent_capabilities: [
      "markdown_editor",
      "note_search",
      "task_management",
      "autonomous_loop",
    ],
    tools: AGENT_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    })),
  };
}

/**
 * Validates either a standard user session or a Bearer token in the Authorization header.
 * Resolves both userId and workspaceId.
 */
export async function authenticateAgentRequest(authHeader: string | null): Promise<
  | { ok: true; userId: string; workspaceId: string }
  | { ok: false; error: string; status: number }
> {
  // 1. Try session auth
  const sessionUser = await getCurrentUser();
  if (sessionUser) {
    const ws = await getWorkspaceForUser(sessionUser.id);
    if (!ws) {
      return { ok: false, error: "Workspace not found for user", status: 404 };
    }
    return { ok: true, userId: sessionUser.id, workspaceId: ws.id };
  }

  // 2. Try Bearer token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, error: "Missing or invalid Authorization header", status: 401 };
  }

  const token = authHeader.slice(7).trim();
  if (!token.startsWith("ink_agent_")) {
    return { ok: false, error: "Invalid agent token format", status: 401 };
  }

  // Search user by settings containing this token
  try {
    const allUsers = await db.select({ id: schema.users.id, settings: schema.users.settings }).from(schema.users);
    const matched = allUsers.find((u) => {
      if (!u.settings) return false;
      try {
        const parsed = JSON.parse(u.settings);
        return parsed?.agentHarness?.apiToken === token && parsed?.agentHarness?.enabled !== false;
      } catch {
        return false;
      }
    });

    if (!matched) {
      return { ok: false, error: "Invalid agent API token", status: 401 };
    }

    const ws = await getWorkspaceForUser(matched.id);
    if (!ws) {
      return { ok: false, error: "Workspace not found for user", status: 404 };
    }

    return { ok: true, userId: matched.id, workspaceId: ws.id };
  } catch {
    return { ok: false, error: "Authentication service unavailable", status: 500 };
  }
}
