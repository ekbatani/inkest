"use client";

import * as React from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  X,
  Plus,
  Replace,
  ListChecks,
  Wand2,
  GitGraph,
  HelpCircle,
  Languages,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { insertTextAtCursor } from "@/components/editor/markdown-editor";
import { AiBadge, AiIcon } from "@/components/ai/ai-badge";
import { createTaskAction } from "@/server/tasks/actions";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

type Props = {
  noteId: string;
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
};

type ActionId =
  | "summarize"
  | "improve-writing"
  | "extract-tasks"
  | "create-project-plan"
  | "generate-mermaid"
  | "explain"
  | "translate";

type AiState =
  | { status: "idle" }
  | { status: "loading"; label: string }
  | { status: "result"; output: string; action: ActionId }
  | { status: "tasks"; tasks: ExtractedTask[] }
  | { status: "error"; message: string };

type ExtractedTask = {
  title: string;
  priority: "none" | "low" | "medium" | "high";
};

const SELECTION_ONLY_ACTIONS: ActionId[] = ["explain", "translate"];

export function AiPanel({ noteId, editorRef }: Props) {
  const [state, setState] = React.useState<AiState>({ status: "idle" });
  const [copied, setCopied] = React.useState(false);
  const [promptDialog, setPromptDialog] = React.useState<{
    action: ActionId;
    needsLanguage: boolean;
    needsHint: boolean;
  } | null>(null);
  const [targetLanguage, setTargetLanguage] = React.useState("English");
  const [promptHint, setPromptHint] = React.useState("");
  const [insertingTasks, setInsertingTasks] = React.useState(false);

  const getSelection = (): string | null => {
    const view = editorRef.current?.view;
    if (!view) return null;
    const sel = view.state.selection.main;
    if (sel.from === sel.to) return null;
    return view.state.sliceDoc(sel.from, sel.to).trim() || null;
  };

  const runAction = async (
    action: ActionId,
    payload: Record<string, unknown>,
  ) => {
    const label = ACTION_LABELS[action] ?? "Running AI...";
    setState({ status: "loading", label });
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, noteId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({
          status: "error",
          message: data?.error ?? "AI request failed.",
        });
        return;
      }
      if (data.kind === "tasks") {
        if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
          setState({
            status: "error",
            message: "AI did not extract any tasks.",
          });
          return;
        }
        setState({ status: "tasks", tasks: data.tasks });
        return;
      }
      setState({ status: "result", output: data.output, action });
    } catch {
      setState({ status: "error", message: "Network error." });
    }
  };

  const onPickAction = (action: ActionId) => {
    const sel = getSelection();
    if (SELECTION_ONLY_ACTIONS.includes(action) && !sel) {
      toast.error("Select some text in the editor first.");
      return;
    }
    if (action === "translate") {
      setPromptDialog({ action, needsLanguage: true, needsHint: false });
      return;
    }
    if (action === "create-project-plan" || action === "generate-mermaid") {
      setPromptDialog({ action, needsLanguage: false, needsHint: true });
      return;
    }
    void runAction(action, sel ? { selectedText: sel } : {});
  };

  const submitPromptDialog = () => {
    if (!promptDialog) return;
    const sel = getSelection();
    const payload: Record<string, unknown> = {};
    if (sel) payload.selectedText = sel;
    if (promptDialog.needsLanguage) payload.targetLanguage = targetLanguage;
    if (promptDialog.needsHint) payload.promptHint = promptHint;
    setPromptDialog(null);
    setPromptHint("");
    void runAction(promptDialog.action, payload);
  };

  const close = () => setState({ status: "idle" });

  const onCopy = async () => {
    if (state.status !== "result") return;
    await navigator.clipboard.writeText(state.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard.");
  };

  const onInsert = () => {
    if (state.status !== "result") return;
    insertTextAtCursor(editorRef, `\n\n${state.output}\n\n`);
    toast.success("AI output inserted.");
    close();
  };

  const onReplace = () => {
    if (state.status !== "result") return;
    const view = editorRef.current?.view;
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.from === sel.to) {
      toast.error("Select text in the editor to replace.");
      return;
    }
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: state.output },
      selection: { anchor: sel.from + state.output.length },
    });
    toast.success("Selection replaced with AI output.");
    close();
  };

  const onInsertTasks = async () => {
    if (state.status !== "tasks") return;
    setInsertingTasks(true);
    let inserted = 0;
    for (const t of state.tasks) {
      try {
        await createTaskAction({
          noteId,
          title: t.title,
          priority: t.priority,
          status: "todo",
          source: "ai",
        });
        inserted++;
      } catch {
        /* continue */
      }
    }
    setInsertingTasks(false);
    if (inserted > 0) {
      toast.success(`Added ${inserted} task${inserted === 1 ? "" : "s"}.`);
    } else {
      toast.error("Failed to insert tasks.");
    }
    close();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-foreground/80 hover:text-foreground aria-expanded:text-foreground"
            />
          }
        >
          <Sparkles className="size-4 text-violet-400" />
          <span className="hidden sm:inline text-violet-400">AI</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>AI actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPickAction("summarize")}>
              <FileText className="size-4" /> Summarize note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPickAction("improve-writing")}>
              <Wand2 className="size-4" /> Improve writing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPickAction("extract-tasks")}>
              <ListChecks className="size-4" /> Extract tasks
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPickAction("create-project-plan")}>
              <FileText className="size-4" /> Create project plan...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPickAction("generate-mermaid")}>
              <GitGraph className="size-4" /> Generate diagram...
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onPickAction("explain")}>
              <HelpCircle className="size-4" /> Explain selection
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPickAction("translate")}>
              <Languages className="size-4" /> Translate selection...
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={Boolean(promptDialog)}
        onOpenChange={(open) => !open && setPromptDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {promptDialog?.action === "translate"
                ? "Translate selection"
                : "Generate AI output"}
            </DialogTitle>
            <DialogDescription>
              {promptDialog?.needsLanguage
                ? "Pick the language to translate the selected text into."
                : "Optionally describe what you want from the AI."}
            </DialogDescription>
          </DialogHeader>
          {promptDialog?.needsLanguage ? (
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="ai-target-language"
                className="text-xs text-muted-foreground"
              >
                Target language
              </Label>
              <Input
                id="ai-target-language"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                list="ai-common-languages"
              />
              <datalist id="ai-common-languages">
                <option value="English" />
                <option value="Persian" />
                <option value="French" />
                <option value="German" />
                <option value="Spanish" />
                <option value="Arabic" />
              </datalist>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ai-hint" className="text-xs text-muted-foreground">
                Instructions (optional)
              </Label>
              <Input
                id="ai-hint"
                value={promptHint}
                onChange={(e) => setPromptHint(e.target.value)}
                placeholder={
                  promptDialog?.action === "generate-mermaid"
                    ? "e.g. show the timeline as a gantt chart"
                    : "e.g. focus on shipping MVP in 4 weeks"
                }
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setPromptDialog(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitPromptDialog}>
              Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={
          state.status === "result" ||
          state.status === "error" ||
          state.status === "tasks"
        }
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent className="sm:max-w-2xl">
          {state.status === "error" && (
            <>
              <DialogHeader>
                <DialogTitle>AI action failed</DialogTitle>
                <DialogDescription>{state.message}</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={close}>
                  <X className="size-4" /> Close
                </Button>
              </div>
            </>
          )}
          {state.status === "result" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AiBadge label="AI output" />
                </DialogTitle>
                <DialogDescription>
                  Review before inserting into your note.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh] rounded-lg border p-4">
                <MarkdownPreview content={state.output} />
              </ScrollArea>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCopy}
                  className="gap-1.5"
                >
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReplace}
                  className="gap-1.5"
                >
                  <Replace className="size-4" /> Replace selection
                </Button>
                <Button size="sm" onClick={onInsert} className="gap-1.5">
                  <Plus className="size-4" /> Insert
                </Button>
              </div>
            </>
          )}
          {state.status === "tasks" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ListChecks className="size-4" /> Extracted tasks
                </DialogTitle>
                <DialogDescription>
                  Insert these as tasks for this note, or copy them as a Markdown
                  checklist.
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh] rounded-lg border p-4">
                <ul className="flex flex-col gap-1.5">
                  {state.tasks.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={false}
                        readOnly
                        className="mt-1 size-4"
                      />
                      <span className="flex-1">{t.title}</span>
                      {t.priority !== "none" && (
                        <span
                          className={
                            "rounded px-1.5 py-0.5 text-[10px] " +
                            (t.priority === "high"
                              ? "bg-destructive/10 text-destructive"
                              : t.priority === "medium"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                                : "bg-muted text-muted-foreground")
                          }
                        >
                          {t.priority}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const md = state.tasks.map((t) => `- [ ] ${t.title}`).join("\n");
                    insertTextAtCursor(editorRef, `\n${md}\n`);
                    toast.success("Inserted as Markdown checklist.");
                    close();
                  }}
                  className="gap-1.5"
                >
                  <Plus className="size-4" /> Insert as checklist
                </Button>
                <Button
                  size="sm"
                  onClick={onInsertTasks}
                  disabled={insertingTasks}
                  className="gap-1.5"
                >
                  {insertingTasks ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Add as tasks
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {state.status === "loading" && (
        <div className="surface-card fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 shadow-lg">
          <span className="relative">
            <AiIcon />
            <Loader2 className="absolute -right-1 -top-1 size-3 animate-spin rounded-full bg-background" />
          </span>
          <span className="text-sm">{state.label}</span>
        </div>
      )}
    </>
  );
}

const ACTION_LABELS: Record<ActionId, string> = {
  summarize: "Summarizing...",
  "improve-writing": "Improving writing...",
  "extract-tasks": "Extracting tasks...",
  "create-project-plan": "Planning project...",
  "generate-mermaid": "Generating diagram...",
  explain: "Explaining...",
  translate: "Translating...",
};
