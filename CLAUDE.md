# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vibro-Acoustic App is a Next.js 15 web application that provides a 12-pad audio player and synthesizer for vibro-acoustic therapy. It uses the Web Audio API to generate oscillators and play pre-recorded audio samples. The app supports:
- 6 pre-configured audio pads (ambient sounds, nature sounds)
- Dynamic oscillator synthesis with LFO (Low-Frequency Oscillation) modulation
- Pan and frequency modulation controls
- Volume control for each oscillator

## Development Commands

**Package Manager**: Uses `pnpm` (check `pnpm-lock.yaml`)

```bash
pnpm dev          # Start development server (localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Architecture

### Project Structure
```
app/
  ├── layout.js                 # Root layout with metadata
  ├── page.js                   # Home page (client component, "use client")
  ├── globals.css               # Global styles
  ├── components/
  │   ├── PadGrid.js           # Main component managing all pads and oscillators
  │   ├── Pad.js               # Individual audio pad with play button
  │   ├── OscillatorUnit.js     # Synthesizer with LFO modulation
  │   ├── audioContext.js      # Web Audio API context singleton (SSR-safe)
  │   ├── sounds.js            # Audio file references and URLs
  │   ├── NavBar.js            # Navigation component
  │   ├── Header.js            # Header component
  │   └── Footer.js            # Footer component
  └── oscillator/              # Dedicated oscillator test page
  └── testaudio/               # Audio test page
public/
  └── sounds/                  # Local audio files
package.json
next.config.mjs               # Allows LocalTunnel HTTPS URLs (loca.lt)
tailwind.config.js            # Tailwind CSS configuration
eslint.config.mjs             # ESLint configuration (flat config format)
```

### Key Architectural Patterns

**Client Components**: All interactive components use `"use client"` since they rely on browser APIs (Web Audio, React hooks). The app is fully client-rendered.

**Audio Context Singleton** (`app/components/audioContext.js`):
- `getAudioContext()` returns a cached `AudioContext` instance
- Includes SSR-safe guards to prevent crashes during server-side rendering
- Returns mock objects during SSR to satisfy Next.js build process

**State Management**: Uses React `useState` for local component state:
- `PadGrid`: Manages oscillator instances and sound files
- `OscillatorUnit`: Manages individual oscillator parameters (frequency, volume, LFO settings)
- `Pad`: Manages play state and audio playback

**Audio Architecture**:
- **Oscillators**: Each `OscillatorUnit` can generate a sine wave with:
  - Base frequency (Hz)
  - Pan modulation via LFO (pan oscillator)
  - Frequency modulation via LFO (frequency oscillator)
  - Volume control via gain node
- **Pads**: Pre-recorded audio files loaded from AWS S3 or local public folder
- **Signal Chain**: `Oscillator → Gain → Panner → Context.destination` (or audio element for pads)

### Component Responsibilities

- **PadGrid**: Orchestrator component that renders all 6 pads + dynamically added oscillators
- **Pad**: Plays audio file on click; manages loading state
- **OscillatorUnit**: Encapsulates oscillator synthesis; provides UI for parameter control (frequency, LFO speed/range, volume, pan)
- **NavBar/Header/Footer**: Layout and navigation
- **sounds.js**: Centralized audio file registry (URLs for both S3 and local files)

## Styling

- Uses **Tailwind CSS 4.1.14** with custom inline styles (most styling is inline, not CSS classes)
- Global styles in `app/globals.css`
- Gradient background on home page: `radial-gradient(1200px 600px at 80% -10%, #1a2430 0%, #0b0f14 55%)`

## Configuration Notes

- **Next.js 15.5.9** with experimental `allowedDevOrigins` for LocalTunnel HTTPS URLs (`*.loca.lt`)
- React 19.1.0 with strict SSR handling for Web Audio API
- ESLint uses **flat config format** (eslint.config.mjs) with Next.js core rules
- No TypeScript (JavaScript files only)

## Important Considerations

### Web Audio API & Browser Compatibility
- Web Audio API requires user interaction to resume (suspended state)
- Audio context may be suspended; explicitly call `ctx.resume()` if needed
- Only works in browsers; server-side code has no-op fallbacks

### SSR Compatibility
- Components using Web Audio import and use `getAudioContext()` which returns mock objects during build
- This prevents "window is undefined" errors during Next.js build
- Audio functionality only activates on client

### Oscillator Lifecycle
- Oscillators cannot be stopped and restarted; they must be created new each time
- Clean up by storing references in `useRef` and calling `.stop()`
- LFO oscillators must also be stopped independently

## Common Development Tasks

**Adding a new sound pad:**
1. Add entry to `soundFiles` array in `app/components/sounds.js`
2. Ensure audio file is in `public/sounds/` or reference the URL
3. `PadGrid` automatically renders all sounds from the array

**Modifying oscillator parameters:**
- Edit state defaults in `OscillatorUnit.js` (volume, baseFreq, freqRange, freqSpeed, panSpeed)
- Adjust UI controls or add new slider ranges as needed

**Styling changes:**
- Most styling is inline; update inline styles in component render
- For global changes, edit `app/globals.css`
- Add Tailwind classes to element className if using utility-based styling

**Testing audio:**
- Visit `/testaudio` for audio testing page
- Visit `/oscillator` for oscillator-specific testing
