"use client";

import * as React from "react";
import { useTheme } from "next-themes";

export type AppearanceTheme = "system" | "light" | "dark";
export type AppearancePalette = "paper" | "forest" | "violet";
export type AppearanceFont = "sans" | "serif" | "persian";

export function applyAppearance({ palette, font }: { palette: AppearancePalette; font: AppearanceFont }) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.dataset.font = font;
  localStorage.setItem("inkest-palette", palette);
  localStorage.setItem("inkest-font", font);
}

export function AppearanceSync({ preference, palette, font }: { preference: AppearanceTheme; palette: AppearancePalette; font: AppearanceFont }) {
  const { setTheme } = useTheme();
  React.useEffect(() => {
    setTheme(preference);
    applyAppearance({ palette, font });
  }, [font, palette, preference, setTheme]);
  return null;
}
