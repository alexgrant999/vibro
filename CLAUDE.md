# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibro-Acoustic App is a single-page Next.js 15 sound therapy console built on the Web Audio API. The page at `/` has a static header followed by three sections, top to bottom:

- Session Timeline (desktop only): a 10-minute, 5-row drag-and-drop arrangement of sound categories with six preset arrangements. A requestAnimationFrame clock starts and stops pads and the binaural generator as the playhead enters and leaves blocks.
- Master Control: the binaural beat generator (left and right carriers into a ChannelMerger, with sweeps that bounce carrier and beat between their range min and max), five inline preset mixes that each set and start the generator, start pads, and run a 20-minute progression, and a Shamanic Flourish button.
- Pad grid: 48 AAC sample pads in 9 collapsible categories, list or grid view, a live RMS level meter per category, and a Stop All button.

Audio is served from `public/sounds/` as AAC in `.m4a` (48 files, about 88 MB, tracked in git; the original WAVs are kept outside the repo in `~/development/Archive/vibro-acoustic-wav-originals/`). There is no backend, no database, and no tests. Deployed on Vercel from github.com/alexgrant999/vibro.

## Development Commands

Package manager is `pnpm`.

```bash
pnpm dev          # dev server on localhost:3000 (ready in ~3s)
pnpm build        # production build, also the quickest sanity check
pnpm start        # serve the production build
pnpm lint         # ESLint (flat config)
```

Verification against the real browser surface is documented in `.claude/skills/verify/SKILL.md` (the `verify` skill). Read it before judging audio behaviour in an automated browser: RAF is throttled in background tabs, programmatic clicks are not user gestures on iOS, and state is best checked through the DOM (⏹ glyphs, green oscillator border, slider values).

## Architecture

### Project Structure

```
app/
  layout.js                    # Root layout and metadata
  page.js                      # Home page: orchestrator, preset mixes, Stop All wiring
  globals.css                  # Minimal global styles and the .desktop-only rule
  components/
    audioContext.js            # AudioContext singleton, SSR mock, unlockAudioContext(), getOutputNode() media-element output stage
    sounds.js                  # Sample registry: name, file, category (names include an emoji prefix)
    Pad.js                     # One sample pad: lazy decode, crossfade loop, fades, lowpass, scrub
    padRegistry.js             # Map of mounted pads' play()/stop() handles, keyed by display name
    PadGrid.js                 # Category grouping, list/grid toggle, level meters, playPads/stopPads/stopAll
    OscillatorUnit.js          # Binaural generator with sweeps; setParams/start/stop imperative handle
    SessionTimeline.js         # Timeline editor and RAF playback engine; stop() imperative handle
    timelinePresets.js         # Six preset arrangements for the timeline
  testaudio/page.js            # Unlinked square-wave smoke test page
public/sounds/                 # AAC (.m4a) samples referenced by sounds.js
scripts/encode-sample.py       # afconvert plus exact edit list, for new samples
next.config.mjs                # allowedDevOrigins for LocalTunnel phone testing
```

No TypeScript. Every component except the root layout is a client component (`"use client"`) because everything depends on browser audio APIs; `app/layout.js` stays a server component because it exports `metadata`.

### Control model (important)

State is local to each component and control flows one way through imperative handles:

- `page.js` owns refs only: `padGridRef`, `oscillatorRef`, `timelineRef`, plus `progressionIntervalRef` and `progressionStartRef` for the preset progression timer.
- `OscillatorUnit` exposes `setParams(params, { autoStart })`, `start()`, `stop()`. `setParams` accepts `carrierFreq`, `carrierMax`, `beatFreq`, `beatMax`, `volume`. Carrier and beat values become the sweep range minimums.
- `PadGrid` exposes `playPads(names)`, `stopPads(names)`, `stopAll()`. Each mounted Pad registers idempotent `play()` / `stop()` handles in `padRegistry` (`app/components/padRegistry.js`, a module-level Map keyed by display name) and PadGrid calls those, so two schedulers asking for the same thing in one tick cannot toggle a pad back on. No state above Pad knows which pads are playing; each Pad keeps its own `isPlaying`, mirrored in `isPlayingRef`, and the play button itself is a toggle. Pad buttons still carry `data-pad-name` and `data-stop-button` (and show ⏹ while playing) for browser automation.
- `SessionTimeline` exposes `stop()` (hold the playhead, silence everything it started). It drives sounds through `onPlaySounds` / `onStopSounds` callbacks from `page.js`, using the synthetic name `__binaural__` for the generator.
- Stop All (button in the pad toolbar) calls `onStopAll` from `page.js` (clears the progression interval, stops the timeline and the generator) and then stops every playing pad.

Because pads are matched by exact display name, any name passed to `playPads`, a preset mix, or the Shamanic Flourish must match `sounds.js` exactly, emoji prefix included. Renaming a sound silently breaks presets.

### Audio engine

- One module-level `AudioContext` from `getAudioContext()`. It is created on first render (PadGrid creates analysers), so it starts suspended. `unlockAudioContext()` plays a one-frame silent buffer and calls `resume()` synchronously inside a user gesture; every play path calls it first.
- All sound sources connect to `getOutputNode()` (a shared gain in `audioContext.js`), never to `ctx.destination` directly. The output node feeds a `MediaStreamAudioDestinationNode` playing through a hidden `<audio>` element, because iOS does not route raw Web Audio to the AirPlay device picked in Control Center but does route media-element playback. `unlockAudioContext()` (re)starts that element inside each play gesture — iOS pauses it on route changes — and a rejected `play()` falls the output back to `ctx.destination` permanently.
- Pad signal chain: `BufferSource -> crossfade Gain (loop mode) -> BiquadFilter lowpass -> pad Gain -> output node`, with a tap into the category `AnalyserNode`. No master bus beyond the shared output node.
- Pads fetch and decode their sample on first play (callback-style `decodeAudioData` for iOS) and cache the buffer for the life of the component. Samples are AAC-LC `.m4a` with exact gapless metadata (iTunSMPB tag plus an `elst` edit list), so `buffer.duration` equals the source length in Chrome and Safari; Firefox honours the edit list's head trim but keeps up to about 23 ms of trailing encoder padding, which sits under the loop crossfade.
- Loop mode is a manual chain of overlapping sources with a crossfade of up to 2 s (shorter for short samples), scheduled by `setTimeout`.
- All fades run at `FADE_RATE` 0.1 gain per second. Pad sliders start at 0; once a sample has loaded the gain fades in to the 40% default (or whatever the slider was set to). Fade tracking polls the gain into the volume slider so the slider animates; the volume the user actually asked for lives in a ref (`targetVolumeRef` in Pad, `intendedVolumeRef` in OscillatorUnit) and is what a new play fades up to. Stopping a pad defers the real `stop()` until the fade-out finishes; re-playing during that window cuts the old sources immediately.
- Generator graph is rebuilt on every start: `oscLeft (carrier)` and `oscRight (carrier + beat)` -> unity gains -> `ChannelMerger(2)` -> master Gain -> output node. The sweep is a 100 ms `setInterval` that bounces each value between range min and max, eased at the edges with about 15% step jitter. `setParams({ volume })` while playing glides the gain at the fade rate.

### Session timeline

- Block shape: `{ id, category, time, duration, row }`, 600 s session, 5 rows, no overlap check. Sounds are not stored on the block: when the playhead enters a block the tick picks up to two random sounds from that category (preferring ones not already playing) and records them in `activeSounds`.
- The tick owns the clock (`offsetRef` + `performance.now()` epoch, `t = elapsed % 600`, so it loops). On pause or `stop()` the playhead holds and resumes from the last drawn position (the run effect's cleanup copies `currentTimeRef` into `offsetRef`). Reset stops the timeline's sounds and returns the playhead to 0:00. A sound that leaves one block and enters another on the same tick keeps playing instead of being stopped and restarted. One tick can hand `page.js` a mixed list of pad names and `__binaural__`; the callbacks route per name.
- Hidden at 768px and below via `.desktop-only` because RAF-driven `button.click()` is not a user gesture on iOS. It still mounts and registers listeners.

## Styling

Inline styles throughout. `globals.css` holds a few legacy rules plus `.desktop-only`. Tailwind is installed as a devDependency but is not wired (no root PostCSS config, no `@import "tailwindcss"`); the `app/postcss.config.js` file is unused. Either wire it properly or leave it alone, do not assume utility classes work.

## Configuration Notes

- Next.js 15.5.9, React 19.1.0. `allowedDevOrigins` is a top-level config option in 15.5 and lists hostnames only (`*.loca.lt`, `localhost`).
- ESLint flat config extending `next/core-web-vitals`.
- `certificates/` and `certs/` hold local dev HTTPS certs and are gitignored via `*.pem` and `certificates`.
- `.claude/skills/verify/SKILL.md` is the project-specific verification skill.

## Important Considerations

- Oscillators cannot be restarted once stopped; the generator recreates its graph on every start and stops nodes by value in a deferred timeout so a quick restart is not killed by the previous stop.
- Preset progressions call `setParams` every 30 s for 20 minutes with `autoStart: false`, so a generator the user stopped stays stopped. Applying a preset clears any previous progression.
- Collapsed categories use `display: none` and the list/grid toggle keeps the same keys, so pads stay mounted and keep playing through both.
- Pad re-play resumes from the paused position (`pausedAtRef`, taken modulo the sample length for looped pads), not from the start. A stop during an async load aborts that load (`playTokenRef`).
- Three schedulers can drive the same refs: the progression `setInterval`, the timeline RAF loop, and manual clicks. Stop All is the only thing that clears all three.

## Common Development Tasks

Adding a sound pad:
1. Encode it with `python3 scripts/encode-sample.py in.wav public/sounds/name.m4a` (macOS: afconvert at 256 kbps constrained VBR, then an exact `elst` edit list written into the file; it refuses to ship a file whose valid frame count differs from the source). 256 kbps because 192 cut the wind chimes above 16 kHz. Do not substitute ffmpeg: its `aac_at` wrapper gets the valid frame count wrong by hundreds of samples per file and its `-c copy` remux drops the iTunSMPB tag. Pads fetch the whole file and hand it to `decodeAudioData`, so any format the browser decodes would work, but keep the library uniform.
2. Add `{ name, file, category }` to `soundFiles` in `app/components/sounds.js`. Keep the emoji prefix convention.
3. If it is a new category, add its icon to `CATEGORY_ICONS` in `PadGrid.js` and its colour and icon to `CAT_COLORS` / `CAT_ICONS` in `SessionTimeline.js`.

Adding a timeline preset: append to `app/components/timelinePresets.js` (items are `{ category, time, duration, row }`, optional `oscillator` primes the generator without starting it; a Binaural Beats block starts it).

Adding a preset mix: add `{ name, config: { carrierFreq, beatFreq, volume, pads, progression? } }` to the inline array in `app/page.js`. `progression(elapsedMin, oscRef, padGridRef)` runs every 30 s for 20 minutes and should pass `{ autoStart: false }` to `setParams` so a generator the user stopped stays stopped.
