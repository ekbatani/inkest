"use client";

import * as React from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Tag,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { SavedView, Tag as TagType, Note } from "@/server/db/schema";
import {
  createSavedViewAction,
  deleteSavedViewAction,
  runSavedViewAction,
} from "@/server/views/actions";
import type { SavedViewFilter } from "@/server/views/service";
import { toast } from "sonner";

export function SavedViewsManager({
  initialViews = [],
  allTags = [],
}: {
  initialViews?: SavedView[];
  allTags?: TagType[];
}) {
  const [views, setViews] = React.useState<SavedView[]>(initialViews);
  const [activeView, setActiveView] = React.useState<SavedView | null>(
    initialViews[0] ?? null,
  );
  const [queryResults, setQueryResults] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(false);

  // New View Form State
  const [isCreating, setIsCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [untaggedOnly, setUntaggedOnly] = React.useState(false);
  const [hasBacklinks, setHasBacklinks] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<
    "all" | "today" | "this_week" | "this_month"
  >("all");
  const [noteType, setNoteType] = React.useState<
    "note" | "project" | "daily" | undefined
  >(undefined);

  const executeFilter = React.useCallback(async (filterObj: SavedViewFilter) => {
    setLoading(true);
    try {
      const results = await runSavedViewAction(filterObj);
      setQueryResults(results);
    } catch {
      toast.error("Failed to run view query.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (activeView) {
      try {
        const filter = JSON.parse(activeView.queryJson) as SavedViewFilter;
        let isMounted = true;
        queueMicrotask(() => {
          if (isMounted) setLoading(true);
        });
        runSavedViewAction(filter)
          .then((res) => {
            if (isMounted) setQueryResults(res);
          })
          .catch(() => {
            if (isMounted) toast.error("Failed to run view query.");
          })
          .finally(() => {
            if (isMounted) setLoading(false);
          });
        return () => {
          isMounted = false;
        };
      } catch {
        // ignore parse error
      }
    }
  }, [activeView]);

  const handleCreateView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const filter = {
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      untaggedOnly,
      hasBacklinks,
      dateRange,
      type: noteType,
    };

    try {
      const newView = await createSavedViewAction({
        name: name.trim(),
        filter,
      });
      setViews((prev) => [newView, ...prev]);
      setActiveView(newView);
      setIsCreating(false);
      setName("");
      toast.success("Saved view created.");
    } catch {
      toast.error("Failed to create saved view.");
    }
  };

  const handleDeleteView = async (viewId: string) => {
    try {
      await deleteSavedViewAction(viewId);
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      if (activeView?.id === viewId) {
        setActiveView(null);
        setQueryResults([]);
      }
      toast.success("Saved view deleted.");
    } catch {
      toast.error("Failed to delete view.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved Views & Filter Collections</h1>
          <p className="text-sm text-muted-foreground">
            Create dynamic saved searches across tags, backlinks, dates, and note types.
          </p>
        </div>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className="gap-2"
        >
          <Plus className="size-4" />
          {isCreating ? "Cancel" : "New Saved View"}
        </Button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreateView}
          className="mb-8 rounded-xl border bg-card p-6 shadow-sm space-y-5"
        >
          <h2 className="text-base font-semibold">Build Custom View</h2>
          <div>
            <Label htmlFor="view-name">View Name</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Untagged Research Notes"
              className="mt-1"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="mb-2 block">Note Type</Label>
              <div className="flex gap-2">
                {(["note", "project", "daily"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={noteType === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNoteType(noteType === t ? undefined : t)}
                    className="capitalize"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Date Range</Label>
              <div className="flex flex-wrap gap-2">
                {(["all", "today", "this_week", "this_month"] as const).map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant={dateRange === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(d)}
                  >
                    {d.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Tag Filters</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={untaggedOnly ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUntaggedOnly(!untaggedOnly);
                  if (!untaggedOnly) setSelectedTags([]);
                }}
              >
                Untagged Only
              </Button>
              {!untaggedOnly &&
                allTags.map((tag) => {
                  const selected = selectedTags.includes(tag.id);
                  return (
                    <Button
                      key={tag.id}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedTags((prev) =>
                          selected
                            ? prev.filter((id) => id !== tag.id)
                            : [...prev, tag.id],
                        );
                      }}
                    >
                      #{tag.name}
                    </Button>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="backlinks-only"
              checked={hasBacklinks}
              onChange={(e) => setHasBacklinks(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="backlinks-only" className="cursor-pointer text-sm">
              Only notes containing wiki links (`[[...]]`)
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button type="submit">Save View</Button>
          </div>
        </form>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: List of Saved Views */}
        <div className="space-y-3 md:col-span-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved Collections ({views.length})
          </h3>

          <div className="space-y-2">
            {/* Quick built-in presets */}
            <button
              onClick={() => {
                setActiveView(null);
                void executeFilter({ untaggedOnly: true });
              }}
              className="w-full text-left rounded-lg border bg-card p-3 transition-colors hover:border-primary focus-visible:outline-none"
            >
              <div className="flex items-center justify-between font-medium text-sm">
                <span className="flex items-center gap-2">
                  <Tag className="size-4 text-amber-500" />
                  Untagged Notes
                </span>
                <Badge variant="outline" className="text-[10px]">Preset</Badge>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveView(null);
                void executeFilter({ hasBacklinks: true });
              }}
              className="w-full text-left rounded-lg border bg-card p-3 transition-colors hover:border-primary focus-visible:outline-none"
            >
              <div className="flex items-center justify-between font-medium text-sm">
                <span className="flex items-center gap-2">
                  <Link2 className="size-4 text-blue-500" />
                  Wiki Linked Notes
                </span>
                <Badge variant="outline" className="text-[10px]">Preset</Badge>
              </div>
            </button>

            {views.map((view) => (
              <div
                key={view.id}
                onClick={() => setActiveView(view)}
                className={`group flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                  activeView?.id === view.id
                    ? "border-primary bg-primary/5"
                    : "bg-card hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <SlidersHorizontal className="size-4 text-violet-500" />
                  <span>{view.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleDeleteView(view.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Dynamic Results List */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Matching Notes ({queryResults.length})
            </h3>
            {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
          </div>

          <div className="space-y-2">
            {queryResults.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No matching notes found for this view filter.
              </div>
            ) : (
              queryResults.map((note) => (
                <Link
                  key={note.id}
                  href={`/notes/${note.id}`}
                  className="block rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-foreground">
                      {note.title || "Untitled"}
                    </span>
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {note.type}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {note.contentMd.replace(/[#*`>\-\[\]()!]/g, "").slice(0, 140)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
