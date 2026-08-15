"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Check, X, Split, Columns2, FileText, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { computeLineDiff, getDiffStats, type DiffLine } from "@/lib/diff-utils";
import { cn } from "@/lib/utils";

const MarkdownPreview = dynamic(
  () => import("@/components/markdown/markdown-preview").then((m) => m.MarkdownPreview),
  { ssr: false },
);

type DiffViewMode = "inline" | "split" | "preview";

type Props = {
  originalText: string;
  modifiedText: string;
  scopeLabel?: string;
  onApply: () => void;
  onCancel?: () => void;
  className?: string;
};

export function AiDiffViewer({
  originalText,
  modifiedText,
  scopeLabel = "note",
  onApply,
  onCancel,
  className,
}: Props) {
  const [viewMode, setViewMode] = React.useState<DiffViewMode>("inline");

  const diffLines = React.useMemo<DiffLine[]>(() => {
    return computeLineDiff(originalText, modifiedText);
  }, [originalText, modifiedText]);

  const stats = React.useMemo(() => getDiffStats(diffLines), [diffLines]);

  return (
    <div className={cn("flex flex-col rounded-2xl border border-border/80 bg-background/95 shadow-lg", className)}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Review Changes</span>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
            Target: {scopeLabel}
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Plus className="size-3" />
              {stats.additions}
            </span>
            <span className="inline-flex items-center gap-0.5 font-medium text-rose-600 dark:text-rose-400">
              <Minus className="size-3" />
              {stats.deletions}
            </span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-0.5">
          <Button
            type="button"
            variant={viewMode === "inline" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setViewMode("inline")}
            className="h-6 gap-1 px-2 text-[11px]"
            title="Inline unified diff"
          >
            <Split className="size-3" />
            Unified
          </Button>
          <Button
            type="button"
            variant={viewMode === "split" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setViewMode("split")}
            className="h-6 gap-1 px-2 text-[11px]"
            title="Side by side comparison"
          >
            <Columns2 className="size-3" />
            Side-by-side
          </Button>
          <Button
            type="button"
            variant={viewMode === "preview" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setViewMode("preview")}
            className="h-6 gap-1 px-2 text-[11px]"
            title="Rendered Markdown preview"
          >
            <FileText className="size-3" />
            Preview
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="max-h-[50vh] min-h-[140px] p-3">
        {viewMode === "inline" && (
          <div className="font-mono text-[11.5px] leading-relaxed select-text space-y-0.5">
            {diffLines.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 rounded px-2 py-0.5",
                  line.type === "added" && "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
                  line.type === "removed" && "bg-rose-500/15 text-rose-900 line-through dark:text-rose-200 opacity-80",
                  line.type === "unchanged" && "text-muted-foreground",
                )}
              >
                <span className="w-4 select-none text-center opacity-60 font-bold shrink-0">
                  {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-all">{line.value || " "}</span>
              </div>
            ))}
          </div>
        )}

        {viewMode === "split" && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 text-xs">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-2.5">
              <p className="mb-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">Current Source</p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-muted-foreground">
                {originalText}
              </pre>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-2.5">
              <p className="mb-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Proposed Edits</p>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-foreground">
                {modifiedText}
              </pre>
            </div>
          </div>
        )}

        {viewMode === "preview" && (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl border bg-muted/10 p-3">
            <MarkdownPreview content={modifiedText} />
          </div>
        )}
      </ScrollArea>

      {/* Footer Controls */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t px-3.5 py-2.5 bg-muted/20">
        {onCancel && (
          <Button variant="ghost" size="xs" onClick={onCancel} className="h-7 text-xs">
            <X className="size-3.5 mr-1" />
            Cancel
          </Button>
        )}
        <Button size="xs" onClick={onApply} className="h-7 gap-1 text-xs font-medium">
          <Check className="size-3.5" />
          Apply changes
        </Button>
      </div>
    </div>
  );
}
