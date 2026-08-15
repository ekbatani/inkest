"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Zap,
  Keyboard,
  FileEdit,
  Calendar,
  CheckSquare,
  Sparkles,
  Send,
  Library,
  Server,
  ChevronRight,
  Menu,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocNavItem {
  title: string;
  href: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export interface DocNavGroup {
  group: string;
  items: DocNavItem[];
}

export const DOCS_NAVIGATION: DocNavGroup[] = [
  {
    group: "Getting Started",
    items: [
      {
        title: "Overview",
        href: "/docs",
        description: "Introduction to Inkest workspace & philosophy",
        icon: BookOpen,
      },
      {
        title: "Quick Start",
        href: "/docs/quickstart",
        description: "First note, markdown basics, workspace setup",
        icon: Zap,
      },
      {
        title: "Keyboard Shortcuts",
        href: "/docs/keyboard-shortcuts",
        description: "Speed up editing & navigation with hotkeys",
        icon: Keyboard,
      },
    ],
  },
  {
    group: "Core Features",
    items: [
      {
        title: "Notes & Markdown",
        href: "/docs/notes-editor",
        description: "Wiki-links, tags, checklists, math, Mermaid & files",
        icon: FileEdit,
      },
      {
        title: "Daily Journal",
        href: "/docs/daily-journal",
        description: "Daily notes, calendar logs, and habit reflections",
        icon: Calendar,
      },
      {
        title: "Projects & Tasks",
        href: "/docs/projects-tasks",
        description: "Kanban boards, list views, and AI task extraction",
        icon: CheckSquare,
      },
      {
        title: "Reader & Vault",
        href: "/docs/reader-vault",
        description: "Web clipping, vault graph, tag browser, and search",
        icon: Library,
      },
    ],
  },
  {
    group: "AI & Integrations",
    items: [
      {
        title: "AI Assistant & Privacy",
        href: "/docs/ai-assistant",
        description: "Configure providers, prompt actions, token caps & privacy",
        icon: Sparkles,
        badge: "Essential",
      },
      {
        title: "Telegram Bot",
        href: "/docs/telegram",
        description: "Setup BotFather, webhook, linking code, and reminders",
        icon: Send,
      },
    ],
  },
  {
    group: "Self-Hosting",
    items: [
      {
        title: "Deployment & Docker",
        href: "/docs/self-hosting",
        description: "Docker Compose, environment variables, SQLite & MinIO",
        icon: Server,
      },
    ],
  },
];

export function DocsSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [filter, setFilter] = React.useState("");
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const filteredGroups = React.useMemo(() => {
    if (!filter.trim()) return DOCS_NAVIGATION;
    const q = filter.toLowerCase();
    return DOCS_NAVIGATION.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q),
      ),
    })).filter((group) => group.items.length > 0);
  }, [filter]);

  return (
    <>
      {/* Mobile Drawer Trigger Bar */}
      <div className="flex items-center justify-between border-b border-border/70 bg-card/60 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <BookOpen className="size-4 text-primary" />
          <span>Documentation Menu</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background text-foreground hover:bg-muted"
          aria-label="Toggle documentation navigation"
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Sidebar Content */}
      <aside
        className={cn(
          "w-full flex-col gap-6 lg:w-72 lg:shrink-0 lg:flex",
          mobileOpen ? "flex border-b border-border/70 bg-card/90 p-4" : "hidden lg:flex",
          className,
        )}
      >
        {/* Quick Filter */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter documentation..."
            className="h-8 w-full rounded-lg border border-border/70 bg-muted/40 pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Groups */}
        <nav aria-label="Documentation Categories" className="flex flex-col gap-6">
          {filteredGroups.map((group) => (
            <div key={group.group} className="flex flex-col gap-1.5">
              <h4 className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.group}
              </h4>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive
                              ? "text-primary-foreground"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        />
                        <span className="truncate">{item.title}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {item.badge}
                        </span>
                      ) : isActive ? (
                        <ChevronRight className="size-3.5 text-primary-foreground" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
