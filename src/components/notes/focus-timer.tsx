"use client";

import * as React from "react";
import { Play, Pause, RotateCcw, BellOff, Timer, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "pomodoro" | "shortBreak" | "longBreak" | "custom";

const PRESETS: Record<Mode, number> = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  custom: 45 * 60,
};

export function FocusTimer() {
  const [mode, setMode] = React.useState<Mode>("pomodoro");
  const [timeLeft, setTimeLeft] = React.useState(PRESETS.pomodoro);
  const [isRunning, setIsRunning] = React.useState(false);

  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(PRESETS[newMode]);
    setIsRunning(false);
  };

  const toggleRun = () => {
    setIsRunning((prev) => !prev);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(PRESETS[mode]);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-background/90 px-3 py-1.5 shadow-sm text-xs">
      <div className="flex items-center gap-1 font-mono font-bold text-violet-500 text-sm">
        <Timer className="size-4" />
        <span>{formattedTime}</span>
      </div>

      <div className="flex gap-1">
        <Button
          variant={mode === "pomodoro" ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() => switchMode("pomodoro")}
          title="25 min Work"
        >
          25m
        </Button>
        <Button
          variant={mode === "shortBreak" ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() => switchMode("shortBreak")}
          title="5 min Break"
        >
          <Coffee className="size-3" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-xs" onClick={toggleRun}>
          {isRunning ? <Pause className="size-3 text-amber-500" /> : <Play className="size-3 text-emerald-500" />}
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={resetTimer}>
          <RotateCcw className="size-3" />
        </Button>
      </div>

      {isRunning && (
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-violet-500/10 px-1.5 py-0.5 rounded text-violet-600 dark:text-violet-300">
          <BellOff className="size-2.5" /> Muted
        </span>
      )}
    </div>
  );
}
