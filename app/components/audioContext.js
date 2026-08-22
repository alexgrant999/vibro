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
 *
 * Calls ctx.resume() synchronously (no await) so the gesture context is not
 * lost, then immediately plays a 1-sample silent buffer, the minimum required
 * to unlock iOS audio. Returns a Promise that resolves once the context is running.
 */
export function unlockAudioContext() {
  const ctx = getAudioContext();
  if (ctx === SSR_MOCK) return Promise.resolve(ctx);

  // Play silent buffer synchronously within the gesture; this is what iOS needs
  if (!_unlocked) {
    const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
    _unlocked = true;
  }

  // resume() is called after the silent buffer (still within the gesture stack)
  // and returns a Promise we can await in the caller
  if (ctx.state === "suspended") {
    return ctx.resume().then(() => ctx);
  }

  return Promise.resolve(ctx);
}
