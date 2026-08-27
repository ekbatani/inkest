"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Check, Laptop, Moon, Palette, SlidersHorizontal, Sun } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  applyPalette,
  type AppearancePalette,
  type AppearanceTheme,
  PALETTES,
} from "@/components/users/appearance-sync";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [currentPalette, setCurrentPalette] = React.useState<AppearancePalette>("paper");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const initial =
      (document.documentElement.dataset.palette as AppearancePalette) ||
      (localStorage.getItem("inkest-palette") as AppearancePalette) ||
      "paper";
    setCurrentPalette(initial);

    const onPaletteChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ palette: AppearancePalette }>;
      if (customEvent.detail?.palette) {
        setCurrentPalette(customEvent.detail.palette);
      } else {
        const p = (document.documentElement.dataset.palette as AppearancePalette) || "paper";
        setCurrentPalette(p);
      }
    };
    window.addEventListener("inkest:palette-change", onPaletteChange);
    return () => window.removeEventListener("inkest:palette-change", onPaletteChange);
  }, []);

  const changeTheme = (preference: AppearanceTheme) => {
    setTheme(preference);
    void import("@/server/users/settings-actions").then((actions) =>
      actions.updateUserSettingsAction({ theme: { preference } })
    );
  };

  const changePalette = (palette: AppearancePalette) => {
    setCurrentPalette(palette);
    applyPalette(palette);
    void import("@/server/users/settings-actions").then((actions) =>
      actions.updateUserSettingsAction({ theme: { palette } })
    );
  };

  const modes: { id: AppearanceTheme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Laptop },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Theme & appearance"
            title="Theme & appearance"
            className="rounded-xl text-muted-foreground hover:text-foreground relative"
          />
        }
      >
        <Palette className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 p-3 rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-xl"
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
            <Palette className="size-3.5 text-primary" />
            <span>Theme & Appearance</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium capitalize">
            {mounted ? (theme ?? "system") : "..."}
          </span>
        </div>

        {/* Mode selector */}
        <div className="mb-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Mode</p>
          <div className="grid grid-cols-3 gap-1 bg-muted/50 p-1 rounded-xl border border-border/50">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const active = mounted && (theme === mode.id || (!theme && mode.id === "system"));
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => changeTheme(mode.id)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all",
                    active
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50",
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Palette selector */}
        <div className="mb-2">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Color Palette</p>
          <div className="grid grid-cols-2 gap-1.5">
            {PALETTES.map((p) => {
              const active = mounted && currentPalette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => changePalette(p.id)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs text-start transition-all",
                    active
                      ? "border-primary bg-primary/10 text-foreground font-semibold shadow-2xs"
                      : "border-border/60 bg-card/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full shrink-0 ring-1 ring-black/10 dark:ring-white/20", p.colorDot)} />
                  <span className="truncate text-xs">{p.name}</span>
                  {active && <Check className="size-3 text-primary ms-auto shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer Link */}
        <div className="pt-2 mt-2 border-t border-border/60">
          <Link
            href="/settings?tab=appearance"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between w-full px-2 py-1 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <span>All appearance settings</span>
            <SlidersHorizontal className="size-3" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
