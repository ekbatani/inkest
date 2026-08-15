"use client";

import * as React from "react";
import {
  Bot,
  Sparkles,
  Loader2,
  Play,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  ListTodo,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { runAgentTaskAction } from "@/server/agent/actions";
import type { AgentLoopResult } from "@/server/agent/loop";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { insertTextAtCursor } from "@/components/editor/markdown-editor-utils";

interface AgenticTaskPanelProps {
  noteId?: string;
  noteTitle?: string;
  noteContent?: string;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
}

export function AgenticTaskPanel({
  noteId,
  noteTitle,
  noteContent,
  editorRef,
}: AgenticTaskPanelProps) {
  const [goal, setGoal] = React.useState("");
  const [maxSteps, setMaxSteps] = React.useState(6);
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<AgentLoopResult | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [expandedSteps, setExpandedSteps] = React.useState<Record<number, boolean>>({});

  const quickPrompts = [
    {
      label: "Decompose into Tasks",
      icon: ListTodo,
      prompt: "Analyze this note, break it down into actionable sub-tasks with priorities, and attach them.",
    },
    {
      label: "Synthesize Linked Notes",
      icon: Search,
      prompt: "Search the workspace for notes related to this topic, summarize insights, and synthesize connections.",
    },
    {
      label: "Refine & Create Action Plan",
      icon: FileText,
      prompt: "Review this note for missing requirements or risks, create a structured implementation plan, and append next actions.",
    },
  ];

  const handleRunLoop = async (taskGoal = goal) => {
    if (!taskGoal.trim()) {
      toast.error("Please enter a goal or task instruction for the agent.");
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const loopResult = await runAgentTaskAction({
        noteId,
        goal: taskGoal.trim(),
        maxSteps,
      });

      if (!loopResult.ok) {
        toast.error(loopResult.error || "Agent loop failed to execute.");
      } else {
        toast.success(`Agent completed task in ${loopResult.iterations} steps!`);
      }

      setResult(loopResult);
      // Auto-expand last step and any tool calls
      const nextExp: Record<number, boolean> = {};
      loopResult.steps.forEach((s) => {
        nextExp[s.step] = Boolean(s.toolCall || s.status === "error");
      });
      setExpandedSteps(nextExp);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to run agent loop.");
    } finally {
      setRunning(false);
    }
  };

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const copyAnswer = () => {
    if (!result?.finalAnswer) return;
    void navigator.clipboard.writeText(result.finalAnswer);
    setCopied(true);
    toast.success("Final answer copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const insertIntoEditor = () => {
    if (!result?.finalAnswer || !editorRef) return;
    insertTextAtCursor(editorRef, `\n\n${result.finalAnswer}\n`);
    toast.success("Inserted agent output into note!");
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="size-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Autonomous Agent Loop</h3>
            <p className="text-[11px] text-muted-foreground">
              Multi-step ReAct planning and execution
            </p>
          </div>
        </div>
        <Badge variant="outline" className="font-mono text-[10px]">
          ReAct v1
        </Badge>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Suggested Goals
        </span>
        <div className="flex flex-col gap-1.5">
          {quickPrompts.map((qp) => {
            const Icon = qp.icon;
            return (
              <button
                key={qp.label}
                type="button"
                onClick={() => {
                  setGoal(qp.prompt);
                  void handleRunLoop(qp.prompt);
                }}
                disabled={running}
                className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/60 px-2.5 py-1.5 text-left text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Icon className="size-3.5 text-primary shrink-0" />
                <span className="truncate">{qp.label}</span>
                <ArrowRight className="size-3 ml-auto opacity-60" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal Input & Controls */}
      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-3">
        <Textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe what you want the autonomous agent to accomplish..."
          rows={3}
          disabled={running}
          className="text-xs resize-none"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>Max steps:</span>
            <select
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              disabled={running}
              className="rounded border bg-background px-1.5 py-0.5 text-xs font-mono"
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
            </select>
          </div>

          <Button
            size="sm"
            onClick={() => handleRunLoop()}
            disabled={running || !goal.trim()}
            className="gap-1.5"
          >
            {running ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Running Loop...</span>
              </>
            ) : (
              <>
                <Play className="size-3.5" />
                <span>Execute Goal</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Execution Trace & Steps */}
      {result && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Execution Trace ({result.steps.length} Steps)
            </span>
            <Badge variant={result.ok ? "secondary" : "outline"} className="text-[10px]">
              {result.ok ? "Completed" : "Failed"}
            </Badge>
          </div>

          <div className="flex flex-col gap-2">
            {result.steps.map((step) => {
              const isExpanded = expandedSteps[step.step];
              return (
                <div
                  key={step.step}
                  className="flex flex-col rounded-lg border border-border/70 bg-card/60 overflow-hidden text-[11px]"
                >
                  <button
                    type="button"
                    onClick={() => toggleStep(step.step)}
                    className="flex items-center justify-between gap-2 p-2.5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {step.status === "error" ? (
                        <AlertCircle className="size-3.5 text-destructive shrink-0" />
                      ) : step.toolCall ? (
                        <Wrench className="size-3.5 text-primary shrink-0" />
                      ) : (
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span className="font-semibold text-foreground">
                        Step {step.step}:
                      </span>
                      <span className="truncate text-muted-foreground">
                        {step.toolCall
                          ? `Called tool: ${step.toolCall.name}`
                          : step.thought.slice(0, 60)}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="flex flex-col gap-2 border-t border-border/60 bg-muted/20 p-2.5">
                      {/* Thought */}
                      <div>
                        <span className="font-semibold text-foreground/80">Thought:</span>
                        <p className="mt-0.5 text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {step.thought}
                        </p>
                      </div>

                      {/* Tool call */}
                      {step.toolCall && (
                        <div className="rounded border bg-background/80 p-2 font-mono text-[10px]">
                          <span className="text-primary font-semibold">
                            {step.toolCall.name}
                          </span>
                          <pre className="mt-1 text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(step.toolCall.args, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Tool result */}
                      {step.toolResult && (
                        <div className="rounded border bg-background/80 p-2 font-mono text-[10px]">
                          <span className="text-muted-foreground font-semibold">
                            Output:
                          </span>
                          <pre className="mt-1 text-foreground/90 overflow-x-auto whitespace-pre-wrap max-h-32">
                            {JSON.stringify(
                              step.toolResult.data ?? step.toolResult.error,
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Final Answer Card */}
          {result.finalAnswer && (
            <div className="flex flex-col gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" /> Final Synthesis
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={copyAnswer}
                    className="gap-1 h-6 px-2 text-[10px]"
                  >
                    {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  {editorRef && (
                    <Button
                      size="xs"
                      onClick={insertIntoEditor}
                      className="h-6 px-2 text-[10px]"
                    >
                      Insert in Note
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-foreground whitespace-pre-wrap bg-background/80 rounded-lg p-2.5 border">
                {result.finalAnswer}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
