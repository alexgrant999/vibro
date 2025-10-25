"use client";

import React, { useState, useRef, useEffect } from "react";
import { getAudioContext } from "../components/audioContext";
import NavBar from "../components/NavBar";

export default function OscillatorPage() {
  const ctxRef = useRef(null);
  const leftOsc = useRef(null);
  const rightOsc = useRef(null);
  const gainRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [waveform, setWaveform] = useState("sine");
  const [freq, setFreq] = useState(432);
  const [volume, setVolume] = useState(0.3);
  const [binaural, setBinaural] = useState(false);
  const [beatOffset, setBeatOffset] = useState(4);

  // 🔓 Audio unlock overlay for iOS / Chrome iOS
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    const handleUnlock = () => {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume().then(() => setUnlocked(true));
      } else {
        setUnlocked(true);
      }
    };
    const events = ["touchstart", "touchend", "mousedown"];
    events.forEach((e) => window.addEventListener(e, handleUnlock));
    return () =>
      events.forEach((e) => window.removeEventListener(e, handleUnlock));
  }, []);

  // 🔊 Start or stop playback
  const handleToggle = async () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
    ctxRef.current = ctx;

    if (!isPlaying) {
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      gainRef.current = gain;

      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = waveform;
      oscR.type = waveform;

      oscL.frequency.setValueAtTime(freq, ctx.currentTime);
      oscR.frequency.setValueAtTime(
        binaural ? freq + beatOffset : freq,
        ctx.currentTime
      );

      const merger = ctx.createChannelMerger(2);
      const leftGain = ctx.createGain();
      const rightGain = ctx.createGain();

      oscL.connect(leftGain).connect(merger, 0, 0);
      oscR.connect(rightGain).connect(merger, 0, 1);
      merger.connect(gain);

      oscL.start();
      oscR.start();

      leftOsc.current = oscL;
      rightOsc.current = oscR;
      setIsPlaying(true);
    } else {
      leftOsc.current.stop();
      rightOsc.current.stop();
      setIsPlaying(false);
    }
  };

  // 🎚 Live updates
  useEffect(() => {
    if (isPlaying && leftOsc.current && rightOsc.current && ctxRef.current) {
      leftOsc.current.frequency.setValueAtTime(
        freq,
        ctxRef.current.currentTime
      );
      rightOsc.current.frequency.setValueAtTime(
        binaural ? freq + beatOffset : freq,
        ctxRef.current.currentTime
      );
    }
  }, [freq, beatOffset, binaural, isPlaying]);

  useEffect(() => {
    if (isPlaying && leftOsc.current && rightOsc.current) {
      leftOsc.current.type = waveform;
      rightOsc.current.type = waveform;
    }
  }, [waveform, isPlaying]);

  const handleVolumeChange = (e) => {
    const val = e.target.value / 100;
    setVolume(val);
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setValueAtTime(val, ctxRef.current.currentTime);
    }
  };

  // ⬇️ UI
  return (
    <>
      <NavBar />

      {!unlocked ? (
        <div
          style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at 30% 30%, #111a25, #0a0f14)",
            color: "#e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            fontSize: "1.2em",
            textAlign: "center",
            cursor: "pointer",
          }}
          onClick={() => {
            const ctx = getAudioContext();
            if (ctx.state === "suspended") ctx.resume();
            setUnlocked(true);
          }}
        >
          <p>🔈 Tap anywhere to enable sound</p>
          <small>(Required on iPhone / iOS Chrome / Safari)</small>
        </div>
      ) : (
        <div
          style={{
            minHeight: "100vh",
            background: "radial-gradient(circle at 30% 30%, #111a25, #0a0f14)",
            color: "#e2e8f0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 40px 40px",
          }}
        >
          <h1 style={{ fontSize: "2em", marginBottom: "20px" }}>
            🌀 Oscillator Playground
          </h1>

          <div
            style={{
              textAlign: "center",
              maxWidth: "400px",
              width: "100%",
              background: "rgba(15,25,35,0.6)",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            }}
          >
            {/* Waveform */}
            <label style={{ fontSize: "14px" }}>Waveform</label>
            <select
              value={waveform}
              onChange={(e) => setWaveform(e.target.value)}
              style={{
                width: "100%",
                marginBottom: "16px",
                padding: "8px",
                borderRadius: "8px",
                background: "#1b2836",
                color: "#fff",
                border: "1px solid #2a5e7f",
              }}
            >
              <option value="sine">Sine</option>
              <option value="triangle">Triangle</option>
              <option value="square">Square</option>
              <option value="sawtooth">Sawtooth</option>
            </select>

            {/* Frequency */}
            <label style={{ fontSize: "14px" }}>Frequency: {freq} Hz</label>
            <input
              type="range"
              min="20"
              max="2000"
              step="1"
              value={freq}
              onChange={(e) => setFreq(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#6ccff6",
                marginBottom: "20px",
              }}
            />

            {/* Volume */}
            <label style={{ fontSize: "14px" }}>
              Volume: {(volume * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={handleVolumeChange}
              style={{
                width: "100%",
                accentColor: "#6ccff6",
                marginBottom: "20px",
              }}
            />

            {/* Binaural */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "14px" }}>
                <input
                  type="checkbox"
                  checked={binaural}
                  onChange={(e) => setBinaural(e.target.checked)}
                  style={{ marginRight: "8px" }}
                />
                Binaural Beats
              </label>
              {binaural && (
                <>
                  <div style={{ fontSize: "13px", marginTop: "6px" }}>
                    Offset: {beatOffset} Hz
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.1"
                    value={beatOffset}
                    onChange={(e) => setBeatOffset(parseFloat(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "#6ccff6",
                      marginTop: "4px",
                    }}
                  />
                </>
              )}
            </div>

            {/* Play Button */}
            <button
              onClick={handleToggle}
              style={{
                width: "100%",
                background: isPlaying
                  ? "linear-gradient(180deg,#3a1717,#230f0f)"
                  : "linear-gradient(180deg,#17354a,#0f2635)",
                border: "1px solid #2a5e7f",
                borderRadius: "14px",
                color: "white",
                padding: "10px",
                fontSize: "16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {isPlaying ? "⏹ Stop" : "▶ Play"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
