import { describe, it, expect, afterEach } from "bun:test";
import { playPomodoroFinishSound, playBreakFinishSound } from "../timer-sounds";

describe("Timer Sounds Synthesizer", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow !== undefined) {
      globalThis.window = originalWindow;
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it("handles SSR / non-browser environments gracefully without throwing", () => {
    delete (globalThis as { window?: unknown }).window;

    expect(playPomodoroFinishSound()).toBe(false);
    expect(playBreakFinishSound()).toBe(false);
  });

  it("synthesizes celebratory chords when Web Audio API is available", () => {
    const scheduledFrequencies: number[] = [];
    let resumed = false;

    class MockGainNode {
      gain = {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      };
      connect() {}
    }

    class MockOscillatorNode {
      type = "sine";
      frequency = {
        setValueAtTime: (freq: number) => {
          scheduledFrequencies.push(freq);
        },
      };
      connect() {}
      start() {}
      stop() {}
    }

    class MockAudioContext {
      currentTime = 0;
      state = "suspended";
      destination = {};

      resume() {
        resumed = true;
        this.state = "running";
        return Promise.resolve();
      }

      createGain() {
        return new MockGainNode();
      }

      createOscillator() {
        return new MockOscillatorNode();
      }
    }

    globalThis.window = {
      AudioContext: MockAudioContext as unknown as typeof AudioContext,
    } as unknown as Window & typeof globalThis;

    // Test Pomodoro sound
    const pomoResult = playPomodoroFinishSound();
    expect(pomoResult).toBe(true);
    expect(resumed).toBe(true);
    // Should include C5, E5, G5, C6 fundamental frequencies
    expect(scheduledFrequencies.includes(523.25)).toBe(true);
    expect(scheduledFrequencies.includes(659.25)).toBe(true);
    expect(scheduledFrequencies.includes(783.99)).toBe(true);
    expect(scheduledFrequencies.includes(1046.5)).toBe(true);

    // Test Break sound
    scheduledFrequencies.length = 0;
    const breakResult = playBreakFinishSound();
    expect(breakResult).toBe(true);
    // Should include E5, A5, C#6 fundamental frequencies
    expect(scheduledFrequencies.includes(659.25)).toBe(true);
    expect(scheduledFrequencies.includes(880.0)).toBe(true);
    expect(scheduledFrequencies.includes(1108.73)).toBe(true);
  });
});
