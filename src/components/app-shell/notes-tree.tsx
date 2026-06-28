"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  Folder,
  FileText,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteTreeNode } from "@/server/notes/service";

export function NotesTree({ nodes }: { nodes: NoteTreeNode[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState<Record<string, boolean>>({});

  if (nodes.length === 0) return null;

  // Auto-expand ancestor of the active note into initial state, derived lazily
  // from pathname so we don't need a setState-in-effect.
  const ancestorId = (() => {
    const match = /(\/notes\/[^/]+)/.exec(pathname);
    const activeId = match?.[1].split("/").pop();
    if (!activeId) return null;
    return (
      nodes.find(
        (n) =>
          n.id !== activeId && n.children.some((c) => c.id === activeId),
      )?.id ?? null
    );
  })();

  return (
    <div className="px-3 pt-2">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notes Tree
        </span>
        <Link
          href="/notes"
          className="text-muted-foreground hover:text-foreground"
          aria-label="All notes"
        >
          <Plus className="size-3.5" />
        </Link>
      </div>
      <ul className="flex flex-col gap-0.5">
        {nodes.map((node) => {
          const isActive = pathname === `/notes/${node.id}`;
          const hasChildren = node.children.length > 0;
          const isOpen = Boolean(open[node.id]) || ancestorId === node.id;
          return (
            <li key={node.id}>
              <div className="flex items-center gap-1">
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpen((p) => ({ ...p, [node.id]: !p[node.id] }))
                    }
                    className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    <ChevronRight
                      className={cn(
                        "size-3.5 transition-transform",
                        isOpen && "rotate-90",
                      )}
                    />
                  </button>
                )}
                <Link
                  href={`/notes/${node.id}`}
                  className={cn(
                    "group flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {node.type === "project" ? (
                    <Folder className="size-3.5 shrink-0" />
                  ) : (
                    <FileText className="size-3.5 shrink-0" />
                  )}
                  <span className="truncate">{node.title || "Untitled"}</span>
                </Link>
              </div>
              {hasChildren && isOpen && (
                <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l pl-2">
                  {node.children.map((child) => {
                    const cid = `/notes/${child.id}`;
                    const childActive = pathname === cid;
                    return (
                      <li key={child.id}>
                        <Link
                          href={cid}
                          className={cn(
                            "group flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                            childActive
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <FileText className="size-3 shrink-0" />
                          <span className="truncate">{child.title || "Untitled"}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}