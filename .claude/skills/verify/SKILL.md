---
name: verify
description: How to build, run, and verify changes in the vibro-acoustic-app at its real surface (the browser at localhost:3000).
---

Build and launch

- `pnpm dev` (ready in ~3s, serves localhost:3000). `pnpm build` for a production sanity check.
- No tests in this repo. The surface is the single page at `/` plus the unlinked `/testaudio` smoke page.

Driving the app

- The Session Timeline is desktop-only (hidden at ≤768px), so use a wide viewport.
- Playback is driven by requestAnimationFrame. In a hidden/background Chrome tab, RAF is throttled to zero: the playhead stays at 0:00 and no sounds trigger even though state says running. Make sure the tab is visible and focused before judging playback.
- Audio needs a real user gesture on iOS; programmatic clicks from extension scripts are untrusted, so AudioContext may stay suspended. Verify state changes via the DOM (pad buttons flip to ⏹, oscillator card border turns green) rather than by expecting audible output.
- Pads expose `data-pad-name` and `data-stop-button` attributes; playing pads contain "⏹" in their button text. Timeline blocks are absolutely positioned divs with borderRadius 6px containing a × button.
- Stop All (in the pad toolbar) stops pads, the binaural generator, any running preset progression, and holds the timeline. After a pad fades out and is replayed, its volume slider should climb back to its previous level, not stay at 0.

Gotchas

- claude-in-chrome screenshots can fail with "Page still loading (document_idle)" on this app even when document.readyState is complete; javascript_tool still works, so verify through DOM queries.
- public/sounds is ~600 MB (47 wavs); audio buffers load lazily on first play, not on mount.
