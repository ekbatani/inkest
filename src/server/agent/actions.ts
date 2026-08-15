"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { getCurrentUser } from "@/server/auth";
import { updateUserSettings } from "@/server/users/settings-service";
import { runAutonomousAgentLoop, type AgentLoopResult } from "./loop";
import { AGENT_TOOLS, executeAgentTool } from "./tools";

export async function runAgentTaskAction(args: {
  noteId?: string;
  goal: string;
  maxSteps?: number;
  allowedTools?: string[];
}): Promise<AgentLoopResult> {
  const result = await runAutonomousAgentLoop(args);
  if (args.noteId) {
    revalidatePath(`/notes/${args.noteId}`);
  }
  revalidatePath("/notes");
  revalidatePath("/planner");
  return result;
}

export async function executeAgentToolAction(
  toolName: string,
  args: Record<string, unknown>,
) {
  const result = await executeAgentTool(toolName, args);
  revalidatePath("/notes");
  revalidatePath("/planner");
  return result;
}

export async function listAvailableAgentToolsAction() {
  return AGENT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

export async function generateAgentTokenAction(): Promise<{ token: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const rawToken = `ink_agent_${randomBytes(24).toString("hex")}`;
  await updateUserSettings({
    agentHarness: {
      enabled: true,
      apiToken: rawToken,
    },
  });

  revalidatePath("/settings");
  return { token: rawToken };
}

export async function clearAgentTokenAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");

  await updateUserSettings({
    agentHarness: {
      apiToken: "",
    },
  });
  revalidatePath("/settings");
}
