import { useCallback, useRef, useState } from "react";

const MUTE_KEY = "nap_sounds_muted";

function getCtx(ref) {
  if (!ref.current) {
    ref.current = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ref.current.state === "suspended") {
    ref.current.resume();
  }
  return ref.current;
}

// Schedule a single oscillator tone.
// freq: Hz, dur: seconds, type: OscillatorType, vol: 0–1, offset: seconds from now
function tone(ctx, freq, dur, type = "sine", vol = 0.3, offset = 0) {
  const t0 = ctx.currentTime + offset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function useSounds() {
  const ctxRef = useRef(null);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");
  // Ref so sound functions never need to be recreated when muted changes.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // Wrapper: guards against mute, missing AudioContext support, and any runtime error.
  const run = useCallback((fn) => {
    if (mutedRef.current) return;
    try { fn(getCtx(ctxRef)); } catch (_) {}
  }, []);

  // 3-2-1 tick during the pre-round countdown overlay
  const playCountdownTick = useCallback(() => run((ctx) => {
    tone(ctx, 523, 0.09, "sine", 0.28);
  }), [run]);

  // "GO!" fanfare — quick ascending C-E-G arpeggio
  const playCountdownGo = useCallback(() => run((ctx) => {
    tone(ctx, 523, 0.13, "sine", 0.38, 0.00);
    tone(ctx, 659, 0.13, "sine", 0.38, 0.10);
    tone(ctx, 784, 0.38, "sine", 0.48, 0.20);
  }), [run]);

  // Urgent tick for the last 5 seconds of the round timer
  const playTimerWarn = useCallback(() => run((ctx) => {
    tone(ctx, 880, 0.07, "square", 0.13);
  }), [run]);

  // Descending buzz when STOP is pressed
  const playStop = useCallback(() => run((ctx) => {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(380, t0);
    osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.35);
    g.gain.setValueAtTime(0.28, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    osc.start(t0); osc.stop(t0 + 0.37);
  }), [run]);

  // Three-note ascending chime when the round ends
  const playRoundEnd = useCallback(() => run((ctx) => {
    tone(ctx, 392, 0.14, "sine", 0.30, 0.00);
    tone(ctx, 523, 0.14, "sine", 0.30, 0.14);
    tone(ctx, 659, 0.30, "sine", 0.40, 0.28);
  }), [run]);

  // Two-tone rising ping when voting starts
  const playVoteStart = useCallback(() => run((ctx) => {
    tone(ctx, 440, 0.10, "sine", 0.22, 0.00);
    tone(ctx, 554, 0.18, "sine", 0.28, 0.10);
  }), [run]);

  // Rising frequency sweep for the round-transition overlay
  const playNextRound = useCallback(() => run((ctx) => {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, t0);
    osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.30);
    g.gain.setValueAtTime(0.28, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    osc.start(t0); osc.stop(t0 + 0.37);
  }), [run]);

  // Victory arpeggio for game finish
  const playGameFinish = useCallback(() => run((ctx) => {
    [261, 329, 392, 523, 659, 784].forEach((f, i) => {
      tone(ctx, f, i === 5 ? 0.80 : 0.18, "sine", 0.38, i * 0.13);
    });
  }), [run]);

  // Soft two-tone pop when the round letter is revealed
  const playLetterReveal = useCallback(() => run((ctx) => {
    tone(ctx, 659, 0.10, "sine", 0.28, 0.00);
    tone(ctx, 880, 0.18, "sine", 0.20, 0.08);
  }), [run]);

  return {
    muted,
    toggleMute,
    playCountdownTick,
    playCountdownGo,
    playTimerWarn,
    playStop,
    playRoundEnd,
    playVoteStart,
    playNextRound,
    playGameFinish,
    playLetterReveal,
  };
}
