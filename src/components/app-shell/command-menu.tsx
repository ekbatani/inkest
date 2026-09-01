"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  FileText,
  Loader2,
  Sparkles,
  Bold,
  Italic,
  Strikethrough,
  Code2,
  List,
  Users,
  FolderKanban,
  CalendarDays,
  FilePlus2,
  FolderPlus,
  CreditCard,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { mainNav, settingsNav } from "@/components/app-shell/nav-items";
import {
  searchNotesAction,
  listRecentNotesAction,
  type NoteSearchHit,
} from "@/server/notes/actions";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";
import type { MarkdownFormat } from "@/components/editor/markdown-editor-utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
};

function hitHref(hit: NoteSearchHit) {
  return hit.type === "project" ? `/projects/${hit.id}` : `/notes/${hit.id}`;
}

function HitIcon({ type }: { type: NoteSearchHit["type"] }) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/40",
        type === "project" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        type === "daily" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        type === "note" && "bg-primary/10 text-primary",
      )}
    >
      {type === "project" ? (
        <FolderKanban className="size-3.5" />
      ) : type === "daily" ? (
        <CalendarDays className="size-3.5" />
      ) : (
        <FileText className="size-3.5" />
      )}
    </span>
  );
}

function HitBadges({ hit }: { hit: NoteSearchHit }) {
  if (hit.type === "daily") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 h-4 px-1.5 py-0 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
      >
        Daily
      </Badge>
    );
  }
  if (hit.type === "project") {
    return (
      <Badge
        variant="outline"
        className="shrink-0 h-4 px-1.5 py-0 text-[9px] font-bold uppercase text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
      >
        {hit.status ? `Project · ${hit.status}` : "Project"}
      </Badge>
    );
  }
  return null;
}

export function CommandMenu({ open, onOpenChange, isAdmin = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const noteMatch = pathname?.match(/^\/notes\/([^/]+)$/);
  const currentNoteId =
    noteMatch && noteMatch[1] !== "new" ? noteMatch[1] : undefined;
  const [query, setQuery] = React.useState("");
  const [recent, setRecent] = React.useState<NoteSearchHit[]>([]);
  const [results, setResults] = React.useState<NoteSearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentLoadedRef = React.useRef(false);

  const loadRecent = async () => {
    if (recentLoadedRef.current) return;
    recentLoadedRef.current = true;
    try {
      const list = await listRecentNotesAction();
      setRecent(list);
    } catch {
      setRecent([]);
    }
  };

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next) {
      void loadRecent();
    } else {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  };

  const runSearch = async (q: string) => {
    try {
      const list = await searchNotesAction(q);
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    const q = value.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setLoading(false);
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      void runSearch(q);
    }, 200);
  };

  React.useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const formatCurrentNote = (format: MarkdownFormat) => {
    if (!currentNoteId) return;
    handleOpenChange(false);
    window.dispatchEvent(
      new CustomEvent("inkest:format-markdown", {
        detail: { noteId: currentNoteId, format },
      }),
    );
  };

  const showResults = query.trim().length >= 2;
  const hits = showResults ? results : recent;
  const projectHits = hits.filter((h) => h.type === "project");
  const noteHits = hits.filter((h) => h.type !== "project");
  const showHits = showResults || (!query.trim() && recent.length > 0);
  // Server results already matched title and body content; cmdk must not
  // re-filter them by title only, or body matches would be hidden.
  const filterCommand = (value: string, search: string) => {
    if (value.startsWith("hit:") || !search.trim()) return 1;
    const haystack = value.toLowerCase();
    return search
      .toLowerCase()
      .split(/\s+/)
      .every((token) => haystack.includes(token))
      ? 1
      : 0;
  };
  const adminNavItems = isAdmin
    ? [{ label: "User Management (Admin)", href: "/settings?tab=users", icon: Users }]
    : [];
  const billingNavItems = [
    { label: "Billing & Credits", href: "/settings?tab=billing", icon: CreditCard },
  ];
  const navItemsToRender = [...mainNav, ...settingsNav, ...billingNavItems, ...adminNavItems];

  const renderHit = (hit: NoteSearchHit) => (
    <CommandItem
      key={hit.id}
      value={`hit:${hit.id}`}
      onSelect={() => go(hitHref(hit))}
    >
      <HitIcon type={hit.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate",
              usesRtlTitleFont(hit.title) && "rtl-vazir",
            )}
          >
            {hit.title || "Untitled"}
          </span>
          <HitBadges hit={hit} />
        </div>
        {hit.excerpt && (
          <div className="truncate text-xs text-muted-foreground">
            {hit.excerpt}
          </div>
        )}
      </div>
    </CommandItem>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command menu</DialogTitle>
          <DialogDescription>
            Search notes and projects, and navigate inkest.
          </DialogDescription>
        </DialogHeader>
        <Command
          filter={filterCommand}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-input]]:h-12"
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <CommandInput
              value={query}
              onValueChange={onQueryChange}
              placeholder="Search notes and projects, or type a command…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
          <CommandList>
            <CommandEmpty>
              No matching notes, projects, or commands.
            </CommandEmpty>

            {showHits && projectHits.length > 0 && (
              <CommandGroup
                heading={showResults ? "Projects" : "Recent projects"}
              >
                {projectHits.map(renderHit)}
              </CommandGroup>
            )}

            {showHits && noteHits.length > 0 && (
              <CommandGroup heading={showResults ? "Notes" : "Recent notes"}>
                {noteHits.map(renderHit)}
              </CommandGroup>
            )}

            <>
              {(showHits || query.trim()) && <CommandSeparator />}
              <CommandGroup heading="Navigate">
                {navItemsToRender.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`${item.label} navigate go to`}
                    onSelect={() => go(item.href)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Actions">
                {currentNoteId && (
                  <CommandItem
                    value="ask ai summarize explain note"
                    onSelect={() => {
                      const noteId = currentNoteId;
                      handleOpenChange(false);
                      window.dispatchEvent(
                        new CustomEvent("inkest:ask-ai", { detail: { noteId } }),
                      );
                    }}
                  >
                    <Sparkles className="size-4" />
                    <span>Ask AI…</span>
                  </CommandItem>
                )}
                <CommandItem
                  value="new note create"
                  onSelect={() => go("/notes/new")}
                >
                  <FilePlus2 className="size-4" />
                  <span>New note</span>
                </CommandItem>
                <CommandItem
                  value="new project create"
                  onSelect={() => go("/projects")}
                >
                  <FolderPlus className="size-4" />
                  <span>New project</span>
                </CommandItem>
                <CommandItem
                  value="daily note today"
                  onSelect={() => go("/daily")}
                >
                  <CalendarDays className="size-4" />
                  <span>Open today’s daily note</span>
                </CommandItem>
                <CommandItem
                  value="log out sign out exit session"
                  onSelect={async () => {
                    handleOpenChange(false);
                    await signOut({ callbackUrl: "/signin" });
                  }}
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </CommandItem>
              </CommandGroup>
              {currentNoteId && (
                <CommandGroup heading="Format current note">
                  <CommandItem value="format bold current note" onSelect={() => formatCurrentNote("bold")}>
                    <Bold className="size-4" />
                    <span>Bold</span>
                  </CommandItem>
                  <CommandItem value="format italic current note" onSelect={() => formatCurrentNote("italic")}>
                    <Italic className="size-4" />
                    <span>Italic</span>
                  </CommandItem>
                  <CommandItem value="format strikethrough current note" onSelect={() => formatCurrentNote("strikethrough")}>
                    <Strikethrough className="size-4" />
                    <span>Strikethrough</span>
                  </CommandItem>
                  <CommandItem value="format inline code current note" onSelect={() => formatCurrentNote("inline-code")}>
                    <Code2 className="size-4" />
                    <span>Inline code</span>
                  </CommandItem>
                  <CommandItem value="format bulleted list current note" onSelect={() => formatCurrentNote("bullet-list")}>
                    <List className="size-4" />
                    <span>Bulleted list</span>
                  </CommandItem>
                </CommandGroup>
              )}
            </>
          </CommandList>
          <div className="flex items-center gap-4 border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-sans">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-sans">↵</kbd>
              Open
            </span>
            <span className="ml-auto flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-sans">Esc</kbd>
              Close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
