import { getAiProvider } from "@/server/ai/provider";
import { AGENT_TOOLS, executeAgentTool } from "./tools";
import { randomId } from "@/lib/slug";
import { db, schema } from "@/server/db/client";
import { getCurrentUser } from "@/server/auth";

export interface AgentStepTrace {
  step: number;
  thought: string;
  toolCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  toolResult?: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  status: "thinking" | "acting" | "done" | "error";
  timestamp: string;
}

export interface AgentLoopResult {
  ok: boolean;
  goal: string;
  finalAnswer: string;
  steps: AgentStepTrace[];
  iterations: number;
  error?: string;
  model: string;
  provider: string;
}

interface StepDecision {
  thought: string;
  tool?: string;
  arguments?: Record<string, unknown>;
  isComplete: boolean;
  finalAnswer?: string;
}

export async function runAutonomousAgentLoop(args: {
  noteId?: string;
  goal: string;
  maxSteps?: number;
  allowedTools?: string[];
}): Promise<AgentLoopResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      goal: args.goal,
      finalAnswer: "",
      steps: [],
      iterations: 0,
      error: "Unauthorized",
      model: "",
      provider: "",
    };
  }

  const provider = await getAiProvider();

  if (!provider) {
    return {
      ok: false,
      goal: args.goal,
      finalAnswer: "",
      steps: [],
      iterations: 0,
      error: "AI provider is not configured. Configure an AI provider in Settings.",
      model: "",
      provider: "",
    };
  }

  const maxSteps = Math.min(15, Math.max(1, args.maxSteps ?? 6));
  const allowedToolList = args.allowedTools && args.allowedTools.length > 0
    ? AGENT_TOOLS.filter((t) => args.allowedTools?.includes(t.name))
    : AGENT_TOOLS;

  const toolsSummary = allowedToolList
    .map(
      (t) =>
        `- **${t.name}**: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters.properties)}`,
    )
    .join("\n");

  const systemPrompt = `You are the Inkest Autonomous Agent Engine.
You have access to a personal Markdown workspace and can perform multi-step planning, analysis, writing, and task management using tool calls.

AVAILABLE TOOLS:
${toolsSummary}

DECISION FORMAT:
You MUST respond with a valid, clean JSON object matching this schema on every turn:
{
  "thought": "Your internal chain-of-thought explaining what you have discovered and what to do next",
  "tool": "tool_name_to_call (or null if task is complete)",
  "arguments": { ...tool arguments... },
  "isComplete": boolean (true when goal is fully achieved),
  "finalAnswer": "Your final detailed Markdown response to the user when isComplete is true"
}

RULES:
1. Always formulate a clear "thought" before choosing a tool.
2. When you need note context, call "read_note" or "search_notes".
3. When creating or breaking down goals into tasks, call "create_task" or "create_note".
4. When finished, set "isComplete": true, "tool": null, and provide a polished, clear "finalAnswer".
5. Do not hallucinate note IDs; always discover or verify them first.`;

  const steps: AgentStepTrace[] = [];
  let conversationHistory = `User Goal: "${args.goal}"\nInitial Note Context ID: ${args.noteId ?? "none"}`;
  let finalAnswer = "";

  for (let stepIndex = 1; stepIndex <= maxSteps; stepIndex++) {
    const prompt = `CURRENT TASK STATUS (Step ${stepIndex} of max ${maxSteps}):
${conversationHistory}

Decide your next action. Respond ONLY with the JSON schema described.`;

    let decision: StepDecision;
    try {
      const rawJson = await provider.completeJson(prompt, systemPrompt);
      decision = JSON.parse(rawJson) as StepDecision;
    } catch (parseError) {
      // Fallback: try raw completion and attempt JSON extraction
      try {
        const rawText = await provider.complete(prompt, systemPrompt);
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          decision = JSON.parse(jsonMatch[0]) as StepDecision;
        } else {
          throw parseError;
        }
      } catch {
        steps.push({
          step: stepIndex,
          thought: "Failed to parse model response into structured action.",
          status: "error",
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }

    const currentStep: AgentStepTrace = {
      step: stepIndex,
      thought: decision.thought || "Analyzing workspace context...",
      status: "thinking",
      timestamp: new Date().toISOString(),
    };

    if (decision.isComplete || !decision.tool) {
      currentStep.status = "done";
      finalAnswer = decision.finalAnswer || decision.thought || "Goal completed successfully.";
      steps.push(currentStep);
      break;
    }

    // Execute tool
    currentStep.status = "acting";
    currentStep.toolCall = {
      name: decision.tool,
      args: decision.arguments || {},
    };

    const toolExecution = await executeAgentTool(
      decision.tool,
      decision.arguments || {},
    );
    currentStep.toolResult = toolExecution;
    currentStep.status = toolExecution.success ? "done" : "error";
    steps.push(currentStep);

    // Append observation to context
    conversationHistory += `\n\n[Step ${stepIndex}]
Thought: ${decision.thought}
Called Tool: ${decision.tool} with arguments ${JSON.stringify(decision.arguments)}
Tool Result: ${JSON.stringify(toolExecution.data ?? toolExecution.error)}`;

    if (stepIndex === maxSteps) {
      finalAnswer = decision.finalAnswer || decision.thought || "Reached maximum iteration limit.";
    }
  }

  // Log execution event
  try {
    await db.insert(schema.aiEvents).values({
      id: randomId("agent_run"),
      userId: user.id,
      noteId: args.noteId ?? null,
      action: "agent-autonomous-loop",
      inputHash: randomId(),
      outputMd: finalAnswer,
      outputJson: JSON.stringify(steps),
      provider: provider.id,
      model: provider.model,
      createdAt: new Date(),
    });
  } catch {
    // Non-blocking log
  }

  return {
    ok: true,
    goal: args.goal,
    finalAnswer,
    steps,
    iterations: steps.length,
    model: provider.model,
    provider: provider.id,
  };
}
