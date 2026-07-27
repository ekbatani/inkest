"use client";

import * as React from "react";
import Link from "next/link";
import { BookOpen, Plus, Filter, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <div className="app-page gap-6 sm:gap-8">
      {/* Header */}
      <div className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="size-4 text-primary" />
              <span className="section-label">Structured Reflection</span>
            </div>
            <h1 className="text-2xl font-semibold tracking-[-0.035em] sm:text-3xl text-foreground">
              Journal & Reflections
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Guided templates for daily reflections, decision logs, and research synthesis.
            </p>
          </div>
          <Button
            onClick={() => setModalOpen(true)}
            className="rounded-xl shadow-sm gap-2 shrink-0"
          >
            <Plus className="size-4" /> New Journal Entry
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="flex items-center gap-1 section-label pr-2 shrink-0">
          <Filter className="size-3" /> Filter:
        </span>
        <Button
          variant={filterType === "all" ? "secondary" : "ghost"}
          size="sm"
          className="rounded-lg text-xs"
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
              size="sm"
              className="rounded-lg text-xs"
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
          <div className="surface-card-dashed p-12 text-center space-y-3">
            <BookOpen className="mx-auto size-10 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No journal entries found</p>
            <p className="text-xs text-muted-foreground">Create your first entry using guided reflection templates.</p>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 rounded-xl shadow-sm">
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
                className="surface-card-interactive group block p-5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px] font-medium capitalize">
                      {tmpl?.title || item.entry.templateMode}
                    </Badge>
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
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                  {item.noteTitle}
                </h3>
                <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                  {item.contentMd.replace(/[#*_`>~\-[\]()!]/g, "").slice(0, 180)}...
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

