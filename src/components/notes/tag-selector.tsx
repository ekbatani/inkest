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
  // Tags created client-side during this session, kept alongside the
  // server-provided `allTags` so they appear in the picker immediately.
  const [addedTags, setAddedTags] = React.useState<Tag[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const workingTags = React.useMemo(() => {
    const byId = new Map<string, Tag>();
    for (const t of allTags) byId.set(t.id, t);
    for (const t of addedTags) if (!byId.has(t.id)) byId.set(t.id, t);
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
      ? selected.filter((x) => x !== id)
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
          prev.find((t) => t.id === tag.id) ? prev : [...prev, tag],
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
        .map((id) => workingTags.find((t) => t.id === id))
        .filter((t): t is Tag => Boolean(t)),
    [selected, workingTags],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? workingTags.filter((t) => t.name.toLowerCase().includes(q))
      : workingTags;
    return [...list].sort((a, b) => {
      const ax = selected.includes(a.id) ? 0 : 1;
      const bx = selected.includes(b.id) ? 0 : 1;
      if (ax !== bx) return ax - bx;
      return a.name.localeCompare(b.name);
    });
  }, [workingTags, query, selected]);

  const exactMatch = React.useMemo(
    () =>
      workingTags.find(
        (t) => t.name.toLowerCase() === query.trim().toLowerCase(),
      ),
    [workingTags, query],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">Tags</Label>
      <div className="surface-card flex min-h-9 flex-wrap gap-1.5 p-2">
        {selectedTags.length === 0 && (
          <span className="self-center text-xs text-muted-foreground">
            No tags
          </span>
        )}
        {selectedTags.map((t) => (
          <Badge
            key={t.id}
            variant="secondary"
            className="gap-1 text-xs"
            style={
              t.color
                ? {
                    backgroundColor: `${t.color}26`,
                    color: t.color,
                    borderColor: `${t.color}40`,
                  }
                : undefined
            }
          >
            <TagIcon className="size-3" />
            {t.name}
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className="ml-0.5 rounded-full hover:bg-foreground/10"
              aria-label={`Remove ${t.name}`}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <DropdownMenu
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setQuery("");
          }}
        >
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-1.5 text-xs"
                aria-label="Add tag"
              />
            }
          >
            <Plus className="size-3" />
            {saving ? "Saving…" : "Add tag"}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-64 p-2"
            // Keep the popup from autoclosing on Input interactions.
          >
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (exactMatch) {
                    toggle(exactMatch.id);
                    setQuery("");
                  } else if (query.trim()) {
                    void handleCreate();
                  }
                }
              }}
              placeholder="Search or create…"
              className="h-8 text-xs"
            />
            <div className="mt-2 max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">
                  No tags yet.
                </p>
              ) : (
                filtered.map((t) => {
                  const isOn = selected.includes(t.id);
                  return (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => toggle(t.id)}
                      className={cn("gap-2 text-xs")}
                    >
                      <span
                        className="size-2.5 shrink-0 rounded-sm border"
                        style={{
                          backgroundColor: t.color ?? "transparent",
                        }}
                      />
                      <span className="flex-1 truncate">{t.name}</span>
                      {isOn && (
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
                Create “{query.trim()}”
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
