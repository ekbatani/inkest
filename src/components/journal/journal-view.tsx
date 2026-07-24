"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Plus, Filter, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JournalTemplateModal } from "./journal-template-modal";
import { JOURNAL_TEMPLATES, type JournalTemplateType } from "@/lib/journal-templates";

interface JournalRow {
  entry: {
    id: string;
    noteId: string;
    templateMode: string;
    createdAt: Date;
  };
  noteTitle: string;
  contentMd: string;
  updatedAt: Date;
}

interface Props {
  initialEntries: JournalRow[];
}

export function JournalView({ initialEntries }: Props) {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>("all");

  const filtered = initialEntries.filter((e) => {
    if (filterType === "all") return true;
    return e.entry.templateMode === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-6">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <BookOpen className="size-6 text-emerald-500" />
            Structured Journaling
          </h1>
          <p className="text-sm text-muted-foreground">
            Guided templates for reflections, decision logs, and research synthesis.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="size-4" /> New Journal Entry
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 font-medium text-muted-foreground pr-2">
          <Filter className="size-3.5" /> Filter:
        </span>
        <Button
          variant={filterType === "all" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => setFilterType("all")}
        >
          All ({initialEntries.length})
        </Button>
        {Object.values(JOURNAL_TEMPLATES).map((tmpl) => {
          const count = initialEntries.filter((e) => e.entry.templateMode === tmpl.type).length;
          return (
            <Button
              key={tmpl.type}
              variant={filterType === tmpl.type ? "secondary" : "ghost"}
              size="xs"
              onClick={() => setFilterType(tmpl.type)}
            >
              {tmpl.title} ({count})
            </Button>
          );
        })}
      </div>

      {/* Timeline Entries */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border bg-card p-12 text-center space-y-3">
            <BookOpen className="mx-auto size-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No journal entries found</p>
            <p className="text-xs text-muted-foreground">Create your first entry using guided reflection templates.</p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> New Entry
            </Button>
          </div>
        ) : (
          filtered.map((item) => {
            const tmpl = JOURNAL_TEMPLATES[item.entry.templateMode as JournalTemplateType];
            return (
              <Link
                key={item.entry.id}
                href={`/notes/${item.entry.noteId}`}
                className="group flex flex-col gap-2 rounded-xl border bg-card p-4 transition-all hover:border-emerald-500/50 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 capitalize">
                      {tmpl?.title || item.entry.templateMode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.entry.createdAt).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {item.noteTitle}
                </h3>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {item.contentMd.slice(0, 180)}...
                </p>
              </Link>
            );
          })
        )}
      </div>

      <JournalTemplateModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  );
}
