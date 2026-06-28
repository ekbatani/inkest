"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mainNav,
  settingsNav,
  type NavItem,
} from "@/components/app-shell/nav-items";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const render = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "text-muted-foreground hover:bg-muted hover:text-foreground",
        isActive(item.href) && "bg-muted text-foreground",
      )}
    >
      <item.icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {mainNav.map(render)}
    </nav>
  );
}

export function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-5 py-4 text-sm font-semibold"
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
          <Feather className="size-4" />
        </span>
        <span>InkNest</span>
      </Link>
      <div className="flex-1 overflow-y-auto">
        <NavLinks />
      </div>
      <div className="border-t px-3 py-2">
        {settingsNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
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
