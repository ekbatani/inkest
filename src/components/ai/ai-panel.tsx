"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  MessageSquarePlus,
  MessagesSquare,
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
import {
  getSelectedEditorText,
  insertTextAtCursor,
  replaceEntireEditorContent,
} from "@/components/editor/markdown-editor-utils";
import { AiBadge, AiIcon } from "@/components/ai/ai-badge";
import { createTaskAction } from "@/server/tasks/actions";
import { cn } from "@/lib/utils";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

// Dynamically imported so the react-markdown preview stack only loads once an AI
// result is actually rendered, instead of bundling with every editor toolbar.
const MarkdownPreview = dynamic(
  () => import("@/components/markdown/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

type ActionId =
  | "summarize"
  | "improve-writing"
  | "extract-tasks"
  | "create-project-plan"
  | "generate-mermaid"
  | "explain"
  | "translate"
  | "comment-selection"
  | "apply-comments";

type Props = {
  noteId: string;
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
  variant?: "menu" | "sidebar";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  initialAction?: ActionId;
};

type AiTarget = {
  kind: "selection" | "note";
  source: string;
  from?: number;
  to?: number;
};

type AiState =
  | { status: "idle" }
  | { status: "loading"; label: string }
  | { status: "result"; output: string; action: ActionId; target: AiTarget }
  | { status: "tasks"; tasks: ExtractedTask[] }
  | { status: "error"; message: string; notConfigured?: boolean };

type ExtractedTask = {
  title: string;
  priority: "none" | "low" | "medium" | "high";
};

const SELECTION_ONLY_ACTIONS: ActionId[] = [
  "explain",
  "translate",
  "comment-selection",
];

export function AiPanel({
  noteId,
  editorRef,
  variant = "menu",
  open,
  onOpenChange,
  onClose,
  initialAction,
}: Props) {
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

  const getSelection = React.useCallback(
    (): string | null => getSelectedEditorText(editorRef),
    [editorRef],
  );

  const getTarget = React.useCallback((): AiTarget => {
    const view = editorRef.current?.view;
    const selection = view?.state.selection.main;
    if (view && selection && selection.from !== selection.to) {
      return {
        kind: "selection",
        source: view.state.sliceDoc(selection.from, selection.to),
        from: selection.from,
        to: selection.to,
      };
    }
    return {
      kind: "note",
      source: view?.state.doc.toString() ?? "",
    };
  }, [editorRef]);

  const runAction = React.useCallback(async (
    action: ActionId,
    payload: Record<string, unknown>,
    target = getTarget(),
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
          notConfigured: res.status === 503,
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
      setState({ status: "result", output: data.output, action, target });
    } catch {
      setState({ status: "error", message: "Network error." });
    }
  }, [getTarget, noteId]);

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
    if (
      action === "create-project-plan" ||
      action === "generate-mermaid" ||
      action === "comment-selection" ||
      action === "apply-comments"
    ) {
      setPromptDialog({ action, needsLanguage: false, needsHint: true });
      return;
    }
    void runAction(action, sel ? { selectedText: sel } : {}, getTarget());
  };

  const initialActionRun = React.useRef(false);
  React.useEffect(() => {
    if (!initialAction || initialActionRun.current) return;
    initialActionRun.current = true;
    void runAction(initialAction, {}, getTarget());
  }, [getTarget, initialAction, runAction]);

  const submitPromptDialog = () => {
    if (!promptDialog) return;
    const sel = getSelection();
    const payload: Record<string, unknown> = {};
    if (sel) payload.selectedText = sel;
    if (promptDialog.needsLanguage) payload.targetLanguage = targetLanguage;
    if (promptDialog.needsHint) payload.promptHint = promptHint;
    setPromptDialog(null);
    setPromptHint("");
    void runAction(promptDialog.action, payload, getTarget());
  };

  const close = () => {
    setState({ status: "idle" });
    onClose?.();
  };

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

  const onAppend = () => {
    if (state.status !== "result") return;
    const view = editorRef.current?.view;
    if (!view) return;
    const from = view.state.doc.length;
    const separator = from > 0 ? "\n\n" : "";
    view.dispatch({
      changes: { from, insert: `${separator}${state.output}\n` },
      selection: { anchor: from + separator.length + state.output.length + 1 },
    });
    view.focus();
    toast.success("AI output appended.");
    close();
  };

  const onReplace = () => {
    if (state.status !== "result") return;
    const view = editorRef.current?.view;
    if (!view) return;
    if (state.target.kind !== "selection" || state.target.from === undefined || state.target.to === undefined) {
      toast.error("This result was generated for the full note. Use Replace note instead.");
      return;
    }
    const currentSource = view.state.sliceDoc(state.target.from, state.target.to);
    if (currentSource !== state.target.source) {
      toast.error("The source changed. Run the AI action again before replacing it.");
      return;
    }
    view.dispatch({
      changes: { from: state.target.from, to: state.target.to, insert: state.output },
      selection: { anchor: state.target.from + state.output.length },
    });
    toast.success("Selection replaced with AI output.");
    close();
  };

  const onReplaceNote = () => {
    if (state.status !== "result") return;
    if (state.target.kind !== "note") {
      toast.error("This result was generated for a selection. Use Replace selection instead.");
      return;
    }
    const currentSource = editorRef.current?.view?.state.doc.toString();
    if (currentSource !== state.target.source) {
      toast.error("The note changed. Run the AI action again before replacing it.");
      return;
    }
    replaceEntireEditorContent(editorRef, state.output);
    toast.success("Note replaced with AI revision.");
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
      {variant === "sidebar" ? (
        <section aria-label="AI assistance" className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="size-3.5 text-violet-400" /> AI assistance
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose an action for this open note, or select text first for selection-specific actions.
              </p>
            </div>
            <Button variant="ghost" size="icon-xs" onClick={close} aria-label="Close AI assistance">
              <X className="size-3.5" />
            </Button>
          </div>

          {state.status === "idle" && (
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <Button variant="outline" size="xs" onClick={() => onPickAction("summarize")}><FileText /> Summarize</Button>
              <Button variant="outline" size="xs" onClick={() => onPickAction("improve-writing")}><Wand2 /> Improve</Button>
              <Button variant="outline" size="xs" onClick={() => onPickAction("extract-tasks")}><ListChecks /> Tasks</Button>
              <Button variant="outline" size="xs" onClick={() => onPickAction("create-project-plan")}><FileText /> Plan</Button>
              <Button variant="outline" size="xs" onClick={() => onPickAction("explain")}><HelpCircle /> Explain</Button>
              <Button variant="outline" size="xs" onClick={() => onPickAction("translate")}><Languages /> Translate</Button>
            </div>
          )}

          {state.status === "loading" && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border bg-background/80 p-3 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-violet-400" /> {state.label}
            </div>
          )}

          {state.status === "error" && (
            <div className="mt-3 rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-xs">
              <p>{state.message}</p>
              <div className="mt-3 flex justify-end gap-2">
                {state.notConfigured && <Button size="xs" nativeButton={false} render={<Link href="/help#ai" />}>Set up</Button>}
                <Button variant="outline" size="xs" onClick={() => setState({ status: "idle" })}>Back</Button>
              </div>
            </div>
          )}

          {state.status === "result" && (
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border bg-background/80 p-2.5 text-xs">
                <p className="font-medium text-foreground">Review before applying</p>
                <p className="mt-1 text-muted-foreground">
                  Target: {state.target.kind === "selection" ? "the selected text" : "the entire open note"}. Your source is unchanged.
                </p>
              </div>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-xl border bg-background/80 p-2.5 text-xs">
                <div><p className="mb-1 font-medium text-muted-foreground">Current source</p><pre className="max-h-24 overflow-auto whitespace-pre-wrap font-sans text-muted-foreground">{state.target.source}</pre></div>
                <div><p className="mb-1 font-medium text-violet-500">AI proposal</p><MarkdownPreview content={state.output} /></div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button variant="outline" size="xs" onClick={onCopy}><Copy /> Copy</Button>
                {state.target.kind === "selection" ? <Button variant="outline" size="xs" onClick={onReplace}><Replace /> Replace</Button> : <Button variant="outline" size="xs" onClick={onReplaceNote}><Replace /> Replace note</Button>}
                <Button size="xs" onClick={onAppend}><Plus /> Append</Button>
                <Button variant="ghost" size="xs" onClick={() => setState({ status: "idle" })}>Cancel</Button>
              </div>
            </div>
          )}

          {state.status === "tasks" && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Review the extracted tasks before creating them for this note.</p>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border bg-background/80 p-2 text-xs">{state.tasks.map((task, index) => <li key={`${task.title}-${index}`}>{task.title}</li>)}</ul>
              <div className="flex flex-wrap justify-end gap-1.5"><Button variant="outline" size="xs" onClick={() => setState({ status: "idle" })}>Cancel</Button><Button size="xs" onClick={onInsertTasks} disabled={insertingTasks}>{insertingTasks ? <Loader2 className="animate-spin" /> : <Plus />} Create tasks</Button></div>
            </div>
          )}
        </section>
      ) : (
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-foreground/80 hover:text-foreground aria-expanded:text-foreground"
            />
          }
        >
          <Sparkles
            className={cn(
              "size-4 text-violet-400",
              state.status === "loading" && "ai-sparkle-pulse",
            )}
          />
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
            <DropdownMenuItem onClick={() => onPickAction("comment-selection")}>
              <MessageSquarePlus className="size-4" /> Add AI comment...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPickAction("apply-comments")}>
              <MessagesSquare className="size-4" /> Apply comments...
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      )}

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
                  promptDialog?.action === "comment-selection"
                    ? "e.g. focus on clarity and missing context"
                    : promptDialog?.action === "apply-comments"
                      ? "e.g. keep the tone casual"
                      : promptDialog?.action === "generate-mermaid"
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
          variant === "menu" && (state.status === "result" ||
          state.status === "error" ||
          state.status === "tasks")
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
                {state.notConfigured && (
                  <Button
                    size="sm"
                    nativeButton={false}
                    render={<Link href="/help#ai" />}
                  >
                    Set it up →
                  </Button>
                )}
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
                {state.action === "apply-comments" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onReplaceNote}
                    className="gap-1.5"
                  >
                    <Replace className="size-4" /> Replace note
                  </Button>
                )}
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

      {variant === "menu" && state.status === "loading" && (
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
  "comment-selection": "Writing comment...",
  "apply-comments": "Applying comments...",
};
