"use client";

import React, { useState, useRef, useEffect } from "react";
import { getAudioContext } from "./audioContext";

export default function Pad({ name, url, listView = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const [loop, setLoop] = useState(true);
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
  const fadeIntervalRef = useRef(null);
  const targetVolumeRef = useRef(0.4);
  const canvasRef = useRef(null);

  const startFadeTracking = (durationMs) => {
    clearInterval(fadeIntervalRef.current);
    const end = Date.now() + durationMs;
    fadeIntervalRef.current = setInterval(() => {
      if (gainNodeRef.current) {
        setVolume(gainNodeRef.current.gain.value);
      }
      if (Date.now() >= end) {
        clearInterval(fadeIntervalRef.current);
        if (gainNodeRef.current) setVolume(gainNodeRef.current.gain.value);
      }
    }, 100);
  };

  // -------- PLAYBACK --------
  const handleTogglePlay = async () => {
    const ctx = getAudioContext();

    // Ensure the audio context is resumed (required for user gesture)
    if (ctx.state === "suspended") await ctx.resume();

    // --- STOP if already playing ---
    if (isPlaying && sourceRef.current) {
      // Fade out over 10 seconds then stop
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
        gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, ctx.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 10);
        startFadeTracking(10000);
      }
      const src = sourceRef.current;
      setTimeout(() => {
        try { src.stop(); } catch (_) {}
      }, 10000);
      pausedAtRef.current = ctx.currentTime - startTimeRef.current;
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true); // show "Stop" immediately

    // --- SETUP NODES ---
    if (!gainNodeRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 0;
      gain.connect(ctx.destination);
      gainNodeRef.current = gain;
    } else {
      gainNodeRef.current.gain.cancelScheduledValues(ctx.currentTime);
      gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
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

      // Fade in over 10 seconds
      targetVolumeRef.current = volume;
      gainNodeRef.current.gain.linearRampToValueAtTime(volume, ctx.currentTime + 10);
      startFadeTracking(10000);

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
    clearInterval(fadeIntervalRef.current);
    targetVolumeRef.current = newVol;
    setVolume(newVol);
    if (gainNodeRef.current) {
      const actx = getAudioContext();
      gainNodeRef.current.gain.cancelScheduledValues(actx.currentTime);
      gainNodeRef.current.gain.setValueAtTime(newVol, actx.currentTime);
    }
  };

  // Revised handleScrub function
  const handleScrub = async (e) => {
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
      clearInterval(fadeIntervalRef.current);
      if (sourceRef.current) sourceRef.current.stop();
    };
  }, []);

  // -------- UI --------

  // LIST VIEW - Compact single line
  if (listView) {
    return (
      <div
        style={{
          background: isPlaying
            ? "linear-gradient(180deg, #1a3a42, #0f2530)"
            : "linear-gradient(180deg, #121922, #0c121a)",
          border: isPlaying ? "1.5px solid #6ccff6" : "1px solid #233142",
          borderRadius: "12px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "#edf2f7",
          transition: "all 0.2s ease",
          minHeight: "44px",
        }}
      >
        {/* Name */}
        <div
          style={{
            flex: "0 0 180px",
            fontSize: "14px",
            fontWeight: "600",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {isPlaying && <span style={{ color: "#6ccff6" }}>🔵 </span>}
          {name}
        </div>

        {/* Play / Stop */}
        <button
          data-stop-button
          data-pad-name={name}
          onClick={handleTogglePlay}
          style={{
            background: isPlaying
              ? "linear-gradient(180deg, #5a2a2a, #3a1717)"
              : "linear-gradient(180deg, #1a4d6d, #0f3545)",
            border: isPlaying ? "1px solid #8a4a4a" : "1px solid #2a5e7f",
            borderRadius: "8px",
            color: isPlaying ? "#ff9999" : "#6ccff6",
            padding: "6px 12px",
            cursor: "pointer",
            fontWeight: "600",
            fontSize: "12px",
            transition: "all 0.2s ease",
            flex: "0 0 auto",
          }}
        >
          {isPlaying ? "⏹" : "▶"}
        </button>

        {/* Loop Toggle */}
        <button
          onClick={handleToggleLoop}
          style={{
            background: loop
              ? "linear-gradient(180deg, #2b472e, #18331a)"
              : "linear-gradient(180deg, #182431, #0e1a24)",
            border: "1px solid #365e43",
            borderRadius: "8px",
            color: loop ? "#8ef59d" : "#c1c9d6",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "12px",
            flex: "0 0 auto",
          }}
        >
          {loop ? "🔁" : "↻"}
        </button>

        {/* Low-Pass Toggle */}
        <button
          onClick={handleToggleLowPass}
          style={{
            background: lowPassEnabled
              ? "linear-gradient(180deg, #293846, #1a2430)"
              : "linear-gradient(180deg, #1b2026, #0d141b)",
            border: "1px solid #334252",
            borderRadius: "8px",
            color: lowPassEnabled ? "#6ccff6" : "#c1c9d6",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: "12px",
            flex: "0 0 auto",
          }}
        >
          {lowPassEnabled ? "🌫" : "🎧"}
        </button>

        {/* Volume Control */}
        <div style={{ flex: "0 0 120px", display: "flex", gap: "6px", alignItems: "center" }}>
          <label style={{ fontSize: "11px", color: "#7b8aa0", flex: "0 0 auto" }}>
            Vol:
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
            style={{ flex: "1", accentColor: "#6ccff6", height: "4px" }}
          />
          <span style={{ fontSize: "11px", color: "#7b8aa0", flex: "0 0 20px", textAlign: "right" }}>
            {(volume * 100).toFixed(0)}
          </span>
        </div>

        {/* Timeline */}
        <div style={{ flex: "1", display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={currentTime}
            onChange={handleScrub}
            style={{ flex: "1", accentColor: "#6ccff6", height: "4px" }}
          />
          <span style={{ fontSize: "11px", color: "#9db1c5", flex: "0 0 auto", minWidth: "30px" }}>
            {formatTime(currentTime)}
          </span>
        </div>

        {/* Low-Pass Frequency */}
        {lowPassEnabled && (
          <div style={{ flex: "0 0 120px", display: "flex", gap: "6px", alignItems: "center" }}>
            <label style={{ fontSize: "11px", color: "#6ccff6", flex: "0 0 auto" }}>Hz:</label>
            <input
              type="range"
              min="200"
              max="20000"
              step="100"
              value={lowPassFreq}
              onChange={handleLowPassFreqChange}
              style={{ flex: "1", accentColor: "#6ccff6", height: "4px" }}
            />
            <span style={{ fontSize: "11px", color: "#6ccff6", flex: "0 0 30px", textAlign: "right" }}>
              {(lowPassFreq / 1000).toFixed(1)}k
            </span>
          </div>
        )}
      </div>
    );
  }

  // GRID VIEW - Card layout
  return (
    <div
      style={{
        background: isPlaying
          ? "linear-gradient(180deg, #1a3a42, #0f2530)"
          : "linear-gradient(180deg, #121922, #0c121a)",
        border: isPlaying ? "1.5px solid #6ccff6" : "1px solid #233142",
        borderRadius: "22px",
        padding: "20px",
        boxShadow: isPlaying
          ? "0 10px 40px rgba(108,207,246,.15), 0 0 20px rgba(108,207,246,.1)"
          : "0 10px 30px rgba(0,0,0,.25)",
        textAlign: "center",
        color: "#edf2f7",
        transition: "all 0.2s ease",
      }}
    >
      <h3 style={{ marginBottom: "10px", fontWeight: "600", fontSize: "16px" }}>
        {isPlaying && <span style={{ color: "#6ccff6" }}>🔵 </span>}
        {name}
      </h3>

      {/* Play / Stop */}
      <button
        data-stop-button
        data-pad-name={name}
        onClick={handleTogglePlay}
        style={{
          background: isPlaying
            ? "linear-gradient(180deg, #5a2a2a, #3a1717)"
            : "linear-gradient(180deg, #1a4d6d, #0f3545)",
          border: isPlaying ? "1px solid #8a4a4a" : "1px solid #2a5e7f",
          borderRadius: "12px",
          color: isPlaying ? "#ff9999" : "#6ccff6",
          padding: "12px 18px",
          cursor: "pointer",
          marginBottom: "12px",
          fontWeight: "600",
          fontSize: "14px",
          transition: "all 0.2s ease",
          width: "100%",
        }}
        onMouseEnter={(e) => {
          if (!isPlaying) {
            e.target.style.background = "linear-gradient(180deg, #1f5a7a, #0f3f55)";
            e.target.style.borderColor = "#6ccff6";
          }
        }}
        onMouseLeave={(e) => {
          if (!isPlaying) {
            e.target.style.background = "linear-gradient(180deg, #1a4d6d, #0f3545)";
            e.target.style.borderColor = "#2a5e7f";
          }
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
