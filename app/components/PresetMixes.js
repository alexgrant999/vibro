"use client";

import React from "react";

export default function PresetMixes({ onPresetClick }) {
  const presets = [
    {
      name: "🌙 Deep Sleep",
      description: "Low frequencies for restful sleep",
      config: {
        carrierFreq: 40,
        beatFreq: 2,
        volume: 0.12,
        pads: [
          "🔴 Root Chakra (A)",
          "✨ Crystal Bowl Drones",
          "🎶 Singing Bowl 1",
        ],
      },
    },
    {
      name: "🧘 Meditation",
      description: "Alpha waves for focused calm",
      config: {
        carrierFreq: 100,
        beatFreq: 10,
        volume: 0.15,
        pads: [
          "💚 Heart Chakra (E)",
          "🏔️ Tibetan Bowls 1",
          "🌬️ Drone Crystal 1",
        ],
      },
    },
    {
      name: "⚡ Energized",
      description: "Higher frequencies for energy",
      config: {
        carrierFreq: 150,
        beatFreq: 40,
        volume: 0.18,
        pads: [
          "✨ Crystal Bowl Mid 1",
          "🪶 Flute FX 1",
          "🎶 Singing Bowl 4",
        ],
      },
    },
    {
      name: "🌙 Shamanic Journey",
      description: "Deep mystical resonance",
      config: {
        carrierFreq: 80,
        beatFreq: 7,
        volume: 0.14,
        pads: [
          "🥁 Frame Drum",
          "🪶 Flute Swishes",
          "✨ Crystal Bowl Drones",
        ],
      },
    },
    {
      name: "🌈 Chakra Healing",
      description: "Balanced chakra harmonization",
      config: {
        carrierFreq: 120,
        beatFreq: 5,
        volume: 0.16,
        pads: [
          "🔴 Root Chakra (A)",
          "💚 Heart Chakra (E)",
          "💜 Third Eye (G)",
          "✨ Crystal Bowl Mid 2",
        ],
      },
    },
  ];

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "0 auto 30px",
        padding: "0 40px",
      }}
    >
      <h2
        style={{
          fontSize: "16px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#aeeaff",
        }}
      >
        ✨ Preset Mixes
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "12px",
        }}
      >
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onPresetClick(preset.config)}
            style={{
              background: "linear-gradient(180deg, #1a3a42, #0f2530)",
              border: "1px solid #233142",
              borderRadius: "12px",
              padding: "16px",
              cursor: "pointer",
              color: "#edf2f7",
              textAlign: "left",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(180deg, #1f4d5a, #0f3545)";
              e.currentTarget.style.borderColor = "#6ccff6";
              e.currentTarget.style.boxShadow =
                "0 8px 24px rgba(108,207,246,.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(180deg, #1a3a42, #0f2530)";
              e.currentTarget.style.borderColor = "#233142";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "6px",
                color: "#6ccff6",
              }}
            >
              {preset.name}
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "#9db1c5",
                marginBottom: "8px",
              }}
            >
              {preset.description}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#7b8aa0",
                lineHeight: "1.4",
              }}
            >
              {preset.config.pads.length} sounds • {preset.config.carrierFreq}
              Hz carrier
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
