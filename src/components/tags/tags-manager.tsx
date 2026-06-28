"use client";

import * as React from "react";
import { Pencil, Trash2, Plus, Tag as TagIcon, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  createTagAction,
  updateTagAction,
  deleteTagAction,
} from "@/server/tags/actions";
import type { Tag } from "@/server/db/schema";

const PRESET_COLORS = [
  "#e05858", // red
  "#d97706", // amber
  "#16a34a", // green
  "#0891b2", // cyan
  "#3b82f6", // blue
  "#7c3aed", // violet
  "#db2777", // pink
  "#64748b", // slate
];

type TagWithCount = Tag & { noteCount: number };

export function TagsManager({ initialTags }: { initialTags: TagWithCount[] }) {
  const [tags, setTags] = React.useState<TagWithCount[]>(initialTags);
  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const tag = await createTagAction({ name, color: newColor });
      setTags((prev) =>
        [...prev, { ...tag, noteCount: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewName("");
      setNewColor(null);
      toast.success(`Tag “${tag.name}” created.`);
    } catch {
      toast.error("Failed to create tag.");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdated = (id: string, next: Partial<TagWithCount>) => {
    setTags((prev) =>
      prev
        .map((t) => (t.id === id ? { ...t, ...next } : t))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  const handleDeleted = (id: string) => {
    setTags((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-semibold">New tag</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="e.g. design, urgent, idea"
              className="mt-1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">Color</Label>
            <ColorSwatches
              value={newColor}
              onChange={setNewColor}
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="gap-1.5"
          >
            <Plus className="size-4" /> Create
          </Button>
        </div>
      </section>

      <section className="rounded-xl border bg-card">
        <header className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold">Your tags</h2>
          <span className="text-xs text-muted-foreground">
            {tags.length} tag{tags.length === 1 ? "" : "s"}
          </span>
        </header>
        <div className="divide-y">
          {tags.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                <TagIcon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No tags yet</p>
              <p className="text-xs text-muted-foreground">
                Create one above to start organizing notes.
              </p>
            </div>
          ) : (
            tags.map((tag) => (
              <TagRow
                key={tag.id}
                tag={tag}
                onUpdated={(n) => handleUpdated(tag.id, n)}
                onDeleted={() => handleDeleted(tag.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TagRow({
  tag,
  onUpdated,
  onDeleted,
}: {
  tag: TagWithCount;
  onUpdated: (next: Partial<TagWithCount>) => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(tag.name);
  const [color, setColor] = React.useState<string | null>(tag.color);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTagAction(tag.id, {
        name: name.trim(),
        color,
      });
      if (updated) {
        onUpdated({ name: updated.name, color: updated.color });
        setEditing(false);
        toast.success("Tag updated.");
      }
    } catch {
      toast.error("Failed to update tag.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete tag “${tag.name}”? It will be removed from all notes.`))
      return;
    try {
      await deleteTagAction(tag.id);
      onDeleted();
      toast.success("Tag deleted.");
    } catch {
      toast.error("Failed to delete tag.");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      {editing ? (
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1"
            autoFocus
          />
          <ColorSwatches value={color} onChange={setColor} compact />
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={save}
              disabled={saving}
              aria-label="Save"
            >
              <Check className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setName(tag.name);
                setColor(tag.color);
              }}
              aria-label="Cancel"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Badge
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
            </Badge>
            <span className="text-xs text-muted-foreground">
              {tag.noteCount} note{tag.noteCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label={`Edit ${tag.name}`}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={remove}
              aria-label={`Delete ${tag.name}`}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ColorSwatches({
  value,
  onChange,
  compact,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", compact && "py-1")}>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "flex size-6 items-center justify-center rounded-md border bg-card text-muted-foreground hover:bg-muted",
          value === null && "border-foreground/40 ring-2 ring-foreground/20",
        )}
        aria-label="No color"
        title="No color"
      >
        <X className="size-3" />
      </button>
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            "size-6 rounded-md border transition-transform hover:scale-110",
            value === c && "ring-2 ring-offset-1 ring-foreground/30",
          )}
          style={{ backgroundColor: c }}
          aria-label={`Color ${c}`}
          title={c}
        />
      ))}
    </div>
  );
}