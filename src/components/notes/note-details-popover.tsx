"use client";

import * as React from "react";
import Link from "next/link";
import {
  SlidersHorizontal,
  FolderKanban,
  Circle,
  CircleDot,
  Info,
  Tag as TagIcon,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DueDatePicker } from "@/components/notes/due-date-picker";
import { ParentPicker } from "@/components/notes/parent-picker";
import { TagSelector } from "@/components/notes/tag-selector";
import { DailyNoteCalendarPanel } from "@/components/calendar/daily-note-calendar-panel";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Note, Tag, GoogleCalendarEvent } from "@/server/db/schema";

type NoteDetailsPopoverProps = {
  note: Note;
  metadata: {
    type: string;
    direction: string;
    status: string;
    priority: string;
    pinned: boolean;
    parentId: string | null;
    dueDate: Date | null;
  };
  onChange: (field: string, value: string | boolean | null | Date) => void;
  allTags: Tag[];
  noteTagIds: string[];
  parentCandidates: Pick<Note, "id" | "title" | "type">[];
  backlinks: { id: string; title: string; snippet?: string; type?: string }[];
  dailyAgenda?: {
    dateKey: string;
    events: GoogleCalendarEvent[];
    status: {
      configured: boolean;
      connected: boolean;
      googleEmail: string | null;
      lastSyncedAt: Date | null;
    };
  };
  projectTaskCount: number;
};

export function NoteDetailsPopover({
  note,
  metadata,
  onChange,
  allTags,
  noteTagIds,
  parentCandidates,
  backlinks,
  dailyAgenda,
  projectTaskCount,
}: NoteDetailsPopoverProps) {
  const showProjectLink = metadata.type === "project";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-xl border-border/70 bg-background/50 px-2.5 text-xs shadow-none hover:bg-muted/50"
            aria-label="Note Details & Properties"
            title="Note Details & Properties"
          />
        }
      >
        <SlidersHorizontal className="size-3.5 text-muted-foreground" />
        <span className="hidden sm:inline font-medium">Details</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-88 p-0 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Note Details
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            ID: {note.id.slice(0, 8)}
          </span>
        </div>

        <ScrollArea className="max-h-[80vh] p-4">
          <div className="space-y-4">
            {/* Project workspace link */}
            {showProjectLink && (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Project workspace
                    </h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {projectTaskCount} task note
                      {projectTaskCount === 1 ? "" : "s"} linked.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-xs"
                    nativeButton={false}
                    render={<Link href={`/projects/${note.id}?tab=tasks`} />}
                  >
                    <FolderKanban className="size-3" />
                    Tasks
                  </Button>
                </div>
              </div>
            )}

            {/* Properties section */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Properties
              </h4>

              <div className="grid gap-3">
                <CompactField label="Type">
                  <ChoiceGroup
                    value={metadata.type}
                    onChange={(v) => onChange("type", v)}
                    columns={3}
                    options={[
                      { value: "note", label: "Note" },
                      { value: "project", label: "Project" },
                      { value: "daily", label: "Daily" },
                    ]}
                  />
                </CompactField>

                <CompactField label="Direction">
                  <ChoiceGroup
                    value={metadata.direction}
                    onChange={(v) => onChange("direction", v)}
                    columns={3}
                    options={[
                      { value: "auto", label: "Auto" },
                      { value: "ltr", label: "LTR" },
                      { value: "rtl", label: "RTL" },
                    ]}
                  />
                </CompactField>

                <CompactField label="Status">
                  <Select
                    value={metadata.status}
                    onValueChange={(v) => v && onChange("status", v)}
                  >
                    <SelectTrigger className="h-8.5 w-full rounded-xl border-border/70 bg-background text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="todo">To do</SelectItem>
                      <SelectItem value="doing">In progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </CompactField>

                <DueDatePicker
                  value={metadata.dueDate}
                  onChange={(d) => onChange("dueDate", d)}
                />

                <ParentPicker
                  noteId={note.id}
                  value={metadata.parentId}
                  candidates={parentCandidates}
                  projectOnly={metadata.type === "project"}
                  onChange={(v) => onChange("parentId", v)}
                />
              </div>
            </div>

            {/* Tags section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <TagIcon className="size-3" />
                <span>Tags</span>
              </div>
              <TagSelector
                noteId={note.id}
                allTags={allTags}
                selectedTagIds={noteTagIds}
              />
            </div>

            {/* Daily note calendar panel if applicable */}
            {metadata.type === "daily" && dailyAgenda && (
              <DailyNoteCalendarPanel
                dateKey={dailyAgenda.dateKey}
                events={dailyAgenda.events}
                status={dailyAgenda.status}
              />
            )}

            {/* Backlinks */}
            {backlinks.length > 0 && (
              <div className="rounded-xl border border-border/70 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Link2 className="size-3.5" />
                  <span>Links to this note ({backlinks.length})</span>
                </div>
                <ul className="flex flex-col gap-2 text-xs">
                  {backlinks.map((b) => (
                    <li key={b.id} className="group">
                      <Link
                        href={b.type === "project" ? `/projects/${b.id}` : `/notes/${b.id}`}
                        className="block truncate font-medium text-foreground/90 hover:text-primary transition-colors"
                      >
                        ← {b.type === "project" ? `📁 ${b.title || "Untitled"}` : b.title || "Untitled"}
                      </Link>
                      {b.snippet && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground/80 italic font-mono bg-muted/30 p-1.5 rounded-lg border border-border/40">
                          &quot;{b.snippet}&quot;
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Timestamps */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span className="font-medium text-foreground/80">{formatDate(note.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated</span>
                <span className="font-medium text-foreground/80">{formatDate(note.updatedAt)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ChoiceGroup({
  value,
  onChange,
  options,
  columns = 1,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  columns?: 1 | 2 | 3 | 4;
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "grid gap-1.5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
      )}
    >
      {options.map((option) => {
        const checked = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-center transition text-xs font-medium",
              checked
                ? "border-primary/40 bg-primary/10 text-primary shadow-xs"
                : "border-border/70 bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            {checked ? (
              <CircleDot className="size-3 shrink-0 text-primary" />
            ) : (
              <Circle className="size-3 shrink-0 text-muted-foreground/60" />
            )}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
