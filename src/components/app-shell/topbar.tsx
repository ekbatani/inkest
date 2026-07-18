"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/app-shell/sidebar";
import { CommandMenu } from "@/components/app-shell/command-menu";
import { mainNav, settingsNav } from "@/components/app-shell/nav-items";
import type { NoteTreeNode } from "@/server/notes/service";

function getRouteLabel(pathname: string) {
  const navItem = [...mainNav, ...settingsNav].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (pathname === "/notes/new") return "New note";
  if (pathname.startsWith("/notes/")) return "Note editor";
  if (pathname.startsWith("/projects/")) return "Project workspace";
  return navItem?.label ?? "Workspace";
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.getAttribute("role") === "textbox")
  );
}

export function Topbar({ notesTree = [] }: { notesTree?: NoteTreeNode[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      } else if (isEditableTarget(e.target)) {
        return;
      } else if (key === "n" && !e.shiftKey) {
        e.preventDefault();
        router.push("/notes/new");
      } else if (key === "d" && !e.shiftKey) {
        e.preventDefault();
        router.push("/daily");
      } else if (key === "\\") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("inkest:toggle-sidebar"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <>
      <header className="relative z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-3 backdrop-blur-xl sm:px-5">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar
              notesTree={notesTree}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="hidden min-w-32 md:block">
          <p className="section-label leading-none">Current space</p>
          <p className="mt-1 truncate text-sm font-semibold tracking-tight">
            {getRouteLabel(pathname)}
          </p>
        </div>

        <div className="mx-2 hidden h-6 w-px bg-border/80 md:block" />

        <Button
          variant="outline"
          role="combobox"
          aria-label="Open command menu"
          onClick={() => setCommandOpen(true)}
          className="h-9 w-full max-w-sm justify-start gap-2 rounded-xl border-border/70 bg-muted/25 px-3 text-muted-foreground shadow-none hover:bg-muted/50 sm:w-72 lg:w-80"
        >
          <Search className="size-4" />
          <span className="text-sm">Search…</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="hidden gap-1.5 text-muted-foreground lg:flex"
            onClick={() => router.push("/daily")}
          >
            <CalendarDays className="size-4" />
            Today
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl px-3.5 shadow-sm"
            onClick={() => router.push("/notes/new")}
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New note</span>
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  );
}
