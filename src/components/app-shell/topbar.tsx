"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, Plus, Search } from "lucide-react";
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

export function Topbar() {
  const router = useRouter();
  const [commandOpen, setCommandOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
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
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Sheet>
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
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar />
          </SheetContent>
        </Sheet>

        <Button
          variant="outline"
          role="combobox"
          aria-label="Open command menu"
          onClick={() => setCommandOpen(true)}
          className="h-9 w-full max-w-xs justify-start gap-2 px-3 text-muted-foreground sm:w-72"
        >
          <Search className="size-4" />
          <span className="text-sm">Search…</span>
          <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Ctrl K
          </kbd>
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            className="gap-1.5"
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
