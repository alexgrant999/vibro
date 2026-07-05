"use client";

import { useRef, useCallback } from "react";
import PadGrid from "./components/PadGrid";
import OscillatorUnit from "./components/OscillatorUnit";
import SessionTimeline from "./components/SessionTimeline";
import { soundFiles } from "./components/sounds";

// Build category map from soundFiles
const categoryMap = {};
soundFiles.forEach((s) => {
  if (!categoryMap[s.category]) categoryMap[s.category] = [];
  categoryMap[s.category].push(s);
});
// Add binaural beats as a special timeline category
categoryMap["Binaural Beats"] = [{ name: "__binaural__" }];

export default function Home() {
  const padGridRef = useRef(null);
  const oscillatorRef = useRef(null);
  const progressionIntervalRef = useRef(null);
  const progressionStartRef = useRef(null);

  const applyPreset = (config) => {
    // Stop any ongoing progression
    if (progressionIntervalRef.current) {
      clearInterval(progressionIntervalRef.current);
    }

    // Activate oscillator with preset parameters
    if (oscillatorRef.current) {
      oscillatorRef.current.setParams({
        carrierFreq: config.carrierFreq,
        beatFreq: config.beatFreq,
        volume: config.volume,
      });
    }

    // Play specified pads
    if (padGridRef.current) {
      padGridRef.current.playPads(config.pads);
    }

    // Start 20-minute progression if it exists
    if (config.progression) {
      progressionStartRef.current = Date.now();
      progressionIntervalRef.current = setInterval(() => {
        const elapsedMs = Date.now() - progressionStartRef.current;
        const elapsedMin = elapsedMs / 60000;

        // Stop after 20 minutes
        if (elapsedMin >= 20) {
          clearInterval(progressionIntervalRef.current);
          return;
        }

        // Execute progression steps (every 30 seconds)
        config.progression(elapsedMin, oscillatorRef, padGridRef);
      }, 30000);
    }
  };

  const playShamanicFlourish = () => {
    // Play shamanic effect sounds in sequence
    const flourishPads = [
      "🪶 Flute Swishes",
      "Ocarina Call 1",
      "Shaman Voice",
      "Leaves Rustle",
    ];

    // Play the flourish effects
    if (padGridRef.current) {
      padGridRef.current.playPads(flourishPads);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 80% -10%, #1a2430 0%, #0b0f14 55%), #0b0f14",
        color: "white",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      {/* Header */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto 40px",
          padding: "40px 40px 0",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: "800",
            marginBottom: "16px",
            color: "#aeeaff",
            textShadow: "0 4px 20px rgba(108,207,246,.3)",
          }}
        >
          🫀 Vibro Acoustic Therapy
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#9db1c5",
            maxWidth: "700px",
            margin: "0 auto 40px",
            lineHeight: "1.8",
          }}
        >
          Experience therapeutic sound healing through binaural beats and curated ambient soundscapes.
          Combine preset mixes with custom oscillator frequencies for personalized vibro-acoustic therapy sessions.
          Perfect for meditation, relaxation, sleep, and energetic healing.
        </p>
      </div>

      {/* Session Timeline — desktop only (iOS audio policy blocks programmatic playback) */}
      <div className="desktop-only" style={{ padding: "0 40px", marginBottom: "40px" }}>
        <SessionTimeline
          categoryMap={categoryMap}
          onPlaySounds={useCallback((names) => {
            if (names.includes("__binaural__")) oscillatorRef.current?.start();
            else padGridRef.current?.playPads(names);
          }, [])}
          onStopSounds={useCallback((names) => {
            if (names.includes("__binaural__")) oscillatorRef.current?.stop();
            else padGridRef.current?.stopPads(names);
          }, [])}
          onApplyOscillator={useCallback((params) => {
            oscillatorRef.current?.setParams(params, { autoStart: false });
          }, [])}
        />
      </div>

      {/* Master Control Unit */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto 40px",
          padding: "32px 40px",
          background: "linear-gradient(135deg, #1a2f42 0%, #0f1e2a 100%)",
          border: "1.5px solid #2a5e7f",
          borderRadius: "24px",
          boxShadow: "0 12px 48px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.05)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "700",
            marginBottom: "28px",
            color: "#aeeaff",
            textAlign: "center",
          }}
        >
          ⚙️ Master Control
        </h2>

        {/* Oscillator */}
        <OscillatorUnit
          ref={oscillatorRef}
          id={1}
          initialFreq={null}
        />

        {/* Presets */}
        <div style={{ marginTop: "28px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#8ef59d",
            }}
          >
            ✨ Preset Mixes
          </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              {[
                {
                  name: "🌙 Sleep",
                  config: {
                    carrierFreq: 40,
                    beatFreq: 2,
                    volume: 0.12,
                    pads: ["🔴 Root Chakra (A)", "🥁 Sine Drums", "🎶 Singing Bowl 1"],
                    progression: (elapsedMin, oscRef) => {
                      const newCarrier = Math.round(40 - elapsedMin * 0.5);
                      const newVolume = Math.max(0.02, 0.12 - elapsedMin * 0.003);
                      if (oscRef.current) {
                        oscRef.current.setParams({
                          carrierFreq: Math.max(20, newCarrier),
                          beatFreq: 2,
                          volume: newVolume,
                        });
                      }
                    },
                  },
                },
                {
                  name: "🧘 Meditate",
                  config: {
                    carrierFreq: 100,
                    beatFreq: 10,
                    volume: 0.15,
                    pads: ["💚 Heart Chakra (E)", "🥁 Sine Drums", "🏔️ Tibetan Bowls 1"],
                    progression: (elapsedMin, oscRef) => {
                      const beatCycle = Math.round(8 + 4 * Math.sin(elapsedMin * Math.PI / 10));
                      if (oscRef.current) {
                        oscRef.current.setParams({
                          carrierFreq: 100,
                          beatFreq: beatCycle,
                          volume: 0.15,
                        });
                      }
                    },
                  },
                },
                {
                  name: "⚡ Energy",
                  config: {
                    carrierFreq: 150,
                    beatFreq: 40,
                    volume: 0.18,
                    pads: ["🥁 Warm Kick", "🪶 Flute FX 1", "🥁 Big Drum"],
                    progression: (elapsedMin, oscRef) => {
                      const newCarrier = Math.round(150 + elapsedMin * 1.5);
                      const newBeat = Math.round(30 + elapsedMin * 0.5);
                      if (oscRef.current) {
                        oscRef.current.setParams({
                          carrierFreq: Math.min(200, newCarrier),
                          beatFreq: Math.min(40, newBeat),
                          volume: 0.18,
                        });
                      }
                    },
                  },
                },
                {
                  name: "🌙 Shamanic",
                  config: {
                    carrierFreq: 80,
                    beatFreq: 7,
                    volume: 0.14,
                    pads: ["🥁 Shaman Drums", "🪶 Flute Swishes", "🥁 Buffalo Drum"],
                    progression: (elapsedMin, oscRef) => {
                      const beatPulse = Math.round(5 + 4 * Math.sin(elapsedMin * Math.PI / 5));
                      if (oscRef.current) {
                        oscRef.current.setParams({
                          carrierFreq: 80,
                          beatFreq: beatPulse,
                          volume: 0.14,
                        });
                      }
                    },
                  },
                },
                {
                  name: "🌈 Chakra",
                  config: {
                    carrierFreq: 120,
                    beatFreq: 5,
                    volume: 0.16,
                    pads: ["🔴 Root Chakra (A)", "🥁 Buffalo Drum", "💚 Heart Chakra (E)", "💜 Third Eye (G)"],
                    progression: (elapsedMin, oscRef) => {
                      const newBeat = Math.round(5 + elapsedMin * 0.4);
                      if (oscRef.current) {
                        oscRef.current.setParams({
                          carrierFreq: 120,
                          beatFreq: newBeat,
                          volume: 0.16,
                        });
                      }
                    },
                  },
                },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => applyPreset(preset.config)}
                  style={{
                    background: "linear-gradient(180deg, #1a3a42, #0f2530)",
                    border: "1px solid #233142",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    color: "#6ccff6",
                    fontSize: "13px",
                    fontWeight: "600",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(180deg, #1f4d5a, #0f3545)";
                    e.currentTarget.style.borderColor = "#6ccff6";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(108,207,246,.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "linear-gradient(180deg, #1a3a42, #0f2530)";
                    e.currentTarget.style.borderColor = "#233142";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
        </div>

        {/* Shamanic Flourish Button */}
        <button
          onClick={playShamanicFlourish}
          style={{
            width: "100%",
            marginTop: "28px",
            background: "linear-gradient(180deg, #3a2a17, #230f0f)",
            border: "1.5px solid #8a4a4a",
            borderRadius: "12px",
            padding: "16px 20px",
            cursor: "pointer",
            color: "#ff8f99",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(180deg, #4a3a27, #330f1f)";
            e.currentTarget.style.borderColor = "#ff8f99";
            e.currentTarget.style.boxShadow =
              "0 6px 16px rgba(255,143,153,.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(180deg, #3a2a17, #230f0f)";
            e.currentTarget.style.borderColor = "#8a4a4a";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          🪶 Shamanic Flourish
        </button>
      </div>

      {/* Pads Grid */}
      <div style={{ padding: "0 40px", marginBottom: "40px" }}>
        <PadGrid ref={padGridRef} />
      </div>

    </main>
  );
}
