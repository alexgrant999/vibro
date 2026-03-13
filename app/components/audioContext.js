let audioCtx = null;
let _unlocked = false;

const SSR_MOCK = {
  resume: () => Promise.resolve(),
  currentTime: 0,
  state: "suspended",
  createGain: () => ({ connect: () => {}, gain: { value: 1, setValueAtTime: () => {}, cancelScheduledValues: () => {}, linearRampToValueAtTime: () => {} } }),
  createOscillator: () => ({ type: "sine", frequency: { value: 440, setValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }),
  createBiquadFilter: () => ({ type: "lowpass", frequency: { value: 22050 }, connect: () => {} }),
  createBuffer: () => null,
  createBufferSource: () => ({ buffer: null, connect: () => {}, start: () => {}, stop: () => {}, onended: null }),
  createAnalyser: () => ({ connect: () => {}, frequencyBinCount: 0, getByteTimeDomainData: () => {} }),
  decodeAudioData: () => Promise.resolve(null),
};

export function getAudioContext() {
  if (typeof window === "undefined") return SSR_MOCK;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  return audioCtx;
}

/**
 * Must be called inside a user-gesture handler (click/touchend).
 * Resumes the context AND plays a silent buffer to unlock iOS Safari audio.
 */
export async function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx === SSR_MOCK) return ctx;

  if (ctx.state === "suspended") {
    await ctx.resume();
  }

  if (!_unlocked) {
    // iOS requires at least one buffer to be played inside a gesture to unlock audio
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    _unlocked = true;
  }

  return ctx;
}
