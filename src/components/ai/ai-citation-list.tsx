"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  FileText,
  ExternalLink,
  Info,
  Sparkles,
  Quote,
  Layers,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface CitationItem {
  id: string;
  sourceType: "note" | "document" | "project" | string;
  sourceId: string;
  title: string;
  quotedText: string;
  locationPointer?: string;
}

interface Props {
  citations?: CitationItem[];
  transformType?: string;
  uncertaintyNote?: string;
  className?: string;
}

export function AiCitationList({
  citations = [],
  transformType,
  uncertaintyNote,
  className,
}: Props) {
  if (citations.length === 0 && !uncertaintyNote && !transformType) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-violet-500/[0.02] to-background p-3 text-xs shadow-xs",
        className,
      )}
    >
      {transformType ? (
        <div className="flex items-center gap-1.5 font-medium text-violet-700 dark:text-violet-300">
          <Sparkles className="size-3.5 text-violet-500 shrink-0" />
          <span>
            Action:{" "}
            <strong className="capitalize text-foreground font-semibold">
              {transformType.replace(/-/g, " ")}
            </strong>
          </span>
        </div>
      ) : null}

      {citations.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <Layers className="size-3 text-muted-foreground/80 shrink-0" />
            <span>Referenced Workspace Sources ({citations.length}):</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {citations.map((c, idx) => {
              const href =
                c.sourceType === "note"
                  ? `/notes/${c.sourceId}`
                  : c.sourceType === "project"
                    ? `/projects/${c.sourceId}`
                    : `/reader/${c.sourceId}`;

              const isDoc = c.sourceType === "document";
              const isProject = c.sourceType === "project";

              return (
                <Popover key={c.id || idx}>
                  <PopoverTrigger
                    className={cn(
                      "group inline-flex items-center gap-1.5 rounded-lg border bg-background/95 px-2.5 py-1 text-[11px] font-medium shadow-xs transition-all",
                      "border-border/70 hover:border-violet-500/60 hover:bg-violet-500/5 hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    )}
                  >
                    {isDoc ? (
                      <BookOpen className="size-3 text-emerald-500 shrink-0" />
                    ) : isProject ? (
                      <FileText className="size-3 text-blue-500 shrink-0" />
                    ) : (
                      <FileText className="size-3 text-violet-500 shrink-0" />
                    )}
                    <span className="max-w-[150px] truncate text-foreground/90">
                      {c.title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="px-1 py-0 text-[9px] font-normal leading-tight text-muted-foreground uppercase"
                    >
                      {c.sourceType}
                    </Badge>
                  </PopoverTrigger>

                  <PopoverContent
                    side="top"
                    align="start"
                    className="w-80 p-3 space-y-2 text-xs shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2 border-b pb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {isDoc ? (
                            <BookOpen className="size-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <FileText className="size-3.5 text-violet-500 shrink-0" />
                          )}
                          <p className="font-semibold text-foreground truncate">
                            {c.title}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                          Workspace {c.sourceType}
                        </p>
                      </div>
                      <Link
                        href={href}
                        target="_blank"
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-foreground hover:bg-muted/80 transition-colors shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="size-2.5" />
                      </Link>
                    </div>

                    {c.quotedText ? (
                      <div className="rounded-md bg-muted/40 p-2 text-muted-foreground border border-border/50">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-foreground/80 mb-1">
                          <Quote className="size-2.5 text-violet-500" />
                          <span>Referenced Excerpt:</span>
                        </div>
                        <p className="line-clamp-4 italic text-[11px] leading-relaxed">
                          &ldquo;{c.quotedText}&rdquo;
                        </p>
                      </div>
                    ) : null}

                    {c.locationPointer && (
                      <p className="text-[10px] text-muted-foreground/80 truncate">
                        Location: {c.locationPointer}
                      </p>
                    )}
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      ) : null}

      {uncertaintyNote ? (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-400/90 pt-0.5">
          <Info className="size-3 shrink-0 mt-0.5" />
          <p className="italic leading-relaxed">{uncertaintyNote}</p>
        </div>
      ) : null}
    </div>
  );
}

