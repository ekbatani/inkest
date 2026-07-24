"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Columns,
  Rows,
  Highlighter,
  MessageSquare,
  FilePlus,
  Trash2,
  Bookmark,
  Check,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Document as DocType, Annotation } from "@/server/db/schema";
import {
  createAnnotationAction,
  listAnnotationsAction,
  deleteAnnotationAction,
  extractAnnotationAction,
} from "@/server/documents/annotations-actions";
import { toast } from "sonner";

export function DocumentReaderView({
  doc,
  content,
  initialAnnotations = [],
}: {
  doc: DocType;
  content: string | Buffer;
  initialAnnotations?: Annotation[];
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
  const [annotations, setAnnotations] = React.useState<Annotation[]>(initialAnnotations);
  const [showAnnotationsDrawer, setShowAnnotationsDrawer] = React.useState(false);

  // Text selection floating popup state
  const [selectedText, setSelectedText] = React.useState<string>("");
  const [popupPos, setPopupPos] = React.useState<{ top: number; left: number } | null>(null);
  const [commentInput, setCommentInput] = React.useState<string>("");
  const [showCommentField, setShowCommentField] = React.useState(false);

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

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectedText("");
      setPopupPos(null);
      setShowCommentField(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 2) {
      setSelectedText(text);
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setPopupPos({
        top: Math.max(10, rect.top - 50),
        left: rect.left + rect.width / 2,
      });
    }
  };

  const handleAddHighlight = async (color = "yellow") => {
    if (!selectedText) return;
    try {
      const newAnn = await createAnnotationAction({
        documentId: doc.id,
        highlightText: selectedText,
        comment: commentInput.trim() || undefined,
        color,
      });
      if (newAnn) {
        setAnnotations((prev) => [newAnn, ...prev]);
        toast.success("Highlight saved.");
      }
    } catch {
      toast.error("Failed to save highlight.");
    } finally {
      setSelectedText("");
      setPopupPos(null);
      setCommentInput("");
      setShowCommentField(false);
    }
  };

  const handleExtractToNote = async (ann: Annotation) => {
    try {
      const result = await extractAnnotationAction({
        annotationId: ann.id,
        documentTitle: doc.title,
      });
      if (result) {
        toast.success(`Extracted to note: "${result.note.title}"`);
        setAnnotations((prev) =>
          prev.map((a) => (a.id === ann.id ? { ...a, noteId: result.note.id } : a)),
        );
      }
    } catch {
      toast.error("Failed to extract note.");
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    try {
      await deleteAnnotationAction(annId, doc.id);
      setAnnotations((prev) => prev.filter((a) => a.id !== annId));
      toast.success("Annotation removed.");
    } catch {
      toast.error("Failed to delete annotation.");
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-background relative">
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

          <Button
            variant={showAnnotationsDrawer ? "default" : "outline"}
            size="xs"
            onClick={() => setShowAnnotationsDrawer(!showAnnotationsDrawer)}
            className="gap-1.5"
          >
            <Bookmark className="size-3.5" />
            Annotations ({annotations.length})
          </Button>

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

      {/* Main Container with Optional Annotations Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Reader Content Body */}
        <main
          ref={containerRef}
          onScroll={handleScroll}
          onMouseUp={handleTextSelection}
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
              <article className="prose dark:prose-invert max-w-none whitespace-pre-wrap selection:bg-amber-200 dark:selection:bg-amber-800">
                {textContent}
              </article>
            )}
          </div>
        </main>

        {/* Annotations Margin Drawer */}
        {showAnnotationsDrawer && (
          <aside className="w-80 border-l bg-card p-4 overflow-y-auto space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Document Annotations ({annotations.length})
            </h3>

            {annotations.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg p-4">
                Highlight text inside the document to create persistent annotations and extract notes.
              </div>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="rounded-lg border bg-background p-3 space-y-2 text-xs shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[10px] uppercase text-amber-600 dark:text-amber-400">
                      {ann.color} Highlight
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => void handleDeleteAnnotation(ann.id)}
                    >
                      <Trash2 className="size-3 text-destructive" />
                    </Button>
                  </div>

                  {ann.highlightText && (
                    <blockquote className="border-l-2 border-amber-400 pl-2 italic text-muted-foreground">
                      "{ann.highlightText}"
                    </blockquote>
                  )}

                  {ann.comment && (
                    <p className="font-medium text-foreground">{ann.comment}</p>
                  )}

                  <div className="pt-2 flex justify-end">
                    {ann.noteId ? (
                      <Link
                        href={`/notes/${ann.noteId}`}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Check className="size-3" /> View Extract Note
                      </Link>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => void handleExtractToNote(ann)}
                        className="gap-1 text-[11px]"
                      >
                        <FilePlus className="size-3" /> Extract to Note
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </aside>
        )}
      </div>

      {/* Text Selection Floating Popup Toolbar */}
      {popupPos && selectedText && (
        <div
          className="fixed z-50 -translate-x-1/2 rounded-xl border bg-popover p-2 shadow-xl flex flex-col gap-2 animate-in fade-in zoom-in-95"
          style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => void handleAddHighlight("yellow")}
              className="size-6 rounded-full bg-amber-400 hover:scale-110 transition-transform"
              title="Yellow Highlight"
            />
            <button
              onClick={() => void handleAddHighlight("green")}
              className="size-6 rounded-full bg-emerald-400 hover:scale-110 transition-transform"
              title="Green Highlight"
            />
            <button
              onClick={() => void handleAddHighlight("blue")}
              className="size-6 rounded-full bg-sky-400 hover:scale-110 transition-transform"
              title="Blue Highlight"
            />
            <button
              onClick={() => void handleAddHighlight("pink")}
              className="size-6 rounded-full bg-pink-400 hover:scale-110 transition-transform"
              title="Pink Highlight"
            />

            <div className="h-4 w-px bg-border mx-1" />

            <Button
              variant="ghost"
              size="xs"
              onClick={() => setShowCommentField(!showCommentField)}
              className="gap-1 text-xs"
            >
              <MessageSquare className="size-3.5" /> Note
            </Button>
          </div>

          {showCommentField && (
            <div className="flex items-center gap-2 pt-1 border-t">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Add margin note…"
                className="h-7 w-48 rounded border bg-background px-2 text-xs outline-none"
                autoFocus
              />
              <Button size="xs" onClick={() => void handleAddHighlight("yellow")}>
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
