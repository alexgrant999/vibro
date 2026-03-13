"use client";

import React, { useState, useImperativeHandle, forwardRef, useRef, useEffect } from "react";
import Pad from "./Pad";
import { baseUrl, soundFiles } from "./sounds";
import { getAudioContext } from "./audioContext";

const CATEGORY_ICONS = {
  "Chakra Bowls": "🌈",
  "Tibetan Bowls": "🏔️",
  "Singing Bowls": "🎶",
  "Crystal Bowls & Drones": "✨",
  "Flutes": "🪶",
  "Tuned Notes": "🎵",
  "Drums & Percussion": "🥁",
  "Nature Sounds": "🌿",
  "Shamanic Effects": "🔮",
};

function FreqGraph({ analyserNode }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;
    const c = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const bufLen = analyserNode.frequencyBinCount;
    const data = new Uint8Array(bufLen);

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(data);

      c.clearRect(0, 0, W, H);
      c.fillStyle = "#0a1219";
      c.fillRect(0, 0, W, H);

      // RMS amplitude — time-domain data is centered at 128
      let sum = 0;
      for (let i = 0; i < bufLen; i++) {
        const s = (data[i] - 128) / 128;
        sum += s * s;
      }
      const rms = Math.sqrt(sum / bufLen);
      const level = Math.min(rms * 14, 1); // scale up for visibility
      const barH = Math.round(level * H);

      if (barH > 0) {
        const grad = c.createLinearGradient(0, H, 0, H - barH);
        grad.addColorStop(0, "#6ccff6");
        grad.addColorStop(1, "#8ef59d");
        c.fillStyle = grad;
        c.fillRect(0, H - barH, W, barH);
      }
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyserNode]);

  return (
    <canvas
      ref={canvasRef}
      width={14}
      height={36}
      title="Live level"
      style={{ display: "block", borderRadius: "3px", flexShrink: 0 }}
    />
  );
}

const PadGridComponent = forwardRef(function PadGrid(_props, ref) {
  const [oscillator, setOscillator] = useState({ id: 1, initialFreq: null }); // eslint-disable-line no-unused-vars
  const [viewMode, setViewMode] = useState("list");
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const analysersRef = useRef({});

  const getAnalyser = (cat) => {
    if (!analysersRef.current[cat]) {
      const audioCtx = getAudioContext();
      if (audioCtx && audioCtx.createAnalyser) {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.85;
        analysersRef.current[cat] = analyser;
      }
    }
    return analysersRef.current[cat] || null;
  };

  // Group sounds by category, preserving order
  const categories = [];
  const categoryMap = {};
  soundFiles.forEach((s) => {
    const url = s.file.startsWith("http") ? s.file : `${baseUrl}${s.file}`;
    if (!categoryMap[s.category]) {
      categoryMap[s.category] = [];
      categories.push(s.category);
    }
    categoryMap[s.category].push({ name: s.name, url });
  });

  const toggleCategory = (cat) =>
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const setOscillatorFreq = (freq) => {
    setOscillator({ id: 1, initialFreq: freq });
  };

  const setOscillatorParams = (params) => {
    // This will be called by the ref
    if (oscillatorRef.current) {
      oscillatorRef.current.setParams(params);
    }
  };

  const stopAll = () => {
    const buttons = document.querySelectorAll('[data-stop-button]');
    buttons.forEach((btn) => {
      if (btn.textContent.includes('⏹')) {
        btn.click();
      }
    });
  };

  const stopPads = (padNames) => {
    const buttons = document.querySelectorAll('[data-stop-button]');
    buttons.forEach((btn) => {
      const btnName = btn.getAttribute('data-pad-name');
      if (padNames.includes(btnName) && btn.textContent.includes('⏹')) {
        btn.click();
      }
    });
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
    stopPads,
    stopAll,
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
          onClick={stopAll}
          style={{
            background: "linear-gradient(180deg, #3a1717, #2a0f0f)",
            border: "1px solid #8a4a4a",
            borderRadius: "10px",
            color: "#ff9999",
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.2s ease",
            marginLeft: "auto",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#ff6666";
            e.target.style.color = "#ff6666";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#8a4a4a";
            e.target.style.color = "#ff9999";
          }}
        >
          ⏹ Stop All
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

      {/* Sounds grouped by category */}
      <div style={{ maxWidth: "1200px", margin: "0 auto 40px" }}>
        {categories.map((cat) => {
          const isCollapsed = collapsedCategories[cat];
          const sounds = categoryMap[cat];
          return (
            <div key={cat} style={{ marginBottom: "12px" }}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "linear-gradient(180deg, #1a2f42, #111e2a)",
                  border: "1px solid #2a4a62",
                  borderRadius: isCollapsed ? "10px" : "10px 10px 0 0",
                  color: "#6ccff6",
                  padding: "12px 16px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "700",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6ccff6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a4a62"; }}
              >
                <span>{CATEGORY_ICONS[cat] || "🎵"}</span>
                <span style={{ flex: 1 }}>{cat}</span>
                <FreqGraph analyserNode={getAnalyser(cat)} />
                <span style={{ fontSize: "12px", color: "#7b8aa0", marginLeft: "8px" }}>
                  {sounds.length} sound{sounds.length !== 1 ? "s" : ""}
                </span>
                <span style={{ fontSize: "12px", color: "#7b8aa0", marginLeft: "8px" }}>
                  {isCollapsed ? "▶" : "▼"}
                </span>
              </button>

              {/* Category Sounds */}
              <div
                  style={{
                    display: isCollapsed ? "none" : "block",
                    border: "1px solid #2a4a62",
                    borderTop: "none",
                    borderRadius: "0 0 10px 10px",
                    overflow: "hidden",
                  }}
                >
                  {viewMode === "grid" ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "12px",
                        padding: "12px",
                        background: "linear-gradient(180deg, #0e1a24, #0a1219)",
                      }}
                    >
                      {sounds.map((sound, i) => (
                        <Pad key={`${cat}-${i}`} name={sound.name} url={sound.url} analyserNode={getAnalyser(cat)} />
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        padding: "8px",
                        background: "linear-gradient(180deg, #0e1a24, #0a1219)",
                      }}
                    >
                      {sounds.map((sound, i) => (
                        <Pad key={`${cat}-${i}`} name={sound.name} url={sound.url} listView analyserNode={getAnalyser(cat)} />
                      ))}
                    </div>
                  )}
                </div>
            </div>
          );
        })}
      </div>

    </div>
  );
});

export default PadGridComponent;
