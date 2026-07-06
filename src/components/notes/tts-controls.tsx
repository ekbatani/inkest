"use client";

import * as React from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TtsStatus } from "@/components/notes/use-text-to-speech";

const RATES = [0.75, 1, 1.25, 1.5, 2];

export function TtsControls({
  status,
  onToggle,
  rate,
  onRateChange,
  voices,
  voiceURI,
  onVoiceChange,
  dark = false,
}: {
  status: TtsStatus;
  onToggle: () => void;
  rate: number;
  onRateChange: (rate: number) => void;
  voices: SpeechSynthesisVoice[];
  voiceURI: string | undefined;
  onVoiceChange: (voiceURI: string | undefined) => void;
  dark?: boolean;
}) {
  const isPlaying = status === "playing";

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggle}
        title={isPlaying ? "Pause reading" : "Listen"}
        className={cn("gap-1.5", dark && "text-white/70 hover:bg-white/10 hover:text-white")}
      >
        {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        <span className={dark ? undefined : "hidden sm:inline"}>
          {isPlaying ? "Pause" : "Listen"}
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              title="Voice & speed"
              className={cn(dark && "text-white/70 hover:bg-white/10 hover:text-white")}
            />
          }
        >
          <Volume2 className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-3">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                Speed — {rate.toFixed(2)}×
              </div>
              <div className="flex gap-1">
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRateChange(r)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1 text-xs transition",
                      rate === r
                        ? "border-foreground/20 bg-foreground/[0.06] font-medium"
                        : "border-border/70 hover:bg-muted/40",
                    )}
                  >
                    {r}×
                  </button>
                ))}
              </div>
            </div>

            {voices.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">Voice</div>
                <select
                  value={voiceURI ?? ""}
                  onChange={(e) => onVoiceChange(e.target.value || undefined)}
                  className="h-8 w-full rounded-md border border-border/70 bg-background px-2 text-xs"
                >
                  <option value="">System default</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
