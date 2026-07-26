"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, FileText, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CitationItem {
  id: string;
  sourceType: "note" | "document";
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
    <div className={cn("space-y-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs", className)}>
      {transformType ? (
        <div className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-300">
          <Info className="size-3.5" />
          <span>AI Transformation: <strong className="capitalize">{transformType.replace(/-/g, " ")}</strong></span>
        </div>
      ) : null}

      {citations.length > 0 ? (
        <div>
          <p className="mb-1.5 font-medium text-foreground">
            Grounded Sources ({citations.length}):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {citations.map((c, idx) => {
              const href = c.sourceType === "note"
                ? `/notes/${c.sourceId}`
                : `/reader/${c.sourceId}`;

              return (
                <Link
                  key={c.id || idx}
                  href={href}
                  target="_blank"
                  className="group inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm transition-colors hover:border-violet-500 hover:text-foreground"
                  title={c.quotedText}
                >
                  {c.sourceType === "note" ? (
                    <FileText className="size-3 text-blue-500" />
                  ) : (
                    <BookOpen className="size-3 text-emerald-500" />
                  )}
                  <span className="max-w-[140px] truncate">{c.title}</span>
                  <ExternalLink className="size-2.5 opacity-60 group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {uncertaintyNote ? (
        <p className="text-[11px] italic text-amber-600 dark:text-amber-400">
          {uncertaintyNote}
        </p>
      ) : null}
    </div>
  );
}
