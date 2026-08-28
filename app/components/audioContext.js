let audioCtx = null;
let _unlocked = false;

// Media-element output stage. iOS does not route raw Web Audio (connections
// straight to ctx.destination) to the AirPlay device picked in Control Center;
// audio played through an <audio> element does follow it. So every sound
// source connects to outputNode, which feeds a MediaStreamDestination whose
// stream plays through a hidden <audio> element.
let outputNode = null;   // GainNode all sources connect to instead of ctx.destination
let outputEl = null;     // hidden <audio> element carrying the stream
let outputMode = null;   // "element" | "direct" (fallback)

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

function fallBackToDirect() {
  if (outputMode === "direct") return;
  outputMode = "direct";
  try { outputNode.disconnect(); } catch {}
  outputNode.connect(getAudioContext().destination);
  if (outputEl) {
    try { outputEl.srcObject = null; outputEl.remove(); } catch {}
    outputEl = null;
  }
}

function ensureOutput(ctx) {
  if (outputNode) return outputNode;

  outputNode = ctx.createGain();
  outputNode.gain.value = 1;

  if (typeof ctx.createMediaStreamDestination === "function" && typeof document !== "undefined") {
    const streamDest = ctx.createMediaStreamDestination();
    outputNode.connect(streamDest);

    const el = document.createElement("audio");
    el.srcObject = streamDest.stream;
    el.setAttribute("playsinline", "");
    el.style.display = "none";
    // Keep the element in the DOM so it is not garbage-collected mid-playback
    document.body.appendChild(el);
    outputEl = el;
    outputMode = "element";

    // With a media element in the chain iOS shows a Now Playing card; give it a name
    try {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: "Vibro-Acoustic Session" });
      }
    } catch {}
  } else {
    outputNode.connect(ctx.destination);
    outputMode = "direct";
  }

  return outputNode;
}

/**
 * The node every sound source must connect to instead of ctx.destination.
 */
export function getOutputNode() {
  const ctx = getAudioContext();
  if (ctx === SSR_MOCK) return ctx.createGain();
  return ensureOutput(ctx);
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

  // The output <audio> element also needs play() inside a gesture, and iOS
  // pauses it on audio-route changes (e.g. picking an AirPlay speaker), so
  // restart it on every unlock. A rejected play() means the element path is
  // unusable; fall back to direct output so sound still works locally.
  ensureOutput(ctx);
  if (outputMode === "element" && outputEl && outputEl.paused) {
    const p = outputEl.play();
    if (p && p.catch) p.catch(() => fallBackToDirect());
  }

  // resume() is called after the silent buffer (still within the gesture stack)
  // and returns a Promise we can await in the caller
  if (ctx.state === "suspended") {
    return ctx.resume().then(() => ctx);
  }

  return Promise.resolve(ctx);
}
