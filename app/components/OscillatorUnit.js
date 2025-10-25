"use client";

import React, { useState, useEffect, useRef } from "react";
import { getAudioContext } from "./audioContext";

export default function OscillatorUnit({ id }) {
  const ctx = getAudioContext();
  const oscRef = useRef(null);
  const gainRef = useRef(null);
  const pannerRef = useRef(null);
  const panOscRef = useRef(null);
  const panGainRef = useRef(null);
  const freqLFORef = useRef(null);
  const freqGainRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [baseFreq, setBaseFreq] = useState(30);
  const [freqRange, setFreqRange] = useState(10); // range up/down
  const [freqSpeed, setFreqSpeed] = useState(0.02); // Hz
  const [panSpeed, setPanSpeed] = useState(0.3); // Hz

  // --- START/STOP HANDLER ---
  useEffect(() => {
    if (isPlaying) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      // Pan LFO
      const panOsc = ctx.createOscillator();
      const panGain = ctx.createGain();
      panOsc.frequency.value = panSpeed;
      panGain.gain.value = 1;
      panOsc.connect(panGain).connect(panner.pan);
      panOsc.start();

      // Frequency LFO
      const freqLFO = ctx.createOscillator();
      const freqGain = ctx.createGain();
      freqLFO.frequency.value = freqSpeed;
      freqGain.gain.value = freqRange;
      freqLFO.connect(freqGain).connect(osc.frequency);
      freqLFO.start();

      osc.type = "sine";
      osc.frequency.value = baseFreq;
      gain.gain.value = volume;

      osc.connect(gain).connect(panner).connect(ctx.destination);
      osc.start();

      oscRef.current = osc;
      gainRef.current = gain;
      pannerRef.current = panner;
      panOscRef.current = panOsc;
      panGainRef.current = panGain;
      freqLFORef.current = freqLFO;
      freqGainRef.current = freqGain;
    }

    return () => stopOsc();
  }, [isPlaying]);

  // --- LIVE PARAMETER UPDATES ---
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = volume;
    if (oscRef.current)
      oscRef.current.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    if (panOscRef.current) panOscRef.current.frequency.value = panSpeed;
    if (freqLFORef.current) freqLFORef.current.frequency.value = freqSpeed;
    if (freqGainRef.current) freqGainRef.current.gain.value = freqRange;
  }, [volume, baseFreq, panSpeed, freqSpeed, freqRange]);

  const stopOsc = () => {
    [oscRef, panOscRef, freqLFORef].forEach((ref) => {
      try {
        ref.current?.stop();
      } catch {}
    });
  };

  const toggle = () => setIsPlaying((prev) => !prev);

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #142b3d, #0f1e2a)",
        border: "1px solid #264b64",
        borderRadius: "12px",
        padding: "16px",
        color: "white",
        textAlign: "center",
      }}
    >
      <h3>Oscillator {id}</h3>
      <button
        onClick={toggle}
        style={{
          background: isPlaying ? "#a33" : "#174d6d",
          color: "white",
          border: "none",
          borderRadius: "8px",
          padding: "8px 16px",
          marginBottom: "10px",
          cursor: "pointer",
        }}
      >
        {isPlaying ? "Stop" : "Play"}
      </button>

      <div>
        <label>🔊 Volume: {volume.toFixed(2)}</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
        />
      </div>

      <div>
        <label>🎚 Base Freq: {baseFreq} Hz</label>
        <input
          type="range"
          min="10"
          max="200"
          step="5"
          value={baseFreq}
          onChange={(e) => setBaseFreq(parseFloat(e.target.value))}
        />
      </div>

      <div>
        <label>🌊 Freq Range: ±{freqRange} Hz</label>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={freqRange}
          onChange={(e) => setFreqRange(parseFloat(e.target.value))}
        />
      </div>

      <div>
        <label>⚡ Freq Speed: {freqSpeed.toFixed(2)} Hz</label>
        <input
          type="range"
          min="0.002"
          max="5"
          step="0.02"
          value={freqSpeed}
          onChange={(e) => setFreqSpeed(parseFloat(e.target.value))}
        />
      </div>

      <div>
        <label>🔁 Pan Speed: {panSpeed.toFixed(2)} Hz</label>
        <input
          type="range"
          min="0.05"
          max="3"
          step="0.05"
          value={panSpeed}
          onChange={(e) => setPanSpeed(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}
