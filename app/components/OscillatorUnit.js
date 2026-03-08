"use client";

import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { getAudioContext } from "./audioContext";
import { forwardRef } from "react";

const OscillatorUnit = forwardRef(function OscillatorUnit({ id, initialFreq }, ref) {
  const ctx = getAudioContext();
  const oscLeftRef = useRef(null);
  const oscRightRef = useRef(null);
  const gainLeftRef = useRef(null);
  const gainRightRef = useRef(null);
  const masterGainRef = useRef(null);
  const mergerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.15);
  const [leftFreq, setLeftFreq] = useState(initialFreq ?? 100);
  const [beatFreq, setBeatFreq] = useState(10); // Hz difference for binaural beat

  // --- START/STOP HANDLER ---
  useEffect(() => {
    if (isPlaying) {
      // Master gain
      const masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);

      // Create channel merger for left/right stereo output
      const merger = ctx.createChannelMerger(2);
      merger.connect(masterGain);

      // Left oscillator (lower frequency)
      const oscLeft = ctx.createOscillator();
      const gainLeft = ctx.createGain();
      oscLeft.type = "sine";
      oscLeft.frequency.value = leftFreq;
      gainLeft.gain.value = 1;
      oscLeft.connect(gainLeft).connect(merger, 0, 0); // To left channel
      oscLeft.start();

      // Right oscillator (higher frequency for binaural beat)
      const oscRight = ctx.createOscillator();
      const gainRight = ctx.createGain();
      oscRight.type = "sine";
      oscRight.frequency.value = leftFreq + beatFreq;
      gainRight.gain.value = 1;
      oscRight.connect(gainRight).connect(merger, 0, 1); // To right channel
      oscRight.start();

      oscLeftRef.current = oscLeft;
      oscRightRef.current = oscRight;
      gainLeftRef.current = gainLeft;
      gainRightRef.current = gainRight;
      masterGainRef.current = masterGain;
      mergerRef.current = merger;
    }

    return () => stopOsc();
  }, [isPlaying]);

  // --- LIVE PARAMETER UPDATES ---
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume;
    if (oscLeftRef.current) oscLeftRef.current.frequency.value = leftFreq;
    if (oscRightRef.current) oscRightRef.current.frequency.value = leftFreq + beatFreq;
  }, [volume, leftFreq, beatFreq]);

  const stopOsc = () => {
    [oscLeftRef, oscRightRef].forEach((ref) => {
      try {
        ref.current?.stop();
      } catch {}
    });
  };

  const toggle = () => setIsPlaying((prev) => !prev);

  const setParams = (params) => {
    if (params.carrierFreq !== undefined) setLeftFreq(params.carrierFreq);
    if (params.beatFreq !== undefined) setBeatFreq(params.beatFreq);
    if (params.volume !== undefined) setVolume(params.volume);
    // Auto-play if not already playing
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  useImperativeHandle(ref, () => ({
    setParams,
  }));

  return (
    <div
      style={{
        background: isPlaying
          ? "linear-gradient(135deg, #1a3f52 0%, #0f2a38 100%)"
          : "linear-gradient(135deg, #1a2f42 0%, #0f1e2a 100%)",
        border: isPlaying
          ? "2px solid #8ef59d"
          : "1.5px solid #2a5e7f",
        borderRadius: "20px",
        padding: "28px",
        color: "white",
        textAlign: "left",
        transition: "all 0.3s ease",
        boxShadow: isPlaying
          ? "0 12px 40px rgba(142,245,157,.2), inset 0 1px 0 rgba(255,255,255,.1)"
          : "0 8px 32px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h3 style={{ marginBottom: 0, fontSize: "20px", fontWeight: "700", color: "#6ccff6" }}>
          🫀 Binaural Generator
        </h3>
        <button
          onClick={toggle}
          style={{
            background: isPlaying
              ? "linear-gradient(180deg, #3a2a17, #230f0f)"
              : "linear-gradient(180deg, #174d6d, #0f3545)",
            color: isPlaying ? "#ff9999" : "#8ef59d",
            border: isPlaying ? "1px solid #8a4a4a" : "1px solid #2a5e7f",
            borderRadius: "12px",
            padding: "10px 18px",
            cursor: "pointer",
            fontWeight: "700",
            fontSize: "13px",
            transition: "all 0.2s ease",
          }}
        >
          {isPlaying ? "⏹ Stop" : "▶ Play"}
        </button>
      </div>
      {/* Controls Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Left Column */}
        <div>
          <div style={{ marginBottom: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  color: "#6ccff6",
                  fontWeight: "700",
                }}
              >
                🎚 Carrier
              </label>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#6ccff6",
                }}
              >
                {leftFreq} Hz
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="500"
              step="5"
              value={leftFreq}
              onChange={(e) => setLeftFreq(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#6ccff6",
                height: "6px",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "#7b8aa0",
                margin: "6px 0 0 0",
              }}
            >
              Base frequency for both ears
            </p>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  color: "#8ef59d",
                  fontWeight: "700",
                }}
              >
                🔊 Volume
              </label>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#8ef59d",
                }}
              >
                {(volume * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.3"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#8ef59d",
                height: "6px",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "#7b8aa0",
                margin: "6px 0 0 0",
              }}
            >
              Output level (0-30%)
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  color: "#ff8f99",
                  fontWeight: "700",
                }}
              >
                🫀 Beat Freq
              </label>
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#ff8f99",
                }}
              >
                {beatFreq.toFixed(1)} Hz
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="40"
              step="0.5"
              value={beatFreq}
              onChange={(e) => setBeatFreq(parseFloat(e.target.value))}
              style={{
                width: "100%",
                accentColor: "#ff8f99",
                height: "6px",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "#7b8aa0",
                margin: "6px 0 0 0",
              }}
            >
              L: {leftFreq} Hz | R: {(leftFreq + beatFreq)} Hz
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OscillatorUnit;
