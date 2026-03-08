"use client";

import React, { useState, useImperativeHandle, forwardRef, useRef } from "react";
import Pad from "./Pad";
import { baseUrl, soundFiles } from "./sounds";
import OscillatorUnit from "./OscillatorUnit";

const PadGridComponent = forwardRef(function PadGrid(props, ref) {
  const [oscillator, setOscillator] = useState({ id: 1, initialFreq: null });
  const [viewMode, setViewMode] = useState("list"); // 'grid' or 'list' - default to list

  const sounds = soundFiles.map((s) => ({
    name: s.name,
    url: s.file.startsWith("http") ? s.file : `${baseUrl}${s.file}`,
  }));

  const setOscillatorFreq = (freq) => {
    setOscillator({ id: 1, initialFreq: freq });
  };

  const setOscillatorParams = (params) => {
    // This will be called by the ref
    if (oscillatorRef.current) {
      oscillatorRef.current.setParams(params);
    }
  };

  const playPads = (padNames) => {
    // Play specific pads by name
    const buttons = document.querySelectorAll('[data-pad-name]');
    buttons.forEach((btn) => {
      const btnName = btn.getAttribute('data-pad-name');
      if (padNames.includes(btnName)) {
        // Only click if not already playing (button text doesn't contain "Stop")
        if (!btn.textContent.includes('⏹')) {
          btn.click();
        }
      }
    });
  };

  const oscillatorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    addOscillatorWithFreq: setOscillatorFreq,
    setOscillatorParams,
    playPads,
  }));

  return (
    <div>
      {/* View Toggle Buttons */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto 20px",
          display: "flex",
          gap: "12px",
        }}
      >
        <button
          onClick={() => setViewMode("grid")}
          style={{
            background:
              viewMode === "grid"
                ? "linear-gradient(180deg, #2a5e7f, #1a3f5a)"
                : "linear-gradient(180deg, #182431, #0e1a24)",
            border:
              viewMode === "grid" ? "1px solid #6ccff6" : "1px solid #334252",
            borderRadius: "10px",
            color: viewMode === "grid" ? "#6ccff6" : "#c1c9d6",
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (viewMode !== "grid") {
              e.target.style.borderColor = "#6ccff6";
              e.target.style.color = "#6ccff6";
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== "grid") {
              e.target.style.borderColor = "#334252";
              e.target.style.color = "#c1c9d6";
            }
          }}
        >
          📊 Grid View
        </button>
        <button
          onClick={() => setViewMode("list")}
          style={{
            background:
              viewMode === "list"
                ? "linear-gradient(180deg, #2a5e7f, #1a3f5a)"
                : "linear-gradient(180deg, #182431, #0e1a24)",
            border:
              viewMode === "list" ? "1px solid #6ccff6" : "1px solid #334252",
            borderRadius: "10px",
            color: viewMode === "list" ? "#6ccff6" : "#c1c9d6",
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (viewMode !== "list") {
              e.target.style.borderColor = "#6ccff6";
              e.target.style.color = "#6ccff6";
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== "list") {
              e.target.style.borderColor = "#334252";
              e.target.style.color = "#c1c9d6";
            }
          }}
        >
          📋 List View
        </button>
      </div>

      {/* Ambient Pads - Grid View */}
      {viewMode === "grid" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            maxWidth: "1200px",
            margin: "0 auto 40px",
          }}
        >
          {sounds.map((sound, i) => (
            <Pad key={`pad-${i}`} name={sound.name} url={sound.url} />
          ))}
        </div>
      )}

      {/* Ambient Pads - List View */}
      {viewMode === "list" && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto 40px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {sounds.map((sound, i) => (
            <Pad key={`pad-${i}`} name={sound.name} url={sound.url} listView />
          ))}
        </div>
      )}

    </div>
  );
});

export default PadGridComponent;
