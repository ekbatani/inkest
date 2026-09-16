"use client";

import * as React from "react";
import { Plus, ChevronDown, Check, FileText, CalendarDays, Folder, File, Layers, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWorkspaceTabs } from "./tabs-context";
import { WorkspaceTabItem } from "./workspace-tab";
import { cn } from "@/lib/utils";
import { usesRtlTitleFont } from "@/lib/text/rtl";

function TabTypeIcon({ type, tabId, className }: { type?: string; tabId?: string; className?: string }) {
  if (tabId === "notes-overview") return <NotebookPen className={className} />;
  if (type === "daily") return <CalendarDays className={className} />;
  if (type === "project") return <Folder className={className} />;
  if (type === "document") return <File className={className} />;
  return <FileText className={className} />;
}

export function WorkspaceTabBar() {
  const {
    tabs,
    activeTabId,
    openTab,
    switchTab,
    closeTab,
    closeAllTabs,
    togglePinTab,
    reorderTabs,
  } = useWorkspaceTabs();

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Convert vertical mouse wheel into horizontal scroll on tabs bar
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (scrollContainerRef.current && e.deltaY !== 0) {
      e.preventDefault();
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  // Ensure active tab is scrolled into view when switched
  React.useEffect(() => {
    if (!scrollContainerRef.current || !activeTabId) return;
    const activeEl = scrollContainerRef.current.querySelector('[aria-selected="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [activeTabId]);

  if (tabs.length === 0) {
    return null;
  }

  const handleNewTab = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("inkest:flush-active-save"));
    }
    openTab({
      id: "notes-overview",
      title: "All Notes",
      url: "/notes",
      type: "note",
    });
  };

  return (
    <nav
      aria-label="Workspace tabs"
      className="relative z-20 flex h-9 shrink-0 items-center justify-between border-b border-border/70 bg-muted/20 px-2 backdrop-blur-sm"
    >
      {/* Scrollable Tab Strip */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        role="tablist"
        className="flex min-w-0 flex-1 items-center overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex items-center">
          {tabs.map((tab, index) => (
            <WorkspaceTabItem
              key={tab.id}
              tab={tab}
              index={index}
              isActive={tab.id === activeTabId}
              onSelect={switchTab}
              onClose={closeTab}
              onTogglePin={togglePinTab}
              onReorder={reorderTabs}
            />
          ))}

          {/* New Tab Button */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleNewTab}
                  aria-label="Open new note in tab"
                  className="ml-1 size-7 shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
                />
              }
            >
              <Plus className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              New note in tab (Alt+T)
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Right controls: Tab switcher overflow menu */}
      <div className="ml-2 flex shrink-0 items-center gap-1 border-l border-border/40 pl-1.5">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="xs"
                      aria-label="List open tabs"
                      className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    />
                  }
                >
                  <Layers className="size-3" />
                  <span className="tabular-nums">{tabs.length}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </DropdownMenuTrigger>
              }
            >
              All open tabs ({tabs.length})
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              Quick tab switcher
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="end" side="bottom" className="w-56 text-xs">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Open Tabs ({tabs.length})
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {tabs.map((tab) => {
              const isSelected = tab.id === activeTabId;
              const isRtl = usesRtlTitleFont(tab.title);

              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={cn(
                    "flex items-center justify-between gap-2",
                    isSelected && "font-medium text-foreground bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TabTypeIcon type={tab.type} tabId={tab.id} className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className={cn("truncate", isRtl && "rtl-vazir")}>
                      {tab.title || "Untitled"}
                    </span>
                  </div>
                  {isSelected && <Check className="size-3 shrink-0 text-primary" />}
                </DropdownMenuItem>
              );
            })}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={closeAllTabs}
              className="text-muted-foreground hover:text-destructive focus:text-destructive"
            >
              Close all tabs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
