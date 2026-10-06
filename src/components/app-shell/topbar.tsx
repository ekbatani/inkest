"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { NotificationInbox } from "@/components/app-shell/notification-inbox";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/app-shell/sidebar";
import { CommandMenu } from "@/components/app-shell/command-menu";
import { UserMenu } from "@/components/app-shell/user-menu";
import { useTopbarActions } from "@/components/app-shell/topbar-actions";
import { mainNav, settingsNav } from "@/components/app-shell/nav-items";
import type { NoteTreeNode } from "@/server/notes/service";
import type { InboxNotification } from "@/server/notifications/service";

function getRouteLabel(pathname: string) {
  const navItem = [...mainNav, ...settingsNav].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  if (pathname === "/notes/new") return "New note";
  if (pathname.startsWith("/notes/")) return "Note editor";
  if (pathname.startsWith("/projects/")) return "Project workspace";
  if (pathname.startsWith("/admin/users")) return "User Management";
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

export function Topbar({
  notesTree = [],
  notifications = [],
  isAdmin = false,
  user,
}: {
  notesTree?: NoteTreeNode[];
  notifications?: InboxNotification[];
  isAdmin?: boolean;
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: "admin" | "user" | string | null;
  } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const topbarActions = useTopbarActions();
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  // While the user is typing on a phone the bottom dock gets out of the way,
  // like native apps do when the on-screen keyboard is up.
  const [keyboardOpen, setKeyboardOpen] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setKeyboardOpen(isEditableTarget(document.activeElement));
    const onFocusOut = () => requestAnimationFrame(sync);
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

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
      } else if (key === "j" || (e.shiftKey && key === "a")) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("inkest:toggle-ai-sidebar"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <>
      {/* Below `sm` the bar floats at the bottom of the screen as a glass dock
          (thumb-reachable, native-app feel); from `sm` up it is the top bar. */}
      <header
        data-keyboard={keyboardOpen ? "open" : undefined}
        className={cn(
          "fixed bottom-[calc(0.5rem+var(--sab))] left-[max(0.5rem,calc(0.5rem+var(--sal)))] right-[max(0.5rem,calc(0.5rem+var(--sar)))] z-40 flex items-center gap-0.5 rounded-[1.375rem] border border-border/60 bg-background/70 p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.45)] ring-1 ring-white/5 backdrop-blur-2xl backdrop-saturate-150 transition-[translate,opacity] duration-200 ease-out motion-reduce:transition-none",
          "data-[keyboard=open]:max-sm:pointer-events-none data-[keyboard=open]:max-sm:translate-y-[calc(100%+1rem+var(--sab))] data-[keyboard=open]:max-sm:opacity-0",
          "sm:relative sm:inset-auto sm:z-30 sm:h-16 sm:min-h-[calc(4rem+var(--sat))] sm:shrink-0 sm:gap-2 sm:rounded-none sm:border-0 sm:border-b sm:border-border/70 sm:bg-background/80 sm:pb-0 sm:pl-[max(0.75rem,calc(0.75rem+var(--sal)))] sm:pr-[max(0.75rem,calc(0.75rem+var(--sar)))] sm:pt-[max(0.5rem,calc(0.5rem+var(--sat)))] sm:shadow-none sm:ring-0 sm:backdrop-blur-xl sm:backdrop-saturate-100",
        )}
      >
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 sm:size-9 md:hidden pointer-coarse:size-10"
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
          className="h-9 size-9 shrink-0 justify-center rounded-xl border-border/70 bg-muted/25 px-0 text-muted-foreground shadow-none hover:bg-muted/50 sm:h-9 sm:w-72 sm:justify-start sm:px-3 lg:w-80 pointer-coarse:h-10 pointer-coarse:max-sm:w-10"
        >
          <Search className="size-4 pointer-coarse:size-5" />
          <span className="hidden text-sm sm:inline">Search notes &amp; projects…</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5">
          {topbarActions?.slot?.node}
          <Button
            size="sm"
            aria-label="New note"
            className="size-9 gap-1.5 rounded-full p-0 shadow-sm sm:h-9 sm:w-auto sm:rounded-xl sm:px-3.5 pointer-coarse:max-sm:size-10 pointer-coarse:sm:h-10"
            onClick={() => {
              if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
                window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
              }
              router.push("/notes/new");
            }}
          >
            <Plus className="size-4 pointer-coarse:size-5" />
            <span className="hidden sm:inline">New note</span>
          </Button>
          <NotificationInbox notifications={notifications} />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle AI Assistant sidebar"
            title="Toggle AI Assistant sidebar"
            onClick={() => document.dispatchEvent(new CustomEvent("inkest:toggle-ai-sidebar"))}
            className="size-8 rounded-xl text-muted-foreground hover:text-foreground sm:size-9 pointer-coarse:size-10"
          >
            <Sparkles className="size-4" />
          </Button>
          <div className="mx-1 hidden h-5 w-px bg-border/60 sm:block" />
          <UserMenu user={user} align="end" />
        </div>
      </header>

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        isAdmin={isAdmin}
      />
    </>
  );
}
