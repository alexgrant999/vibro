let audioCtx = null;

export function getAudioContext() {
  // Guard: only run in the browser
  if (typeof window === "undefined") {
    // Return a harmless placeholder during SSR so Next.js won't crash
    return {
      resume: () => {},
      currentTime: 0,
      state: "suspended",
      createGain: () => ({
        connect: () => {},
        gain: { setValueAtTime: () => {} },
      }),
      createOscillator: () => ({
        type: "sine",
        frequency: { setValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {},
      }),
    };
  }

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioCtx;
}
