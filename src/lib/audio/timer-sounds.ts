/**
 * Synthesized Web Audio chimes for timer completion events.
 * Uses the standard Web Audio API without external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtxClass) return null;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioCtxClass();
    }

    if (audioCtx.state === "suspended") {
      void audioCtx.resume().catch(() => {});
    }

    return audioCtx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  startTime: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
  overtoneRatio?: number;
}

function playChimeTone(ctx: AudioContext, options: ToneOptions) {
  const {
    freq,
    startTime,
    duration,
    volume = 0.15,
    type = "sine",
    overtoneRatio = 2.76,
  } = options;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Smooth attack to avoid audio click
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    // Natural exponential decay
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    // Subtle harmonic overtone for crystalline chime resonance
    if (overtoneRatio > 0) {
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      overtone.type = "sine";
      overtone.frequency.setValueAtTime(freq * overtoneRatio, startTime);

      overtoneGain.gain.setValueAtTime(0.0001, startTime);
      overtoneGain.gain.linearRampToValueAtTime(volume * 0.2, startTime + 0.01);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

      overtone.connect(overtoneGain);
      overtoneGain.connect(ctx.destination);

      overtone.start(startTime);
      overtone.stop(startTime + duration * 0.6);
    }
  } catch {
    // Audio node playback can safely fail if unpermitted by browser
  }
}

/**
 * Happy, celebratory ascending chime arpeggio (C5 -> E5 -> G5 -> C6 -> G6)
 * Played when a 25-minute Pomodoro focus session finishes.
 */
export function playPomodoroFinishSound(masterVolume = 0.18): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const now = ctx.currentTime + 0.02;

    // Ascending celebratory major chord arpeggio
    const notes = [
      { freq: 523.25, time: now + 0.0, duration: 0.7, vol: masterVolume }, // C5
      { freq: 659.25, time: now + 0.12, duration: 0.7, vol: masterVolume }, // E5
      { freq: 783.99, time: now + 0.24, duration: 0.8, vol: masterVolume }, // G5
      { freq: 1046.5, time: now + 0.36, duration: 1.2, vol: masterVolume * 1.1 }, // C6
      { freq: 1567.98, time: now + 0.5, duration: 0.9, vol: masterVolume * 0.4 }, // G6 sparkle
    ];

    for (const note of notes) {
      playChimeTone(ctx, {
        freq: note.freq,
        startTime: note.time,
        duration: note.duration,
        volume: note.vol,
      });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Refreshing, bright rising bell sequence (E5 -> A5 -> C#6)
 * Played when the 5-minute rest/break timer finishes.
 */
export function playBreakFinishSound(masterVolume = 0.18): boolean {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    const now = ctx.currentTime + 0.02;

    const notes = [
      { freq: 659.25, time: now + 0.0, duration: 0.7, vol: masterVolume }, // E5
      { freq: 880.0, time: now + 0.16, duration: 0.8, vol: masterVolume }, // A5
      { freq: 1108.73, time: now + 0.32, duration: 1.1, vol: masterVolume * 1.1 }, // C#6
    ];

    for (const note of notes) {
      playChimeTone(ctx, {
        freq: note.freq,
        startTime: note.time,
        duration: note.duration,
        volume: note.vol,
      });
    }

    return true;
  } catch {
    return false;
  }
}
