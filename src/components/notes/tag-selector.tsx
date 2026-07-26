"use client";

import * as React from "react";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { setNoteTagsAction, createTagAction } from "@/server/tags/actions";
import type { Tag } from "@/server/db/schema";

export function TagSelector({
  noteId,
  allTags,
  selectedTagIds,
}: {
  noteId: string;
  allTags: Tag[];
  selectedTagIds: string[];
}) {
  const [selected, setSelected] = React.useState<string[]>(selectedTagIds);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [addedTags, setAddedTags] = React.useState<Tag[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  const workingTags = React.useMemo(() => {
    const byId = new Map<string, Tag>();
    for (const tag of allTags) byId.set(tag.id, tag);
    for (const tag of addedTags) {
      if (!byId.has(tag.id)) byId.set(tag.id, tag);
    }
    return Array.from(byId.values());
  }, [allTags, addedTags]);

  const persist = async (next: string[]) => {
    setSaving(true);
    try {
      await setNoteTagsAction(noteId, next);
      setSelected(next);
    } catch {
      toast.error("Failed to save tag.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((value) => value !== id)
      : [...selected, id];
    void persist(next);
  };

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;

    setSaving(true);
    try {
      const tag = await createTagAction({ name, color: null });
      if (tag) {
        setAddedTags((prev) =>
          prev.find((item) => item.id === tag.id) ? prev : [...prev, tag],
        );
        const next = [...selected, tag.id];
        setSelected(next);
        await setNoteTagsAction(noteId, next);
        setQuery("");
      }
    } catch {
      toast.error("Failed to create tag.");
    } finally {
      setSaving(false);
    }
  };

  const selectedTags = React.useMemo(
    () =>
      selected
        .map((id) => workingTags.find((tag) => tag.id === id))
        .filter((tag): tag is Tag => Boolean(tag)),
    [selected, workingTags],
  );

  const filtered = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const list = normalized
      ? workingTags.filter((tag) =>
          tag.name.toLowerCase().includes(normalized),
        )
      : workingTags;

    return [...list].sort((a, b) => {
      const aRank = selected.includes(a.id) ? 0 : 1;
      const bRank = selected.includes(b.id) ? 0 : 1;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
  }, [workingTags, query, selected]);

  const exactMatch = React.useMemo(
    () =>
      workingTags.find(
        (tag) => tag.name.toLowerCase() === query.trim().toLowerCase(),
      ),
    [workingTags, query],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-[11px] font-medium text-muted-foreground">
        Tags
      </Label>
      <div className="flex min-h-10 flex-wrap gap-1.5 rounded-2xl border border-border/70 bg-background px-2.5 py-2">
        {selectedTags.length === 0 && (
          <span className="self-center text-xs text-muted-foreground">
            No tags
          </span>
        )}
        {selectedTags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="gap-1 text-xs"
            style={
              tag.color
                ? {
                    backgroundColor: `${tag.color}26`,
                    color: tag.color,
                    borderColor: `${tag.color}40`,
                  }
                : undefined
            }
          >
            <TagIcon className="size-3" />
            {tag.name}
            <button
              type="button"
              onClick={() => toggle(tag.id)}
              className="ml-0.5 rounded-full hover:bg-foreground/10"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>

      <DropdownMenu
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-full justify-start gap-2 rounded-2xl border-border/70 bg-muted/20 px-3 text-sm shadow-none hover:bg-muted/40"
              aria-label="Add tag"
            />
          }
        >
          <Plus className="size-3.5" />
          {saving ? "Saving..." : "Add tag"}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-full min-w-0 p-2">
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();

                if (event.key === "Enter") {
                  event.preventDefault();
                  if (exactMatch) {
                    toggle(exactMatch.id);
                    setQuery("");
                  } else if (query.trim()) {
                    void handleCreate();
                  }
                }
              }}
              placeholder="Search or create..."
              className="h-8 text-xs"
            />
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                No tags yet.
              </p>
            ) : (
              filtered.map((tag) => {
                const isSelected = selected.includes(tag.id);

                return (
                  <DropdownMenuItem
                    key={tag.id}
                    onClick={() => toggle(tag.id)}
                    className={cn("gap-2 text-xs")}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-sm border"
                      style={{ backgroundColor: tag.color ?? "transparent" }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isSelected && (
                      <span className="text-[10px] text-muted-foreground">
                        on
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })
            )}
          </div>

          {query.trim() && !exactMatch && (
            <DropdownMenuItem
              onClick={() => void handleCreate()}
              className="mt-1 gap-2 text-xs"
            >
              <Plus className="size-3" />
              Create &quot;{query.trim()}&quot;
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
