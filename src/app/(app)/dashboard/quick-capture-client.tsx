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
    <div className="surface-card flex flex-col gap-4 p-4 sm:p-5">
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
        className="min-h-28 resize-none"
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Ctrl + Enter saves your note. Ctrl + Shift + Enter generates one with AI.
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
