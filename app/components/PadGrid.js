"use client";

import React, { useState } from "react";
import Pad from "./Pad";
import { baseUrl, soundFiles } from "./sounds";
import OscillatorUnit from "./OscillatorUnit";

export default function PadGrid() {
  const [oscillators, setOscillators] = useState([1]);

  const sounds = soundFiles.map((s) => ({
    name: s.name,
    url: s.file.startsWith("http") ? s.file : `${baseUrl}${s.file}`,
  }));

  const addOscillator = () =>
    setOscillators((prev) => [...prev, prev.length + 1]);

  return (
    <div style={{ padding: "40px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {sounds.map((sound, i) => (
          <Pad key={`pad-${i}`} name={sound.name} url={sound.url} />
        ))}

        {oscillators.map((id) => (
          <OscillatorUnit key={`osc-${id}`} id={id} />
        ))}

        <button
          onClick={addOscillator}
          style={{
            background: "linear-gradient(180deg, #17354a, #0f2635)",
            border: "1px solid #2a5e7f",
            borderRadius: "12px",
            color: "white",
            padding: "20px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          ➕ Add Oscillator
        </button>
      </div>
    </div>
  );
}
