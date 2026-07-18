"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo-mark";
import {
  mainNav,
  settingsNav,
  type NavItem,
} from "@/components/app-shell/nav-items";
import { NotesTree } from "@/components/app-shell/notes-tree";
import type { NoteTreeNode } from "@/server/notes/service";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const render = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={cn(
        "group flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isActive(item.href) &&
          "bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.05)] ring-1 ring-border/70",
      )}
    >
      <item.icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          isActive(item.href) && "text-primary",
        )}
      />
      <span>{item.label}</span>
    </Link>
  );

  return (
    <nav className="flex flex-col gap-1 px-3 pb-3" aria-label="Workspace">
      <p className="section-label px-3 pb-1 pt-2">Workspace</p>
      {mainNav.map(render)}
    </nav>
  );
}

export function Sidebar({
  notesTree = [],
  onNavigate,
}: {
  notesTree?: NoteTreeNode[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
          <LogoMark className="size-[1.1rem]" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-tight">inkest</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            Your thinking space
          </span>
        </span>
      </Link>

      <div className="px-3 pb-3">
        <Link
          href="/notes/new"
          onClick={onNavigate}
          className="flex h-9 items-center justify-center gap-2 rounded-xl bg-foreground px-3 text-xs font-semibold text-background shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Plus className="size-3.5" />
          Capture note
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
        <NotesTree nodes={notesTree} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-sidebar-border/70 px-3 py-3">
        {settingsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "page"
                : undefined
            }
            className={cn(
              "group flex min-h-9 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              (pathname === item.href || pathname.startsWith(`${item.href}/`)) &&
                "bg-background text-foreground ring-1 ring-border/70",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
