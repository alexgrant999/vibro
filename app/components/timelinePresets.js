// Preset arrangements for the 10-minute session timeline.
// Each item: { category, time (s), duration (s), row (0-4) }.
// oscillator primes the binaural generator (carrier Hz, beat Hz) without
// starting it; a Binaural Beats block starts it when the playhead arrives.

export const timelinePresets = [
  {
    name: "Deep Sleep",
    icon: "🌙",
    description:
      "Delta entrainment at 2.5 Hz. Layers thin out as the session deepens, ending in night sounds.",
    oscillator: { carrierFreq: 100, carrierMax: 105, beatFreq: 2.5, volume: 0.1 },
    items: [
      { category: "Binaural Beats",         time: 0,   duration: 600, row: 0 },
      { category: "Crystal Bowls & Drones", time: 0,   duration: 330, row: 1 },
      { category: "Singing Bowls",          time: 45,  duration: 180, row: 2 },
      { category: "Nature Sounds",          time: 270, duration: 330, row: 3 },
    ],
  },
  {
    name: "Theta Meditation",
    icon: "🧘",
    description:
      "6 Hz theta on a carrier near 136 Hz, the Om tone. Bowls settle you in, drones deepen, then a gentle return.",
    oscillator: { carrierFreq: 136, carrierMax: 141, beatFreq: 6, volume: 0.14 },
    items: [
      { category: "Binaural Beats",         time: 0,   duration: 600, row: 0 },
      { category: "Nature Sounds",          time: 0,   duration: 150, row: 4 },
      { category: "Tibetan Bowls",          time: 60,  duration: 240, row: 1 },
      { category: "Crystal Bowls & Drones", time: 240, duration: 240, row: 2 },
      { category: "Singing Bowls",          time: 420, duration: 135, row: 3 },
      { category: "Nature Sounds",          time: 495, duration: 105, row: 4 },
    ],
  },
  {
    name: "Chakra Journey",
    icon: "🌈",
    description:
      "A rising sequence of chakra bowls, root to crown, over a 7.8 Hz Schumann resonance beat. Drones and a single tone to integrate.",
    oscillator: { carrierFreq: 120, carrierMax: 130, beatFreq: 7.8, volume: 0.14 },
    items: [
      { category: "Binaural Beats",         time: 0,   duration: 600, row: 0 },
      { category: "Tuned Notes",            time: 0,   duration: 45,  row: 4 },
      { category: "Chakra Bowls",           time: 0,   duration: 85,  row: 1 },
      { category: "Chakra Bowls",           time: 85,  duration: 85,  row: 2 },
      { category: "Chakra Bowls",           time: 170, duration: 85,  row: 1 },
      { category: "Chakra Bowls",           time: 255, duration: 85,  row: 2 },
      { category: "Chakra Bowls",           time: 340, duration: 85,  row: 1 },
      { category: "Chakra Bowls",           time: 425, duration: 85,  row: 2 },
      { category: "Crystal Bowls & Drones", time: 480, duration: 120, row: 3 },
      { category: "Tuned Notes",            time: 540, duration: 60,  row: 4 },
    ],
  },
  {
    name: "Shamanic Journey",
    icon: "🥁",
    description:
      "The classic three-phase journey: steady drumming into trance, a callback signal, rapid return drumming, then silence to re-enter.",
    items: [
      { category: "Shamanic Effects",       time: 0,   duration: 60,  row: 2 },
      { category: "Drums & Percussion",     time: 0,   duration: 420, row: 1 },
      { category: "Flutes",                 time: 120, duration: 180, row: 3 },
      { category: "Crystal Bowls & Drones", time: 180, duration: 240, row: 4 },
      { category: "Shamanic Effects",       time: 405, duration: 60,  row: 2 },
      { category: "Drums & Percussion",     time: 465, duration: 105, row: 1 },
    ],
  },
  {
    name: "Alpha Unwind",
    icon: "🌿",
    description:
      "10 Hz alpha over a continuous nature bed. Bowls and flutes drift through, then leave you settled.",
    oscillator: { carrierFreq: 200, carrierMax: 210, beatFreq: 10, volume: 0.13 },
    items: [
      { category: "Binaural Beats",         time: 0,   duration: 600, row: 0 },
      { category: "Nature Sounds",          time: 0,   duration: 600, row: 4 },
      { category: "Singing Bowls",          time: 75,  duration: 180, row: 1 },
      { category: "Flutes",                 time: 210, duration: 165, row: 2 },
      { category: "Tibetan Bowls",          time: 345, duration: 165, row: 3 },
    ],
  },
  {
    name: "Crystal Sound Bath",
    icon: "✨",
    description:
      "A purely acoustic arc: arrive on a single tone, immerse as the bowls layer to peak density, then thin out and close on the same tone.",
    items: [
      { category: "Tuned Notes",            time: 0,   duration: 40,  row: 0 },
      { category: "Singing Bowls",          time: 30,  duration: 150, row: 1 },
      { category: "Crystal Bowls & Drones", time: 120, duration: 360, row: 2 },
      { category: "Tibetan Bowls",          time: 240, duration: 150, row: 3 },
      { category: "Chakra Bowls",           time: 300, duration: 120, row: 1 },
      { category: "Singing Bowls",          time: 435, duration: 105, row: 3 },
      { category: "Tuned Notes",            time: 545, duration: 40,  row: 0 },
    ],
  },
];
