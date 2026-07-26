"use client";

import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_DEFAULT_WIDTH = 240;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_STORAGE_KEY = "inkest:sidebar-width";

export function SidebarToggleWrapper({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [sidebarWidth, setSidebarWidth] = React.useState(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    const savedWidth = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!savedWidth) return SIDEBAR_DEFAULT_WIDTH;
    const parsedWidth = Number.parseInt(savedWidth, 10);
    if (Number.isNaN(parsedWidth)) return SIDEBAR_DEFAULT_WIDTH;
    return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsedWidth));
  });
  const dragStateRef = React.useRef<{
    cleanup: () => void;
  } | null>(null);

  React.useEffect(() => {
    const handler = () => setCollapsed((v) => !v);
    document.addEventListener("inkest:toggle-sidebar", handler);
    return () => document.removeEventListener("inkest:toggle-sidebar", handler);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  React.useEffect(() => {
    return () => {
      dragStateRef.current?.cleanup();
      dragStateRef.current = null;
    };
  }, []);

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

  return (
    <div className="relative flex h-dvh w-full overflow-hidden">
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
