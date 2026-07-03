"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SpotlightHeroProps = {
  children: React.ReactNode;
  className?: string;
};

export function SpotlightHero({ children, className }: SpotlightHeroProps) {
  const glowRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<number | null>(null);
  const [autoPan, setAutoPan] = React.useState(false);

  React.useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setAutoPan(!fine.matches);
    update();
    fine.addEventListener("change", update);
    return () => fine.removeEventListener("change", update);
  }, []);

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (autoPan) return;
      const target = event.currentTarget;
      const x = event.clientX;
      const y = event.clientY;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const px = ((x - rect.left) / rect.width) * 100;
        const py = ((y - rect.top) / rect.height) * 100;
        glowRef.current?.style.setProperty("--spot-x", `${px}%`);
        glowRef.current?.style.setProperty("--spot-y", `${py}%`);
      });
    },
    [autoPan],
  );

  React.useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div
      className={cn("spotlight-hero", autoPan && "spotlight-hero--auto", className)}
      onPointerMove={handlePointerMove}
    >
      <div ref={glowRef} className="spotlight-hero__glow" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
