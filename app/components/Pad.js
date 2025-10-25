"use client";

import React, { useState, useRef, useEffect } from "react";
import { getAudioContext } from "./audioContext";

export default function Pad({ name, url }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [loop, setLoop] = useState(false);
  const [lowPassEnabled, setLowPassEnabled] = useState(false);
  const [lowPassFreq, setLowPassFreq] = useState(5000); // Hz
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const ctx = getAudioContext();
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const filterRef = useRef(null);
  const bufferRef = useRef(null);
  const startTimeRef = useRef(0);
  const pausedAtRef = useRef(0);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  // -------- PLAYBACK --------
  const handleTogglePlay = async () => {
    const ctx = getAudioContext();

    // Ensure the audio context is resumed (required for user gesture)
    if (ctx.state === "suspended") await ctx.resume();

    // --- STOP if already playing ---
    if (isPlaying && sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (_) {}
      pausedAtRef.current = ctx.currentTime - startTimeRef.current;
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true); // show "Stop" immediately

    // --- SETUP NODES ---
    if (!gainNodeRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
    }

    // Always rebuild the filter node
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowPassEnabled ? lowPassFreq : 22050;
    filterRef.current = filter;

    try {
      // --- LOAD AND DECODE ---
      if (!bufferRef.current) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        bufferRef.current = await ctx.decodeAudioData(arrayBuffer);
      }

      const buffer = bufferRef.current;
      setDuration(buffer.duration);

      // --- CREATE SOURCE ---
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = loop;
      source.connect(filter);
      filter.connect(gainNodeRef.current);
      sourceRef.current = source;

      // --- START PLAYBACK ---
      const offset = pausedAtRef.current;
      startTimeRef.current = ctx.currentTime - offset;
      source.start(0, offset);

      // --- TIMELINE SYNC ---
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const elapsed = ctx.currentTime - startTimeRef.current;
        const position = loop
          ? elapsed % buffer.duration
          : Math.min(elapsed, buffer.duration);

        setCurrentTime(position);

        // Auto-stop if finished and not looping
        if (!loop && position >= buffer.duration) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          pausedAtRef.current = 0;
          setCurrentTime(0);
        }
      }, 100);

      // --- HANDLE END EVENT ---
      source.onended = () => {
        clearInterval(intervalRef.current);
        if (!loop) {
          setIsPlaying(false);
          pausedAtRef.current = 0;
          setCurrentTime(0);
        }
      };
    } catch (err) {
      console.error("Playback error:", err);
      setIsPlaying(false);
      clearInterval(intervalRef.current);
    }
  };

  // -------- CONTROLS --------
  const handleVolumeChange = (e) => {
    const newVol = e.target.value / 100;
    setVolume(newVol);
    if (gainNodeRef.current)
      gainNodeRef.current.gain.setValueAtTime(newVol, ctx.currentTime);
  };

  // Revised handleScrub function
  const handleScrub = async (e) => {
    const ctx = getAudioContext();
    const newTime = parseFloat(e.target.value);
    const wasPlaying = isPlaying;

    // 1. If currently playing, stop it and clear the interval
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (_) {}
      clearInterval(intervalRef.current);
      sourceRef.current = null;
    }

    // 2. Set the new scrub position and update state
    pausedAtRef.current = newTime;
    setCurrentTime(newTime);

    // 3. If it was playing before, restart playback from the new point
    if (wasPlaying) {
      // This will start playback and correctly set startTimeRef.current
      // handleTogglePlay already uses pausedAtRef.current
      await handleTogglePlay();
    }
  };

  const handleToggleLoop = () => setLoop((p) => !p);
  const handleToggleLowPass = () => setLowPassEnabled((p) => !p);
  const handleLowPassFreqChange = (e) => {
    const freq = parseFloat(e.target.value);
    setLowPassFreq(freq);
    if (filterRef.current) filterRef.current.frequency.value = freq;
  };

  const formatTime = (t) => {
    if (!t) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // -------- VISUALIZER (LOW-PASS CURVE) --------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx2d.clearRect(0, 0, width, height);
    ctx2d.strokeStyle = "#6ccff6";
    ctx2d.lineWidth = 2;

    const f0 = lowPassEnabled ? lowPassFreq : 22050;
    ctx2d.beginPath();
    for (let x = 0; x < width; x++) {
      const freq = 20 * Math.pow(22050 / 20, x / width);
      // draw approximate low-pass response curve
      const y =
        (Math.atan((Math.log10(freq) - Math.log10(f0)) * 3) + Math.PI / 2) *
        (height / Math.PI);
      if (x === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();
  }, [lowPassEnabled, lowPassFreq]);

  useEffect(() => {
    return () => {
      clearInterval(intervalRef.current);
      if (sourceRef.current) sourceRef.current.stop();
    };
  }, []);

  // -------- UI --------
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #121922, #0c121a)",
        border: "1px solid #233142",
        borderRadius: "22px",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,.25)",
        textAlign: "center",
        color: "#edf2f7",
      }}
    >
      <h3 style={{ marginBottom: "10px", fontWeight: "600" }}>{name}</h3>

      {/* Play / Stop */}
      <button
        onClick={handleTogglePlay}
        style={{
          background: isPlaying
            ? "linear-gradient(180deg, #3a1717, #230f0f)"
            : "linear-gradient(180deg, #17354a, #0f2635)",
          border: "1px solid #2a5e7f",
          borderRadius: "14px",
          color: "white",
          padding: "10px 16px",
          cursor: "pointer",
          marginBottom: "10px",
        }}
      >
        {isPlaying ? "⏹ Stop" : "▶ Play"}
      </button>

      {/* Loop */}
      <button
        onClick={handleToggleLoop}
        style={{
          background: loop
            ? "linear-gradient(180deg, #2b472e, #18331a)"
            : "linear-gradient(180deg, #182431, #0e1a24)",
          border: "1px solid #365e43",
          borderRadius: "12px",
          color: loop ? "#8ef59d" : "#c1c9d6",
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: "13px",
          marginLeft: "8px",
        }}
      >
        {loop ? "🔁 Loop On" : "↻ Loop Off"}
      </button>

      {/* Low-Pass Toggle */}
      <button
        onClick={handleToggleLowPass}
        style={{
          background: lowPassEnabled
            ? "linear-gradient(180deg, #293846, #1a2430)"
            : "linear-gradient(180deg, #1b2026, #0d141b)",
          border: "1px solid #334252",
          borderRadius: "12px",
          color: lowPassEnabled ? "#6ccff6" : "#c1c9d6",
          padding: "6px 12px",
          cursor: "pointer",
          fontSize: "13px",
          marginLeft: "8px",
        }}
      >
        {lowPassEnabled ? "🌫 Low-Pass On" : "🎧 Low-Pass Off"}
      </button>

      {/* Timeline */}
      <div style={{ marginTop: "12px", marginBottom: "10px" }}>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={currentTime}
          onChange={handleScrub}
          style={{ width: "100%", accentColor: "#6ccff6", marginBottom: "6px" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "12px",
            color: "#9db1c5",
          }}
        >
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div style={{ marginBottom: "8px" }}>
        <label style={{ fontSize: "13px", color: "#7b8aa0" }}>
          Vol: {(volume * 100).toFixed(0)}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={handleVolumeChange}
          style={{ width: "100%", marginTop: "6px", accentColor: "#6ccff6" }}
        />
      </div>

      {/* Low-Pass Frequency */}
      {lowPassEnabled && (
        <div style={{ marginBottom: "8px" }}>
          <label style={{ fontSize: "13px", color: "#6ccff6" }}>
            Cut Hz: {lowPassFreq.toFixed(0)}
          </label>
          <input
            type="range"
            min="200"
            max="20000"
            step="100"
            value={lowPassFreq}
            onChange={handleLowPassFreqChange}
            style={{ width: "100%", marginTop: "6px", accentColor: "#6ccff6" }}
          />
          <canvas
            ref={canvasRef}
            width={220}
            height={60}
            style={{
              display: "block",
              margin: "10px auto 0",
              background: "#0c121a",
              borderRadius: "8px",
            }}
          />
        </div>
      )}
    </div>
  );
}
