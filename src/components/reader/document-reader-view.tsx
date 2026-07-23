"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Columns,
  Rows,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Document as DocType } from "@/server/db/schema";

export function DocumentReaderView({
  doc,
  content,
}: {
  doc: DocType;
  content: string | Buffer;
}) {
  // Persisted typography and view mode settings
  const [fontFamily, setFontFamily] = React.useState<"sans" | "serif" | "mono">(() => {
    if (typeof window === "undefined") return "sans";
    const saved = localStorage.getItem("inkest:reader-font-family");
    if (saved === "serif" || saved === "mono" || saved === "sans") return saved;
    return "sans";
  });

  const [fontSize, setFontSize] = React.useState<number>(() => {
    if (typeof window === "undefined") return 16;
    const saved = localStorage.getItem("inkest:reader-font-size");
    return saved ? Number.parseInt(saved, 10) : 16;
  });

  const [isPaged, setIsPaged] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("inkest:reader-paged") === "true";
  });

  const [progressPercent, setProgressPercent] = React.useState<number>(0);

  const textContent = React.useMemo(() => {
    if (typeof content === "string") return content;
    return content.toString("utf8");
  }, [content]);

  // Position restore & scroll progress tracking
  const containerRef = React.useRef<HTMLDivElement>(null);
  const storageKey = `inkest:reader-pos:${doc.id}`;

  React.useEffect(() => {
    localStorage.setItem("inkest:reader-font-family", fontFamily);
    localStorage.setItem("inkest:reader-font-size", String(fontSize));
    localStorage.setItem("inkest:reader-paged", String(isPaged));
  }, [fontFamily, fontSize, isPaged]);

  React.useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved && containerRef.current) {
      const pos = Number.parseInt(saved, 10) || 0;
      containerRef.current.scrollTop = pos;
    }
  }, [storageKey]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollPos = target.scrollTop;
    const maxScroll = target.scrollHeight - target.clientHeight;
    const pct = maxScroll > 0 ? Math.round((scrollPos / maxScroll) * 100) : 0;
    setProgressPercent(pct);
    localStorage.setItem(storageKey, String(scrollPos));
  };

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Reader Topbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href="/reader" aria-label="Back to reader library" />}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{doc.title}</h1>
            <span className="text-[11px] text-muted-foreground uppercase">{doc.fileType}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-[11px] gap-1">
            <span>{progressPercent}% read</span>
          </Badge>

          {/* Typography Controls */}
          <div className="flex items-center rounded-lg border p-1 bg-muted/40 gap-1 text-xs">
            <Button
              variant={fontFamily === "sans" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setFontFamily("sans")}
              title="Sans-serif"
            >
              <span className="font-sans font-semibold">Aa</span>
            </Button>
            <Button
              variant={fontFamily === "serif" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setFontFamily("serif")}
              title="Serif"
            >
              <span className="font-serif font-semibold">Aa</span>
            </Button>
            <Button
              variant={fontFamily === "mono" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setFontFamily("mono")}
              title="Monospace"
            >
              <span className="font-mono font-semibold">Aa</span>
            </Button>
          </div>

          <div className="flex items-center border rounded-lg p-1 bg-muted/40 gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setFontSize((s) => Math.max(12, s - 2))}
            >
              A-
            </Button>
            <span className="text-xs px-1 font-mono">{fontSize}px</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setFontSize((s) => Math.min(24, s + 2))}
            >
              A+
            </Button>
          </div>

          <Button
            variant={isPaged ? "default" : "outline"}
            size="xs"
            onClick={() => setIsPaged(!isPaged)}
            className="gap-1.5"
          >
            {isPaged ? <Columns className="size-3.5" /> : <Rows className="size-3.5" />}
            {isPaged ? "Paged" : "Continuous"}
          </Button>
        </div>
      </header>

      {/* Reading Progress Line */}
      <div className="h-0.5 w-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Reader Content Body */}
      <main
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 sm:p-12"
      >
        <div
          className={`mx-auto max-w-3xl rounded-xl border bg-card p-8 sm:p-12 shadow-sm ${
            fontFamily === "serif"
              ? "font-serif"
              : fontFamily === "mono"
                ? "font-mono"
                : "font-sans"
          }`}
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
        >
          {doc.fileType === "pdf" ? (
            <iframe
              src={`/api/attachments/${doc.attachmentId}`}
              className="h-[75vh] w-full rounded-lg border-0"
              title={doc.title}
            />
          ) : (
            <article className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
              {textContent}
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
