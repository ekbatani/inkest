"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_STORAGE_KEY = "inkest:sidebar-width";

const AI_SIDEBAR_DEFAULT_WIDTH = 360;
const AI_SIDEBAR_MIN_WIDTH = 280;
const AI_SIDEBAR_MAX_WIDTH = 560;
const AI_SIDEBAR_STORAGE_KEY = "inkest:ai-sidebar-open";
const AI_SIDEBAR_WIDTH_STORAGE_KEY = "inkest:ai-sidebar-width";

function isNoteRoute(path: string): boolean {
  return (
    path.startsWith("/notes") ||
    path.startsWith("/daily") ||
    path.startsWith("/journal")
  );
}

export function SidebarToggleWrapper({
  sidebar,
  aiSidebar,
  children,
}: {
  sidebar: React.ReactNode;
  aiSidebar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [aiSidebarOpen, setAiSidebarOpen] = React.useState(() => {
    if (typeof window === "undefined") return true;
    const isNote = isNoteRoute(window.location?.pathname || "");
    return isNote;
  });

  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    const savedWidth = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!savedWidth) return SIDEBAR_DEFAULT_WIDTH;
    const parsedWidth = Number.parseInt(savedWidth, 10);
    if (Number.isNaN(parsedWidth)) return SIDEBAR_DEFAULT_WIDTH;
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsedWidth));
  });

  const [aiSidebarWidth, setAiSidebarWidth] = React.useState(() => {
    if (typeof window === "undefined") return AI_SIDEBAR_DEFAULT_WIDTH;
    const savedWidth = window.localStorage.getItem(AI_SIDEBAR_WIDTH_STORAGE_KEY);
    if (!savedWidth) return AI_SIDEBAR_DEFAULT_WIDTH;
    const parsedWidth = Number.parseInt(savedWidth, 10);
    if (Number.isNaN(parsedWidth)) return AI_SIDEBAR_DEFAULT_WIDTH;
    return Math.min(
      AI_SIDEBAR_MAX_WIDTH,
      Math.max(AI_SIDEBAR_MIN_WIDTH, parsedWidth),
    );
  });

  const dragStateRef = React.useRef<{
    cleanup: () => void;
  } | null>(null);

  const aiDragStateRef = React.useRef<{
    cleanup: () => void;
  } | null>(null);

  const prevCategoryRef = React.useRef<"note" | "other" | null>(null);

  // Route-based default: Open automatically in note pages, closed in other pages
  React.useEffect(() => {
    const currentCategory = isNoteRoute(pathname) ? "note" : "other";
    if (prevCategoryRef.current === null) {
      prevCategoryRef.current = currentCategory;
      setAiSidebarOpen(currentCategory === "note");
    } else if (prevCategoryRef.current !== currentCategory) {
      prevCategoryRef.current = currentCategory;
      setAiSidebarOpen(currentCategory === "note");
    }
  }, [pathname]);

  React.useEffect(() => {
    const handler = () => setCollapsed((v) => !v);
    document.addEventListener("inkest:toggle-sidebar", handler);
    return () => document.removeEventListener("inkest:toggle-sidebar", handler);
  }, []);

  React.useEffect(() => {
    const handler = () => setAiSidebarOpen((v) => !v);
    document.addEventListener("inkest:toggle-ai-sidebar", handler);
    return () => document.removeEventListener("inkest:toggle-ai-sidebar", handler);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      AI_SIDEBAR_WIDTH_STORAGE_KEY,
      String(aiSidebarWidth),
    );
  }, [aiSidebarWidth]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AI_SIDEBAR_STORAGE_KEY, String(aiSidebarOpen));
  }, [aiSidebarOpen]);

  React.useEffect(() => {
    return () => {
      dragStateRef.current?.cleanup();
      dragStateRef.current = null;
      aiDragStateRef.current?.cleanup();
      aiDragStateRef.current = null;
    };
  }, []);

  // Left sidebar resize
  const startResize = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) {
        return;
      }

      event.preventDefault();

      const nextWidth = (clientX: number) => {
        setSidebarWidth(
          Math.min(
            SIDEBAR_MAX_WIDTH,
            Math.max(SIDEBAR_MIN_WIDTH, Math.round(clientX)),
          ),
        );
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        nextWidth(moveEvent.clientX);
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        dragStateRef.current = null;
      };

      dragStateRef.current?.cleanup();
      dragStateRef.current = { cleanup };

      nextWidth(event.clientX);
      document.body.style.setProperty("cursor", "col-resize");
      document.body.style.setProperty("user-select", "none");
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", cleanup, { once: true });
      window.addEventListener("pointercancel", cleanup, { once: true });
    },
    [collapsed],
  );

  const resizeFromKeyboard = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (collapsed) {
        return;
      }

      const step = event.shiftKey ? 50 : 20;
      const nextWidthForKey: Record<string, number | undefined> = {
        ArrowLeft: sidebarWidth - step,
        ArrowRight: sidebarWidth + step,
        Home: SIDEBAR_MIN_WIDTH,
        End: SIDEBAR_MAX_WIDTH,
      };
      const nextWidth = nextWidthForKey[event.key];

      if (nextWidth === undefined) {
        return;
      }

      event.preventDefault();
      setSidebarWidth(
        Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, nextWidth)),
      );
    },
    [collapsed, sidebarWidth],
  );

  // AI right sidebar resize
  const startAiResize = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!aiSidebarOpen) {
        return;
      }

      event.preventDefault();

      const nextWidth = (clientX: number) => {
        const calculated = window.innerWidth - clientX;
        setAiSidebarWidth(
          Math.min(
            AI_SIDEBAR_MAX_WIDTH,
            Math.max(AI_SIDEBAR_MIN_WIDTH, Math.round(calculated)),
          ),
        );
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        nextWidth(moveEvent.clientX);
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", cleanup);
        window.removeEventListener("pointercancel", cleanup);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        aiDragStateRef.current = null;
      };

      aiDragStateRef.current?.cleanup();
      aiDragStateRef.current = { cleanup };

      nextWidth(event.clientX);
      document.body.style.setProperty("cursor", "col-resize");
      document.body.style.setProperty("user-select", "none");
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", cleanup, { once: true });
      window.addEventListener("pointercancel", cleanup, { once: true });
    },
    [aiSidebarOpen],
  );

  const resizeAiFromKeyboard = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!aiSidebarOpen) {
        return;
      }

      const step = event.shiftKey ? 50 : 20;
      const nextWidthForKey: Record<string, number | undefined> = {
        ArrowLeft: aiSidebarWidth + step,
        ArrowRight: aiSidebarWidth - step,
        Home: AI_SIDEBAR_MIN_WIDTH,
        End: AI_SIDEBAR_MAX_WIDTH,
      };
      const nextWidth = nextWidthForKey[event.key];

      if (nextWidth === undefined) {
        return;
      }

      event.preventDefault();
      setAiSidebarWidth(
        Math.min(AI_SIDEBAR_MAX_WIDTH, Math.max(AI_SIDEBAR_MIN_WIDTH, nextWidth)),
      );
    },
    [aiSidebarOpen, aiSidebarWidth],
  );

  return (
    <div className="relative flex h-dvh w-full overflow-hidden">
      {/* Left Navigation Sidebar */}
      <aside
        className={cn(
          "relative hidden shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:block",
          collapsed && "w-0 overflow-hidden border-r-0",
        )}
        style={{ width: collapsed ? 0 : sidebarWidth }}
      >
        {!collapsed && sidebar}
        {!collapsed ? (
          <div
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin={SIDEBAR_MIN_WIDTH}
            aria-valuemax={SIDEBAR_MAX_WIDTH}
            aria-valuenow={sidebarWidth}
            aria-valuetext={`${sidebarWidth} pixels wide`}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={resizeFromKeyboard}
            onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
            className="absolute top-0 right-0 z-10 hidden h-full w-3 translate-x-1/2 cursor-col-resize md:block focus:outline-none focus-visible:[&_div]:bg-ring focus-visible:[&_div]:w-1"
          >
            <div className="mx-auto h-full w-px bg-border transition-colors hover:bg-foreground/30" />
          </div>
        ) : null}
      </aside>

      {/* Left Sidebar Toggle Button */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-pressed={!collapsed}
        className="absolute top-1/2 z-20 hidden size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-[left] duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:flex"
        style={{ left: collapsed ? 0 : sidebarWidth }}
      >
        <ChevronLeft
          className={cn(
            "sidebar-chevron size-3",
            collapsed && "sidebar-chevron-collapsed",
          )}
        />
      </button>

      {/* Main App Content Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>

      {/* Right AI Assistant Sidebar Toggle Button */}
      {aiSidebar ? (
        <button
          type="button"
          onClick={() => setAiSidebarOpen((v) => !v)}
          aria-label={aiSidebarOpen ? "Collapse AI assistant" : "Expand AI assistant"}
          aria-pressed={aiSidebarOpen}
          className="absolute top-1/2 z-20 hidden size-5 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-[right] duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:flex"
          style={{ right: aiSidebarOpen ? aiSidebarWidth : 0 }}
        >
          <ChevronRight
            className={cn(
              "sidebar-chevron size-3",
              !aiSidebarOpen && "sidebar-chevron-collapsed rotate-180",
            )}
          />
        </button>
      ) : null}

      {/* Right AI Assistant Sidebar */}
      {aiSidebar ? (
        <aside
          id="app-ai-sidebar"
          aria-label="AI Assistant Sidebar"
          aria-hidden={!aiSidebarOpen}
          className={cn(
            "relative hidden shrink-0 border-l bg-background text-foreground transition-[width] duration-200 lg:block",
            !aiSidebarOpen && "w-0 overflow-hidden border-l-0",
          )}
          style={{ width: aiSidebarOpen ? aiSidebarWidth : 0 }}
        >
          {aiSidebarOpen ? (
            <div className="h-full w-full overflow-hidden" style={{ width: aiSidebarWidth }}>
              {aiSidebar}
            </div>
          ) : null}
          {aiSidebarOpen ? (
            <div
              role="separator"
              aria-label="Resize AI assistant sidebar"
              aria-orientation="vertical"
              aria-valuemin={AI_SIDEBAR_MIN_WIDTH}
              aria-valuemax={AI_SIDEBAR_MAX_WIDTH}
              aria-valuenow={aiSidebarWidth}
              aria-valuetext={`${aiSidebarWidth} pixels wide`}
              tabIndex={0}
              onPointerDown={startAiResize}
              onKeyDown={resizeAiFromKeyboard}
              onDoubleClick={() => setAiSidebarWidth(AI_SIDEBAR_DEFAULT_WIDTH)}
              className="absolute top-0 left-0 z-10 hidden h-full w-3 -translate-x-1/2 cursor-col-resize lg:block focus:outline-none focus-visible:[&_div]:bg-ring focus-visible:[&_div]:w-1"
            >
              <div className="mx-auto h-full w-px bg-border transition-colors hover:bg-foreground/30" />
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

