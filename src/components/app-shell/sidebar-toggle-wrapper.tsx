"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function SidebarToggleWrapper({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    const handler = () => setCollapsed((v) => !v);
    document.addEventListener("inknest:toggle-sidebar", handler);
    return () => document.removeEventListener("inknest:toggle-sidebar", handler);
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:block",
          collapsed ? "w-0 overflow-hidden border-r-0" : "w-60",
        )}
      >
        {!collapsed && sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
