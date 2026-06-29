"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, Loader2 } from "lucide-react";
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
import { mainNav, settingsNav } from "@/components/app-shell/nav-items";
import {
  searchNotesAction,
  listRecentNotesAction,
  type NoteSearchHit,
} from "@/server/notes/actions";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandMenu({ open, onOpenChange }: Props) {
  const router = useRouter();
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
      // Reset search state when the menu closes. Done outside of an effect
      // so it is not a setState-in-effect call.
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

  const showNotesGroup = query.trim().length >= 2;
  const noteItems = showNotesGroup ? results : recent;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Command menu</DialogTitle>
          <DialogDescription>
            Search notes and navigate inkest.
          </DialogDescription>
        </DialogHeader>
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-input]]:h-12">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <CommandInput
              value={query}
              onValueChange={onQueryChange}
              placeholder="Type a command or search notes…"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            )}
          </div>
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {(showNotesGroup || (!query.trim() && recent.length > 0)) && (
              <CommandGroup heading={showNotesGroup ? "Notes" : "Recent notes"}>
                {noteItems.length === 0 && showNotesGroup && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No notes match “{query}”.
                  </div>
                )}
                {noteItems.map((n) => (
                  <CommandItem
                    key={n.id}
                    value={`note ${n.title} ${n.excerpt}`}
                    onSelect={() => go(`/notes/${n.id}`)}
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "truncate",
                          usesRtlTitleFont(n.title) && "rtl-vazir",
                        )}
                      >
                        {n.title || "Untitled"}
                      </div>
                      {n.excerpt && (
                        <div className="truncate text-xs text-muted-foreground">
                          {n.excerpt}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!showNotesGroup && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Navigate">
                  {mainNav.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={`${item.label} navigate go to`}
                      onSelect={() => go(item.href)}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                  {settingsNav.map((item) => (
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
                  <CommandItem
                    value="new note create"
                    onSelect={() => go("/notes/new")}
                  >
                    <Search className="size-4" />
                    <span>New note</span>
                  </CommandItem>
                  <CommandItem
                    value="new project create"
                    onSelect={() => go("/projects")}
                  >
                    <Search className="size-4" />
                    <span>New project</span>
                  </CommandItem>
                  <CommandItem
                    value="daily note today"
                    onSelect={() => go("/daily")}
                  >
                    <Search className="size-4" />
                    <span>Open today’s daily note</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
