// Imperative handles for the mounted pads, keyed by display name. PadGrid, presets and
// the timeline call play() / stop() here with explicit intent; both are idempotent, so
// two schedulers asking for the same thing in one tick cannot toggle a pad back on.
export const padRegistry = new Map();
