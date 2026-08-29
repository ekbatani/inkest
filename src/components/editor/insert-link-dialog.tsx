"use client";

import * as React from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  Search,
  FileText,
  FolderKanban,
  Calendar,
  Paperclip,
  ImageIcon,
  Globe,
  Plus,
  ExternalLink,
  Check,
  FileCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type WikiLinkTarget,
  getHeadingAnchorId,
  isImageAsset,
} from "@/lib/markdown/wiki";
import {
  insertWikiLink,
  insertMarkdownLink,
} from "@/components/editor/markdown-editor-utils";
import { cn } from "@/lib/utils";
import { createNoteWithTitleAction } from "@/server/notes/actions";
import { toast } from "sonner";

type Category = "all" | "notes" | "projects" | "assets" | "headings";

type HeadingTarget = {
  id: string;
  title: string;
  level: number;
  anchor: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editorRef?: React.RefObject<ReactCodeMirrorRef | null>;
  linkableNotes: WikiLinkTarget[];
  currentNoteContent?: string;
  prefilledQuery?: string;
  replaceRange?: { from: number; to: number };
  onTargetCreated?: (target: WikiLinkTarget) => void;
};

export function InsertLinkDialog({
  open,
  onOpenChange,
  editorRef,
  linkableNotes = [],
  currentNoteContent = "",
  prefilledQuery = "",
  replaceRange,
  onTargetCreated,
}: Props) {
  const [query, setQuery] = React.useState(prefilledQuery);
  const [alias, setAlias] = React.useState("");
  const [category, setCategory] = React.useState<Category>("all");
  const [linkMode, setLinkMode] = React.useState<"wiki" | "markdown">("wiki");
  const [isEmbed, setIsEmbed] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isCreatingNote, setIsCreatingNote] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Extract headings from current note content
  const currentHeadings = React.useMemo<HeadingTarget[]>(() => {
    if (!currentNoteContent) return [];
    const headings: HeadingTarget[] = [];
    const lines = currentNoteContent.split("\n");
    for (const line of lines) {
      const match = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].replace(/[`*_~]/g, "").trim();
        headings.push({
          id: `heading-${headings.length}`,
          title: rawTitle,
          level,
          anchor: getHeadingAnchorId(rawTitle),
        });
      }
    }
    return headings;
  }, [currentNoteContent]);

  // Adjust state during render when dialog opens
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery(prefilledQuery);
      setAlias(prefilledQuery);
      setSelectedIndex(0);
      setIsEmbed(false);
    }
  }

  React.useEffect(() => {
    if (open) {
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open]);

  const isWebUrl = React.useMemo(() => {
    const trimmed = query.trim();
    return /^(https?:\/\/|mailto:|tel:)/i.test(trimmed);
  }, [query]);

  // Filter items according to search query and category
  const filteredItems = React.useMemo(() => {
    const q = query.trim().toLowerCase();

    // Headings category
    if (category === "headings") {
      return currentHeadings.filter((h) =>
        !q || h.title.toLowerCase().includes(q) || h.anchor.includes(q),
      );
    }

    let items = linkableNotes;
    if (category === "notes") {
      items = items.filter((x) => x.type === "note" || x.type === "daily");
    } else if (category === "projects") {
      items = items.filter((x) => x.type === "project");
    } else if (category === "assets") {
      items = items.filter((x) => x.type === "asset");
    }

    if (!q) return items.slice(0, 50);

    return items
      .filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.slug.toLowerCase().includes(q) ||
          (x.excerpt && x.excerpt.toLowerCase().includes(q)),
      )
      .slice(0, 50);
  }, [category, currentHeadings, linkableNotes, query]);

  // Keep selected index within range during render
  const [prevFilter, setPrevFilter] = React.useState({ category, query });
  if (prevFilter.category !== category || prevFilter.query !== query) {
    setPrevFilter({ category, query });
    setSelectedIndex(0);
  }

  const handleSelectTarget = (target: WikiLinkTarget | HeadingTarget) => {
    if ("anchor" in target) {
      // Heading target inside current note
      if (linkMode === "markdown") {
        insertMarkdownLink(editorRef, {
          label: alias.trim() || target.title,
          href: `#${target.anchor}`,
          replaceRange,
        });
      } else {
        insertWikiLink(editorRef, {
          target: `#${target.title}`,
          alias: alias.trim() && alias.trim() !== target.title ? alias.trim() : undefined,
          replaceRange,
        });
      }
    } else {
      // Note, Project, or Asset
      const targetIsImage = isImageAsset(target);
      const shouldEmbed = isEmbed || (targetIsImage && isEmbed);

      if (linkMode === "markdown" || target.url) {
        let href = target.url || `/notes/${target.id}`;
        if (target.type === "project") href = `/projects/${target.id}`;
        if (target.type === "asset") href = `/api/attachments/${target.id}`;

        insertMarkdownLink(editorRef, {
          label: alias.trim() || target.title,
          href,
          isEmbed: shouldEmbed,
          replaceRange,
        });
      } else {
        insertWikiLink(editorRef, {
          target: target.title,
          alias: alias.trim() && alias.trim() !== target.title ? alias.trim() : undefined,
          isEmbed: shouldEmbed,
          replaceRange,
        });
      }
    }

    onOpenChange(false);
  };

  const handleInsertWebUrl = () => {
    const url = query.trim();
    if (!url) return;
    insertMarkdownLink(editorRef, {
      label: alias.trim() || url,
      href: url,
      replaceRange,
    });
    onOpenChange(false);
  };

  const handleCreateNewNote = async () => {
    const title = query.trim();
    if (!title || isCreatingNote) return;

    setIsCreatingNote(true);
    try {
      const newNote = await createNoteWithTitleAction(title);
      const target: WikiLinkTarget = {
        id: newNote.id,
        slug: newNote.slug,
        title: newNote.title,
        type: "note",
        status: newNote.status,
      };

      onTargetCreated?.(target);

      insertWikiLink(editorRef, {
        target: target.title,
        alias: alias.trim() && alias.trim() !== target.title ? alias.trim() : undefined,
        replaceRange,
      });

      toast.success(`Created and linked "${target.title}"`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to create note.");
    } finally {
      setIsCreatingNote(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isWebUrl) {
        handleInsertWebUrl();
      } else if (filteredItems[selectedIndex]) {
        handleSelectTarget(filteredItems[selectedIndex]);
      } else if (query.trim()) {
        void handleCreateNewNote();
      }
    }
  };

  const renderIcon = (item: WikiLinkTarget | HeadingTarget) => {
    if ("anchor" in item) {
      return (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 font-mono text-xs font-semibold">
          H{item.level}
        </span>
      );
    }

    if (item.type === "project") {
      return (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <FolderKanban className="size-4" />
        </span>
      );
    }

    if (item.type === "daily") {
      return (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
          <Calendar className="size-4" />
        </span>
      );
    }

    if (item.type === "asset") {
      if (isImageAsset(item)) {
        return (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
            <ImageIcon className="size-4" />
          </span>
        );
      }
      return (
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
          <Paperclip className="size-4" />
        </span>
      );
    }

    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FileText className="size-4" />
      </span>
    );
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                <FileCode className="size-3.5" />
              </span>
              Link Note, Project, or Asset
            </DialogTitle>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                ⌘K / Ctrl+K
              </Badge>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Search and link internal notes, projects, assets, or web addresses.
          </DialogDescription>

          {/* Search bar */}
          <div className="mt-3 relative flex items-center">
            <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search notes, projects, files, or paste URL…"
              className="h-10 pl-9 pr-4 text-sm rounded-xl border-border/70 bg-background shadow-xs focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            {(
              [
                { id: "all", label: "All" },
                { id: "notes", label: "Notes" },
                { id: "projects", label: "Projects" },
                { id: "assets", label: "Assets" },
                { id: "headings", label: "Headings in Note" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 text-xs",
                  category === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Results List */}
        <ScrollArea className="h-72 px-2 py-2" ref={listRef}>
          {isWebUrl && (
            <div className="p-1 mb-1">
              <button
                type="button"
                onClick={handleInsertWebUrl}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Globe className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    Insert Web Link
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </div>
                  <div className="truncate text-xs text-muted-foreground font-mono mt-0.5">
                    {query}
                  </div>
                </div>
              </button>
            </div>
          )}

          {filteredItems.length === 0 && !isWebUrl && (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-2">
                <Search className="size-5" />
              </div>
              <p className="text-xs font-medium text-foreground">
                No matching {category === "all" ? "items" : category} found
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                {query
                  ? `No results match "${query}". You can create a new note with this title.`
                  : "Type a search term above to find notes, projects, and assets."}
              </p>

              {query.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCreateNewNote()}
                  disabled={isCreatingNote}
                  className="mt-3 gap-1.5 text-xs rounded-xl h-8"
                >
                  <Plus className="size-3.5" />
                  Create note &ldquo;{query.trim()}&rdquo;
                </Button>
              )}
            </div>
          )}

          <div className="space-y-0.5">
            {filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isHeading = "anchor" in item;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTarget(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors group",
                    isSelected
                      ? "bg-primary/10 text-foreground border border-primary/20"
                      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent",
                  )}
                >
                  {renderIcon(item)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">
                        {item.title}
                      </span>

                      {!isHeading && (
                        <>
                          {item.type === "project" && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 uppercase font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30"
                            >
                              Project
                            </Badge>
                          )}
                          {item.type === "daily" && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 uppercase font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            >
                              Daily
                            </Badge>
                          )}
                          {item.type === "asset" && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1 py-0 h-4 uppercase font-mono text-sky-600 dark:text-sky-400 border-sky-500/30"
                            >
                              {item.mimeType?.split("/")[1] || "Asset"}
                            </Badge>
                          )}
                        </>
                      )}

                      {isHeading && (
                        <span className="text-[10px] text-muted-foreground/80 font-mono">
                          #{item.anchor}
                        </span>
                      )}
                    </div>

                    {!isHeading && item.excerpt && (
                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                        {item.excerpt}
                      </p>
                    )}

                    {!isHeading && item.type === "asset" && (
                      <p className="truncate text-[11px] text-muted-foreground/80 font-mono mt-0.5">
                        {formatFileSize(item.sizeBytes)} · {item.slug}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Check className="size-4 text-primary shrink-0 opacity-80" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Configuration: Alias & Mode */}
        <div className="border-t border-border/60 bg-muted/10 p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground shrink-0">
              Display text:
            </span>
            <Input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Optional custom alias (e.g. Overview Docs)"
              className="h-7 text-xs rounded-lg bg-background border-border/70"
            />
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={linkMode === "markdown"}
                  onChange={(e) =>
                    setLinkMode(e.target.checked ? "markdown" : "wiki")
                  }
                  className="rounded border-border size-3.5 text-primary focus:ring-0"
                />
                <span>Standard Markdown Link [text](url)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isEmbed}
                  onChange={(e) => setIsEmbed(e.target.checked)}
                  className="rounded border-border size-3.5 text-primary focus:ring-0"
                />
                <span>Embed content (![[...]])</span>
              </label>
            </div>

            <span className="hidden sm:inline text-[10px] text-muted-foreground/70 font-mono">
              ↑↓ Navigate · Enter Insert · Esc Close
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
