"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge } from "@/components/ai/ai-badge";
import { generateQuickCaptureNoteAction, quickCaptureAction } from "./actions";

type PendingAction = "save" | "generate" | null;

const CAPTURE_STARTERS = [
  "Meeting notes",
  "Project idea",
  "Weekly reflection",
] as const;

export function QuickCaptureClient() {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null);

  const isPending = pendingAction !== null;

  async function createPlainNote() {
    const content = text.trim();
    if (!content) return;

    setPendingAction("save");
    try {
      const result = await quickCaptureAction(content);
      setText("");
      toast.success("Note created");
      router.push(`/notes/${result.id}`);
    } catch {
      toast.error("Failed to create note");
    } finally {
      setPendingAction(null);
    }
  }

  async function createAiNote() {
    const prompt = text.trim();
    if (!prompt) return;

    setPendingAction("generate");
    try {
      const result = await generateQuickCaptureNoteAction(prompt);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setText("");
      toast.success("AI note created");
      router.push(`/notes/${result.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate note";
      toast.error(message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="surface-card flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="size-4" />
            Quick capture
          </div>
          <p className="text-sm text-muted-foreground">
            Write your own note or describe one for AI to draft.
          </p>
        </div>
        <AiBadge label="AI ready" className="shrink-0" />
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Try: Plan a 5-day vacation in Dubai with budget-friendly ideas..."
        aria-label="Quick capture note"
        className="min-h-32 resize-none rounded-xl border-border/70 bg-background/70 p-4 text-[0.95rem] leading-6 shadow-inner shadow-black/[0.015]"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
              void createAiNote();
              return;
            }
            void createPlainNote();
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="section-label mr-1">Start with</span>
        {CAPTURE_STARTERS.map((starter) => (
          <button
            key={starter}
            type="button"
            onClick={() =>
              setText((current) =>
                current.trim() ? `${current.trim()}\n${starter}: ` : `${starter}: `,
              )
            }
            disabled={isPending}
            className="rounded-full border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/20 hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {starter}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:flex pointer-coarse:hidden">
          <span className="inline-flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
            save
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>Shift</Kbd>
            <Kbd>Enter</Kbd>
            draft with AI
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void createPlainNote()}
            disabled={!text.trim() || isPending}
          >
            {pendingAction === "save" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            {pendingAction === "save" ? "Saving..." : "Save note"}
          </Button>
          <Button
            size="sm"
            onClick={() => void createAiNote()}
            disabled={!text.trim() || isPending}
          >
            {pendingAction === "generate" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {pendingAction === "generate" ? "Generating..." : "Generate with AI"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/70 bg-muted/60 px-1.5 py-0.5 font-mono text-[0.65rem] leading-none text-foreground/80">
      {children}
    </kbd>
  );
}
