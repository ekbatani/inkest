"use client";

import * as React from "react";
import { Sparkles, Loader2, Copy, Check, X, Plus, Replace } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { insertTextAtCursor } from "@/components/editor/markdown-editor";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";

type Props = {
  noteId: string;
  editorRef: React.RefObject<ReactCodeMirrorRef | null>;
};

type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "result"; output: string }
  | { status: "error"; message: string };

export function AiPanel({ noteId, editorRef }: Props) {
  const [state, setState] = React.useState<AiState>({ status: "idle" });
  const [copied, setCopied] = React.useState(false);

  const runSummarize = async () => {
    setState({ status: "loading" });

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize", noteId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "AI request failed." });
        return;
      }

      setState({ status: "result", output: data.output });
    } catch {
      setState({ status: "error", message: "Network error." });
    }
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-1.5" />
          }
        >
          <Sparkles className="size-4 text-muted-foreground" />
          <span className="hidden sm:inline">AI</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={runSummarize}>
            <Sparkles className="size-4" /> Summarize note
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={state.status === "result" || state.status === "error"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent className="sm:max-w-2xl">
          {state.status === "error" && (
            <>
              <DialogHeader>
                <DialogTitle>AI action failed</DialogTitle>
                <DialogDescription>
                  {state.message}
                </DialogDescription>
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
                  <Sparkles className="size-4" /> AI Summary
                </DialogTitle>
                <DialogDescription>
                  Review the summary before inserting it into your note.
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
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
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
        </DialogContent>
      </Dialog>

      {(state.status === "loading") && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border bg-card px-4 py-3 shadow-lg">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Summarizing…</span>
        </div>
      )}
    </>
  );
}
