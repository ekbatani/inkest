"use client";

import * as React from "react";
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
  const [sidebarWidth, setSidebarWidth] = React.useState(SIDEBAR_DEFAULT_WIDTH);
  const dragStateRef = React.useRef<{
    cleanup: () => void;
  } | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedWidth = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (!savedWidth) {
      return;
    }

    const parsedWidth = Number.parseInt(savedWidth, 10);
    if (Number.isNaN(parsedWidth)) {
      return;
    }

    setSidebarWidth(
      Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsedWidth)),
    );
  }, []);

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

  return (
    <div className="flex h-dvh w-full overflow-hidden">
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
            onPointerDown={startResize}
            onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT_WIDTH)}
            className="absolute top-0 right-0 z-10 hidden h-full w-3 translate-x-1/2 cursor-col-resize md:block"
          >
            <div className="mx-auto h-full w-px bg-border transition-colors hover:bg-foreground/30" />
          </div>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
