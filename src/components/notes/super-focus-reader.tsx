"use client";

import * as React from "react";
import { MousePointer2, ScanLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownPreview } from "@/components/markdown/markdown-preview";
import { TtsControls } from "@/components/notes/tts-controls";
import { useTextToSpeech } from "@/components/notes/use-text-to-speech";
import { cn } from "@/lib/utils";
import type { WikiLinkTarget } from "@/lib/markdown/wiki";

export type SuperFocusTrackingMode = "pointer" | "auto";

type SuperFocusReaderProps = {
  content: string;
  direction: "ltr" | "rtl" | "auto";
  linkableNotes?: WikiLinkTarget[];
  trackingMode: SuperFocusTrackingMode;
  radius: number; // 0 (tight) .. 2 (wide)
  onTrackingModeChange: (mode: SuperFocusTrackingMode) => void;
  onRadiusChange: (radius: number) => void;
  ttsRate: number;
  ttsVoiceURI: string | undefined;
  onTtsRateChange: (rate: number) => void;
  onTtsVoiceChange: (voiceURI: string | undefined) => void;
  autoPlayTts?: boolean;
  onExit: () => void;
};

const RADIUS_LABELS = ["Tight", "Normal", "Wide"];

export function SuperFocusReader({
  content,
  direction,
  linkableNotes,
  trackingMode,
  radius,
  onTrackingModeChange,
  onRadiusChange,
  ttsRate,
  ttsVoiceURI,
  onTtsRateChange,
  onTtsVoiceChange,
  autoPlayTts = false,
  onExit,
}: SuperFocusReaderProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const proseWrapperRef = React.useRef<HTMLDivElement>(null);
  const activeIndexRef = React.useRef(0);
  const frameRef = React.useRef<number | null>(null);
  const isSpeakingRef = React.useRef(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onExit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  const getBlocks = React.useCallback((): HTMLElement[] => {
    const prose = proseWrapperRef.current?.querySelector(".inkest-prose");
    if (!prose) return [];
    return Array.from(prose.children) as HTMLElement[];
  }, []);

  // Read via a ref (not a closure/dependency) so applyActiveIndex's identity
  // stays stable across radius changes — otherwise every radius tweak would
  // also re-trigger the content-mount effect below and reset the reading
  // position to the anchor line, discarding whatever the user was looking at.
  const radiusRef = React.useRef(radius);
  React.useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  const applyActiveIndex = React.useCallback(
    (index: number) => {
      const blocks = getBlocks();
      if (blocks.length === 0) return;
      activeIndexRef.current = index;
      blocks.forEach((block, i) => {
        const distance = Math.abs(i - index);
        const tier = distance === 0 ? 0 : distance <= radiusRef.current ? 1 : 2;
        block.dataset.tier = String(tier);
      });
    },
    [getBlocks],
  );

  const tts = useTextToSpeech({
    getBlocks,
    rate: ttsRate,
    voiceURI: ttsVoiceURI,
    onActiveBlockChange: React.useCallback(
      (index: number | null) => {
        isSpeakingRef.current = index !== null;
        if (index !== null) applyActiveIndex(index);
      },
      [applyActiveIndex],
    ),
  });

  const autoPlayedRef = React.useRef(false);
  React.useEffect(() => {
    if (!autoPlayTts || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    tts.play();
  }, [autoPlayTts, tts]);

  // Mark up blocks whenever content changes, and pick an initial active block
  // (whichever sits nearest the reading anchor line already).
  React.useEffect(() => {
    const blocks = getBlocks();
    blocks.forEach((block) => {
      block.classList.add("super-focus-block");
    });

    const container = scrollRef.current;
    if (!container || blocks.length === 0) return;

    const anchorY = container.getBoundingClientRect().top + container.clientHeight * 0.42;
    let nearest = 0;
    let nearestDistance = Infinity;
    blocks.forEach((block, i) => {
      const rect = block.getBoundingClientRect();
      const center = (rect.top + rect.bottom) / 2;
      const distance = Math.abs(center - anchorY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });
    applyActiveIndex(nearest);
  }, [content, applyActiveIndex, getBlocks]);

  // Auto-advance: a thin intersection band fixed at ~42% down the scroll
  // container highlights whatever paragraph has scrolled into it.
  React.useEffect(() => {
    if (trackingMode !== "auto") return;
    const container = scrollRef.current;
    const blocks = getBlocks();
    if (!container || blocks.length === 0) return;

    const intersecting = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        if (isSpeakingRef.current) return;
        for (const entry of entries) {
          const index = blocks.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          if (entry.isIntersecting) intersecting.add(index);
          else intersecting.delete(index);
        }
        if (intersecting.size > 0) {
          applyActiveIndex(Math.min(...intersecting));
        }
      },
      { root: container, rootMargin: "-42% 0px -55% 0px", threshold: 0 },
    );

    blocks.forEach((block) => observer.observe(block));
    return () => observer.disconnect();
  }, [trackingMode, content, applyActiveIndex, getBlocks]);

  // Pointer-follow: hit-test which block the cursor is over.
  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (trackingMode !== "pointer" || isSpeakingRef.current) return;
      const clientY = event.clientY;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const blocks = getBlocks();
        if (blocks.length === 0) return;
        let nearest = activeIndexRef.current;
        let nearestDistance = Infinity;
        blocks.forEach((block, i) => {
          const rect = block.getBoundingClientRect();
          if (clientY >= rect.top && clientY <= rect.bottom) {
            nearest = i;
            nearestDistance = 0;
            return;
          }
          const center = (rect.top + rect.bottom) / 2;
          const distance = Math.abs(center - clientY);
          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = i;
          }
        });
        applyActiveIndex(nearest);
      });
    },
    [trackingMode, getBlocks, applyActiveIndex],
  );

  React.useEffect(() => {
    applyActiveIndex(activeIndexRef.current);
  }, [radius, applyActiveIndex]);

  React.useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <div className="dark fixed inset-0 z-50 flex flex-col bg-[oklch(0.03_0_0)]">
      <div
        ref={scrollRef}
        onPointerMove={handlePointerMove}
        aria-label="Focus reader content"
        className="flex-1 overflow-y-auto px-6 py-16 sm:px-10"
      >
        <div ref={proseWrapperRef} className="mx-auto max-w-[70ch]">
          <MarkdownPreview content={content} direction={direction} linkableNotes={linkableNotes} />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4 sm:top-6">
        <div
          role="toolbar"
          aria-label="Focus reader controls"
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-black/60 p-1 shadow-lg backdrop-blur"
        >
          <div className="flex items-center rounded-full bg-white/5 p-0.5">
            <button
              type="button"
              onClick={() => onTrackingModeChange("pointer")}
              aria-pressed={trackingMode === "pointer"}
              aria-label="Follow pointer"
              title="Follow pointer"
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-white/60 transition-colors",
                trackingMode === "pointer" && "bg-white/15 text-white",
              )}
            >
              <MousePointer2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onTrackingModeChange("auto")}
              aria-pressed={trackingMode === "auto"}
              aria-label="Auto-advance while scrolling"
              title="Auto-advance while scrolling"
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-white/60 transition-colors",
                trackingMode === "auto" && "bg-white/15 text-white",
              )}
            >
              <ScanLine className="size-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 px-2">
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={radius}
              onChange={(e) => onRadiusChange(Number(e.target.value))}
              aria-label="Spotlight width"
              className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
            <span className="w-12 text-[11px] text-white/50">
              {RADIUS_LABELS[radius]}
            </span>
          </div>

          <TtsControls
            status={tts.status}
            onToggle={tts.toggle}
            rate={ttsRate}
            onRateChange={onTtsRateChange}
            voices={tts.voices}
            voiceURI={ttsVoiceURI}
            onVoiceChange={onTtsVoiceChange}
            dark
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExit}
            aria-label="Exit focus reader"
            className="gap-1.5 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          >
            <X className="size-3.5" />
            <span>Exit</span>
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
              Esc
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
