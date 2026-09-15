"use client";

import * as React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Timer,
  Coffee,
  Brain,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  playPomodoroFinishSound,
  playBreakFinishSound,
} from "@/lib/audio/timer-sounds";
import { TimerParticles } from "@/components/notes/timer-particles";

type Mode = "pomodoro" | "shortBreak" | "longBreak" | "custom";

const PRESETS: Record<Mode, number> = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
  custom: 45 * 60,
};

const SOUND_STORAGE_KEY = "inkest:focus-timer:soundEnabled";

export function FocusTimer() {
  const [mode, setMode] = React.useState<Mode>("pomodoro");
  const [timeLeft, setTimeLeft] = React.useState(PRESETS.pomodoro);
  const [isRunning, setIsRunning] = React.useState(false);
  const [celebrating, setCelebrating] = React.useState<"pomodoro" | "break" | null>(null);
  const [showParticles, setShowParticles] = React.useState(false);
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem(SOUND_STORAGE_KEY);
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  const targetEndTimeRef = React.useRef<number | null>(null);
  const celebrationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  };

  const switchModeAndStart = React.useCallback((newMode: Mode) => {
    setMode(newMode);
    const duration = PRESETS[newMode];
    setTimeLeft(duration);
    targetEndTimeRef.current = Date.now() + duration * 1000;
    setIsRunning(true);
    setCelebrating(null);
  }, []);

  const triggerCompletion = React.useCallback(
    (finishedMode: Mode) => {
      setIsRunning(false);
      setTimeLeft(0);
      targetEndTimeRef.current = null;
      setShowParticles(true);

      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }

      if (finishedMode === "pomodoro") {
        setCelebrating("pomodoro");
        if (soundEnabled) {
          playPomodoroFinishSound();
        }

        toast.success("Pomodoro session completed! 🎉", {
          description: "Outstanding focus! Time to recharge with a 5-minute break.",
          duration: 8000,
          action: {
            label: "Start 5m Break",
            onClick: () => {
              switchModeAndStart("shortBreak");
            },
          },
        });
      } else {
        setCelebrating("break");
        if (soundEnabled) {
          playBreakFinishSound();
        }

        toast("5-minute rest completed! ☕", {
          description: "Feeling refreshed? Ready for your next focus session.",
          icon: <Sparkles className="size-4 text-amber-500" />,
          duration: 8000,
          action: {
            label: "Start Focus (25m)",
            onClick: () => {
              switchModeAndStart("pomodoro");
            },
          },
        });
      }

      celebrationTimeoutRef.current = setTimeout(() => {
        setCelebrating(null);
      }, 8000);
    },
    [soundEnabled, switchModeAndStart]
  );

  React.useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!isRunning) {
      targetEndTimeRef.current = null;
      return;
    }

    const interval = setInterval(() => {
      if (!targetEndTimeRef.current) return;
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        triggerCompletion(mode);
      }
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [isRunning, mode, triggerCompletion]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setTimeLeft(PRESETS[newMode]);
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setCelebrating(null);
  };

  const toggleRun = () => {
    if (isRunning) {
      setIsRunning(false);
      targetEndTimeRef.current = null;
    } else {
      const duration = timeLeft > 0 ? timeLeft : PRESETS[mode];
      setTimeLeft(duration);
      targetEndTimeRef.current = Date.now() + duration * 1000;
      setIsRunning(true);
      setCelebrating(null);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    targetEndTimeRef.current = null;
    setTimeLeft(PRESETS[mode]);
    setCelebrating(null);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className={`relative flex items-center gap-2.5 rounded-xl border bg-background/90 px-3 py-1.5 shadow-sm text-xs transition-all duration-300 ${
        celebrating === "pomodoro"
          ? "border-emerald-500/50 ring-2 ring-emerald-500/20"
          : celebrating === "break"
          ? "border-amber-500/50 ring-2 ring-amber-500/20"
          : "border-border"
      }`}
    >
      {showParticles && <TimerParticles onComplete={() => setShowParticles(false)} />}

      {celebrating ? (
        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          {celebrating === "pomodoro" ? (
            <>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[11px]">
                <PartyPopper className="size-3" /> Focus Done!
              </span>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => switchModeAndStart("shortBreak")}
                className="h-6 text-[11px] px-2 font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
              >
                Start 5m Break
              </Button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                <Coffee className="size-3" /> Break Over!
              </span>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => switchModeAndStart("pomodoro")}
                className="h-6 text-[11px] px-2 font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              >
                Start Focus
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-xs" onClick={resetTimer} title="Reset">
            <RotateCcw className="size-3 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 font-mono font-bold text-violet-500 text-sm">
            <Timer className="size-4" />
            <span>{formattedTime}</span>
          </div>

          <div className="flex gap-1">
            <Button
              variant={mode === "pomodoro" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => switchMode("pomodoro")}
              title="25 min Focus"
              aria-label="25 min Focus"
            >
              <Brain
                className={`size-3 ${
                  mode === "pomodoro" ? "text-violet-500" : "text-muted-foreground"
                }`}
              />
            </Button>
            <Button
              variant={mode === "shortBreak" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => switchMode("shortBreak")}
              title="5 min Break"
              aria-label="5 min Break"
            >
              <Coffee
                className={`size-3 ${
                  mode === "shortBreak" ? "text-amber-500" : "text-muted-foreground"
                }`}
              />
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-xs" onClick={toggleRun}>
              {isRunning ? (
                <Pause className="size-3 text-amber-500" />
              ) : (
                <Play className="size-3 text-emerald-500" />
              )}
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={resetTimer} title="Reset timer">
              <RotateCcw className="size-3" />
            </Button>
          </div>
        </>
      )}

      {/* Sound toggle button */}
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={toggleSound}
        title={soundEnabled ? "Mute completion chime" : "Enable completion chime"}
        aria-label={soundEnabled ? "Mute completion chime" : "Enable completion chime"}
        className="text-muted-foreground hover:text-foreground"
      >
        {soundEnabled ? (
          <Bell className="size-3 text-violet-500" />
        ) : (
          <BellOff className="size-3 text-muted-foreground/60" />
        )}
      </Button>
    </div>
  );
}
