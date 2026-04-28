let audioContext = null;
let unlockListenersAttached = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  return audioContext;
}

function resumeAudioContext() {
  const context = getAudioContext();
  if (!context) return null;
  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }
  return context;
}

export function initSoundEffects() {
  if (typeof window === "undefined" || unlockListenersAttached) return;
  unlockListenersAttached = true;

  const unlock = () => {
    const context = resumeAudioContext();
    if (context?.state === "running") {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    }
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
}

function playTone({
  frequency = 440,
  duration = 0.12,
  type = "sine",
  volume = 0.035,
  offset = 0,
}) {
  const context = resumeAudioContext();
  if (!context || context.state !== "running") return;

  const startAt = context.currentTime + offset;
  const endAt = startAt + duration;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.linearRampToValueAtTime(volume, startAt + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(endAt + 0.02);
}

function playSequence(notes = []) {
  let offset = 0;
  notes.forEach((note) => {
    playTone({ ...note, offset });
    offset += note.gap ?? note.duration ?? 0.1;
  });
}

export function playCountdownTick(step = 3) {
  const frequency = step <= 1 ? 760 : 640;
  playTone({ frequency, duration: 0.08, type: "square", volume: 0.03 });
}

export function playCountdownGo() {
  playSequence([
    { frequency: 880, duration: 0.12, type: "triangle", volume: 0.04, gap: 0.1 },
    { frequency: 1175, duration: 0.2, type: "triangle", volume: 0.05 },
  ]);
}

export function playRoundTransition() {
  playSequence([
    { frequency: 520, duration: 0.09, type: "sine", volume: 0.03, gap: 0.08 },
    { frequency: 660, duration: 0.1, type: "sine", volume: 0.03, gap: 0.08 },
    { frequency: 820, duration: 0.12, type: "sine", volume: 0.035 },
  ]);
}

export function playStopPressed() {
  playSequence([
    { frequency: 520, duration: 0.08, type: "square", volume: 0.035, gap: 0.06 },
    { frequency: 390, duration: 0.18, type: "square", volume: 0.04 },
  ]);
}

export function playVotingStart() {
  playSequence([
    { frequency: 700, duration: 0.1, type: "triangle", volume: 0.03, gap: 0.08 },
    { frequency: 940, duration: 0.14, type: "triangle", volume: 0.04 },
  ]);
}

export function playGameFinished() {
  playSequence([
    { frequency: 660, duration: 0.12, type: "sine", volume: 0.035, gap: 0.1 },
    { frequency: 880, duration: 0.12, type: "sine", volume: 0.035, gap: 0.1 },
    { frequency: 1175, duration: 0.22, type: "sine", volume: 0.045 },
  ]);
}
