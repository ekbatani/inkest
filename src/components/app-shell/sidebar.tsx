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
import { LogoutButton } from "@/components/auth/logout-button";
import type { NoteTreeNode } from "@/server/notes/service";

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

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
  user,
  onNavigate,
}: {
  notesTree?: NoteTreeNode[];
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: "admin" | "user" | string | null;
  } | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const navItemsToRender = settingsNav;

  return (
    <div
      className="flex h-full flex-col"
      style={{
        paddingTop: "max(0px, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(0px, env(safe-area-inset-bottom, 0px))",
        paddingLeft: "max(0px, env(safe-area-inset-left, 0px))",
      }}
    >
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-xl px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-card border border-border/80 p-1 shadow-xs shrink-0">
          <LogoMark className="size-full" />
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
      <div className="border-t border-sidebar-border/70 px-3 py-3 space-y-2">
        {user?.email && (
          <div className="flex items-center gap-2.5 px-3 py-1 text-xs">
            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold ring-1 ring-border/70 shrink-0">
              {getInitials(user.name, user.email)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground text-xs leading-none">
                {user.name || user.email.split("@")[0]}
              </p>
              <p className="truncate text-[10px] text-muted-foreground mt-0.5 leading-none">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {navItemsToRender.map((item) => (
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

          <LogoutButton
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring h-9"
            onLogoutStart={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}
