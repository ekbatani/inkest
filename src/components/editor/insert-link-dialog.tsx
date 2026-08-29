"use client";

import * as React from "react";
import type { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import {
  Search,
  FileText,
  FolderKanban,
  Calendar,
  Paperclip,
  Globe,
  Plus,
  ExternalLink,
  Check,
  Hash,
  Layers,
  Link2,
  Image as LucideImage,
  Code,
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

export type HeadingTarget = {
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
  const [linkFormat, setLinkFormat] = React.useState<"wiki" | "markdown" | "embed">("wiki");
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
      setLinkFormat("wiki");
      setCategory("all");
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

  // Parse search query for explicit prefix filters
  const parsedSearch = React.useMemo(() => {
    let cleanQuery = query.trim();
    let effectiveCategory = category;

    if (cleanQuery.startsWith("#")) {
      effectiveCategory = "headings";
      cleanQuery = cleanQuery.slice(1).trim();
    } else if (cleanQuery.startsWith("@") || cleanQuery.startsWith("p:") || cleanQuery.startsWith("/p")) {
      effectiveCategory = "projects";
      cleanQuery = cleanQuery.replace(/^(@|p:|\/p\s*)/i, "").trim();
    } else if (cleanQuery.startsWith("n:") || cleanQuery.startsWith("/n")) {
      effectiveCategory = "notes";
      cleanQuery = cleanQuery.replace(/^(n:|\/n\s*)/i, "").trim();
    } else if (cleanQuery.startsWith("a:") || cleanQuery.startsWith("/a")) {
      effectiveCategory = "assets";
      cleanQuery = cleanQuery.replace(/^(a:|\/a\s*)/i, "").trim();
    }

    return {
      cleanQuery,
      effectiveCategory,
      isWebUrl: /^(https?:\/\/|mailto:|tel:)/i.test(cleanQuery),
    };
  }, [category, query]);

  // Category counts
  const categoryCounts = React.useMemo(() => {
    const q = parsedSearch.cleanQuery.toLowerCase();
    const filterFn = (x: { title: string; slug?: string; excerpt?: string }) =>
      !q ||
      x.title.toLowerCase().includes(q) ||
      (x.slug && x.slug.toLowerCase().includes(q)) ||
      (x.excerpt && x.excerpt.toLowerCase().includes(q));

    const notesCount = linkableNotes.filter(
      (x) => (x.type === "note" || x.type === "daily") && filterFn(x),
    ).length;

    const projectsCount = linkableNotes.filter(
      (x) => x.type === "project" && filterFn(x),
    ).length;

    const assetsCount = linkableNotes.filter(
      (x) => x.type === "asset" && filterFn(x),
    ).length;

    const headingsCount = currentHeadings.filter(
      (h) => !q || h.title.toLowerCase().includes(q) || h.anchor.includes(q),
    ).length;

    return {
      all: notesCount + projectsCount + assetsCount + headingsCount,
      notes: notesCount,
      projects: projectsCount,
      assets: assetsCount,
      headings: headingsCount,
    };
  }, [currentHeadings, linkableNotes, parsedSearch.cleanQuery]);

  // Grouped and sorted items
  const { groupedItems, flatItems } = React.useMemo(() => {
    const q = parsedSearch.cleanQuery.toLowerCase();
    const activeCat = parsedSearch.effectiveCategory;

    const filterTarget = (x: WikiLinkTarget) =>
      !q ||
      x.title.toLowerCase().includes(q) ||
      x.slug.toLowerCase().includes(q) ||
      (x.excerpt && x.excerpt.toLowerCase().includes(q));

    const filterHeading = (h: HeadingTarget) =>
      !q || h.title.toLowerCase().includes(q) || h.anchor.includes(q);

    const projects = (activeCat === "all" || activeCat === "projects")
      ? linkableNotes.filter((x) => x.type === "project" && filterTarget(x))
      : [];

    const notes = (activeCat === "all" || activeCat === "notes")
      ? linkableNotes.filter((x) => (x.type === "note" || x.type === "daily") && filterTarget(x))
      : [];

    const assets = (activeCat === "all" || activeCat === "assets")
      ? linkableNotes.filter((x) => x.type === "asset" && filterTarget(x))
      : [];

    const headings = (activeCat === "all" || activeCat === "headings")
      ? currentHeadings.filter(filterHeading)
      : [];

    const groups: {
      type: "projects" | "notes" | "assets" | "headings";
      title: string;
      icon: React.ComponentType<{ className?: string }>;
      items: (WikiLinkTarget | HeadingTarget)[];
    }[] = [];

    if (projects.length > 0) {
      groups.push({
        type: "projects",
        title: "Projects",
        icon: FolderKanban,
        items: projects,
      });
    }

    if (notes.length > 0) {
      groups.push({
        type: "notes",
        title: "Notes",
        icon: FileText,
        items: notes,
      });
    }

    if (assets.length > 0) {
      groups.push({
        type: "assets",
        title: "Assets & Files",
        icon: Paperclip,
        items: assets,
      });
    }

    if (headings.length > 0) {
      groups.push({
        type: "headings",
        title: "Headings in this Note",
        icon: Hash,
        items: headings,
      });
    }

    const flat: (WikiLinkTarget | HeadingTarget)[] = [];
    for (const g of groups) {
      flat.push(...g.items);
    }

    return { groupedItems: groups, flatItems: flat };
  }, [currentHeadings, linkableNotes, parsedSearch]);

  // Keep selected index valid
  const [prevFilter, setPrevFilter] = React.useState({
    cat: parsedSearch.effectiveCategory,
    q: parsedSearch.cleanQuery,
  });
  if (
    prevFilter.cat !== parsedSearch.effectiveCategory ||
    prevFilter.q !== parsedSearch.cleanQuery
  ) {
    setPrevFilter({
      cat: parsedSearch.effectiveCategory,
      q: parsedSearch.cleanQuery,
    });
    setSelectedIndex(0);
  }

  const selectedItem = flatItems[selectedIndex] || null;

  // Insert target handler
  const handleSelectTarget = (target: WikiLinkTarget | HeadingTarget) => {
    const isEmbedMode = linkFormat === "embed";
    const customAlias = alias.trim() && alias.trim() !== target.title ? alias.trim() : undefined;

    if ("anchor" in target) {
      // Heading target
      if (linkFormat === "markdown") {
        insertMarkdownLink(editorRef, {
          label: alias.trim() || target.title,
          href: `#${target.anchor}`,
          replaceRange,
        });
      } else {
        insertWikiLink(editorRef, {
          target: `#${target.title}`,
          alias: customAlias,
          replaceRange,
        });
      }
    } else {
      // Note, Project, Asset
      const isImg = isImageAsset(target);
      const shouldEmbed = isEmbedMode || (isImg && isEmbedMode);

      if (linkFormat === "markdown" || target.url) {
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
          alias: customAlias,
          isEmbed: shouldEmbed,
          replaceRange,
        });
      }
    }

    onOpenChange(false);
  };

  const handleInsertWebUrl = () => {
    const url = parsedSearch.cleanQuery;
    if (!url) return;
    insertMarkdownLink(editorRef, {
      label: alias.trim() || url,
      href: url,
      isEmbed: linkFormat === "embed",
      replaceRange,
    });
    onOpenChange(false);
  };

  const handleCreateNewNote = async () => {
    const title = parsedSearch.cleanQuery;
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

      const customAlias = alias.trim() && alias.trim() !== target.title ? alias.trim() : undefined;
      insertWikiLink(editorRef, {
        target: target.title,
        alias: customAlias,
        isEmbed: linkFormat === "embed",
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
      setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (parsedSearch.isWebUrl) {
        handleInsertWebUrl();
      } else if (flatItems[selectedIndex]) {
        handleSelectTarget(flatItems[selectedIndex]);
      } else if (parsedSearch.cleanQuery) {
        void handleCreateNewNote();
      }
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Preview syntax generator
  const syntaxPreview = React.useMemo(() => {
    const targetTitle = selectedItem?.title || parsedSearch.cleanQuery || "Target";
    const customAlias = alias.trim();

    if (linkFormat === "embed") {
      return customAlias ? `![[${targetTitle}|${customAlias}]]` : `![[${targetTitle}]]`;
    }
    if (linkFormat === "markdown") {
      const href = parsedSearch.isWebUrl ? parsedSearch.cleanQuery : `/notes/...`;
      return `[${customAlias || targetTitle}](${href})`;
    }
    return customAlias ? `[[${targetTitle}|${customAlias}]]` : `[[${targetTitle}]]`;
  }, [alias, linkFormat, parsedSearch, selectedItem]);

  let currentFlatCounter = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl bg-background/95 backdrop-blur-xl">
        {/* Header and Search Area */}
        <DialogHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Link2 className="size-3.5" />
              </span>
              <span>Insert Internal Link or Asset</span>
            </DialogTitle>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-mono bg-muted/70 px-2 py-0.5 rounded-md border border-border/40">
                ⌘K / Ctrl+K
              </span>
            </div>
          </div>
          <DialogDescription className="sr-only">
            Search notes, projects, assets, or document headings to insert internal links.
          </DialogDescription>

          {/* Search Input */}
          <div className="mt-3 relative flex items-center">
            <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search notes, projects, files… (or type @project, #heading, /asset)"
              className="h-10 pl-9 pr-24 text-sm rounded-xl border-border/70 bg-background shadow-inner focus-visible:ring-1 focus-visible:ring-primary"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted font-medium transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs with Dynamic Item Counts */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 text-xs flex items-center gap-1.5",
                category === "all"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Layers className="size-3.5" />
              <span>All</span>
              <span className="text-[10px] opacity-75 font-mono">({categoryCounts.all})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory("notes")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 text-xs flex items-center gap-1.5",
                category === "notes"
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <FileText className="size-3.5" />
              <span>Notes</span>
              <span className="text-[10px] opacity-75 font-mono">({categoryCounts.notes})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory("projects")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 text-xs flex items-center gap-1.5",
                category === "projects"
                  ? "bg-amber-600 text-white shadow-xs font-semibold"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
              )}
            >
              <FolderKanban className="size-3.5" />
              <span>Projects</span>
              <span className="text-[10px] opacity-75 font-mono">({categoryCounts.projects})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory("assets")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 text-xs flex items-center gap-1.5",
                category === "assets"
                  ? "bg-sky-600 text-white shadow-xs font-semibold"
                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20",
              )}
            >
              <Paperclip className="size-3.5" />
              <span>Assets</span>
              <span className="text-[10px] opacity-75 font-mono">({categoryCounts.assets})</span>
            </button>

            <button
              type="button"
              onClick={() => setCategory("headings")}
              className={cn(
                "px-2.5 py-1 rounded-lg font-medium transition-all shrink-0 text-xs flex items-center gap-1.5",
                category === "headings"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20",
              )}
            >
              <Hash className="size-3.5" />
              <span>Headings</span>
              <span className="text-[10px] opacity-75 font-mono">({categoryCounts.headings})</span>
            </button>
          </div>
        </DialogHeader>

        {/* Results Area */}
        <ScrollArea className="h-80 px-3 py-2" ref={listRef}>
          {parsedSearch.isWebUrl && (
            <div className="p-1 mb-2">
              <button
                type="button"
                onClick={handleInsertWebUrl}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 text-left transition-colors"
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
                    {parsedSearch.cleanQuery}
                  </div>
                </div>
              </button>
            </div>
          )}

          {flatItems.length === 0 && !parsedSearch.isWebUrl && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3 shadow-inner">
                <Search className="size-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No matching results found
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {parsedSearch.cleanQuery
                  ? `No ${category === "all" ? "notes, projects, or assets" : category} match "${parsedSearch.cleanQuery}".`
                  : "Start typing to search notes, projects, media attachments, and headings."}
              </p>

              {parsedSearch.cleanQuery.trim() && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleCreateNewNote()}
                  disabled={isCreatingNote}
                  className="mt-4 gap-1.5 text-xs rounded-xl h-8 px-3 border-primary/30 hover:bg-primary/10 text-primary"
                >
                  <Plus className="size-3.5" />
                  Create note &ldquo;{parsedSearch.cleanQuery.trim()}&rdquo;
                </Button>
              )}
            </div>
          )}

          {/* Grouped sections */}
          <div className="space-y-4">
            {groupedItems.map((group) => {
              const GroupIcon = group.icon;

              return (
                <div key={group.type} className="space-y-1">
                  {/* Distinct Group Header */}
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/80">
                    <GroupIcon className="size-3.5 text-muted-foreground" />
                    <span>{group.title}</span>
                    <span className="text-[10px] font-mono text-muted-foreground/60 font-normal">
                      ({group.items.length})
                    </span>
                  </div>

                  {/* Group Items */}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const itemIndex = currentFlatCounter++;
                      const isSelected = itemIndex === selectedIndex;
                      const isHeading = "anchor" in item;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTarget(item)}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all group",
                            isSelected
                              ? "bg-primary/10 text-foreground border border-primary/25 shadow-xs"
                              : "hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent",
                          )}
                        >
                          {/* Item Icon or Image Thumbnail */}
                          {"anchor" in item ? (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] font-bold">
                              H{item.level}
                            </span>
                          ) : item.type === "project" ? (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                              <FolderKanban className="size-4" />
                            </span>
                          ) : item.type === "daily" ? (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <Calendar className="size-4" />
                            </span>
                          ) : item.type === "asset" ? (
                            isImageAsset(item) ? (
                              <div className="size-7 shrink-0 rounded-lg overflow-hidden border border-border/60 bg-muted/40 flex items-center justify-center">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`/api/attachments/${item.id}`}
                                  alt={item.title}
                                  className="size-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : (
                              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                <Paperclip className="size-4" />
                              </span>
                            )
                          ) : (
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <FileText className="size-4" />
                            </span>
                          )}

                          {/* Item Title and Details */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-semibold text-foreground">
                                {item.title}
                              </span>

                              {!isHeading && (
                                <>
                                  {item.type === "project" && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
                                    >
                                      {item.status ? `Project · ${item.status}` : "Project"}
                                    </Badge>
                                  )}
                                  {item.type === "daily" && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 h-4 uppercase font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                                    >
                                      Daily Note
                                    </Badge>
                                  )}
                                  {item.type === "asset" && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] px-1.5 py-0 h-4 uppercase font-mono text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5"
                                    >
                                      {item.mimeType?.split("/")[1]?.toUpperCase() || "FILE"}
                                    </Badge>
                                  )}
                                </>
                              )}

                              {isHeading && (
                                <span className="text-[10px] text-indigo-500 font-mono">
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
                              <p className="truncate text-[10px] text-muted-foreground/80 font-mono mt-0.5">
                                {formatFileSize(item.sizeBytes)} · {item.slug}
                              </p>
                            )}
                          </div>

                          {/* Check selection indicator */}
                          {isSelected && (
                            <div className="flex items-center gap-1 shrink-0 text-primary">
                              <span className="text-[10px] font-mono opacity-60 hidden sm:inline">Enter to insert</span>
                              <Check className="size-4 opacity-90" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Configuration: Format Toggle & Live Preview */}
        <div className="border-t border-border/70 bg-muted/20 p-3 space-y-2.5">
          {/* Display Text / Alias input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground shrink-0 w-24">
              Display text:
            </span>
            <div className="flex-1 relative">
              <Input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder={selectedItem ? `Default: "${selectedItem.title}"` : "Custom link display text (optional)"}
                className="h-8 text-xs rounded-lg bg-background border-border/70"
              />
              {alias && (
                <button
                  type="button"
                  onClick={() => setAlias("")}
                  className="absolute right-2 top-1.5 text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded bg-muted font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Link Format Toggle & Live Preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/40">
            {/* Format Segmented Selector */}
            <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/60">
              <button
                type="button"
                onClick={() => setLinkFormat("wiki")}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1",
                  linkFormat === "wiki"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Link2 className="size-3" />
                <span>Wiki [[…]]</span>
              </button>

              <button
                type="button"
                onClick={() => setLinkFormat("markdown")}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1",
                  linkFormat === "markdown"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Code className="size-3" />
                <span>Markdown […](…)</span>
              </button>

              <button
                type="button"
                onClick={() => setLinkFormat("embed")}
                className={cn(
                  "px-2 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1",
                  linkFormat === "embed"
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <LucideImage className="size-3" />
                <span>Embed ![[…]]</span>
              </button>
            </div>

            {/* Live Syntax Preview */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground max-w-xs truncate">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground/70">Syntax:</span>
              <code className="text-primary font-mono text-[11px] bg-primary/10 px-1.5 py-0.5 rounded-md truncate max-w-[180px]">
                {syntaxPreview}
              </code>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

