"use client";

import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { getAudioContext } from "./audioContext";
import { forwardRef } from "react";

const DualRange = ({ min, max, step, value, onChange, color }) => {
  const [lo, hi] = value;
  const btnStyle = {
    width: "28px", height: "28px", borderRadius: "6px", border: `1px solid ${color}44`,
    background: "rgba(0,0,0,.3)", color, fontSize: "16px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    lineHeight: 1,
  };
  const valStyle = {
    width: "52px", textAlign: "center", fontSize: "13px", fontWeight: "700",
    color, background: "rgba(0,0,0,.3)", border: `1px solid ${color}44`,
    borderRadius: "6px", padding: "4px 0",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10px", color: "#7b8aa0", width: "24px", flexShrink: 0 }}>Min</span>
        <button type="button" style={btnStyle} onClick={() => { if (lo - step >= min) onChange([lo - step, hi]); }}>−</button>
        <input type="number" min={min} max={hi - step} step={step} value={lo}
          onChange={(e) => { const v = parseFloat(e.target.value); if (v >= min && v < hi) onChange([v, hi]); }}
          style={valStyle}
        />
        <button type="button" style={btnStyle} onClick={() => { if (lo + step < hi) onChange([lo + step, hi]); }}>+</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "10px", color: "#7b8aa0", width: "24px", flexShrink: 0 }}>Max</span>
        <button type="button" style={btnStyle} onClick={() => { if (hi - step > lo) onChange([lo, hi - step]); }}>−</button>
        <input type="number" min={lo + step} max={max} step={step} value={hi}
          onChange={(e) => { const v = parseFloat(e.target.value); if (v <= max && v > lo) onChange([lo, v]); }}
          style={valStyle}
        />
        <button type="button" style={btnStyle} onClick={() => { if (hi + step <= max) onChange([lo, hi + step]); }}>+</button>
      </div>
    </div>
  );
};

const Switch = ({ label, active, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!active)}
    style={{ display: "flex", alignItems: "center", gap: "10px", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}
  >
    <div style={{
      width: "44px", height: "24px", borderRadius: "12px",
      background: active ? "#2a7a4f" : "#1a3a52",
      border: active ? "1.5px solid #8ef59d" : "1.5px solid #2a5e7f",
      position: "relative", transition: "all 0.2s ease", flexShrink: 0,
    }}>
      <div style={{
        width: "18px", height: "18px", borderRadius: "50%",
        background: active ? "#8ef59d" : "#4a6a82",
        position: "absolute", top: "2px", left: active ? "22px" : "2px",
        transition: "all 0.2s ease",
        boxShadow: active ? "0 0 6px rgba(142,245,157,.5)" : "none",
      }} />
    </div>
    <span style={{ fontSize: "13px", color: active ? "#8ef59d" : "#7b8aa0", fontWeight: "600" }}>{label}</span>
  </button>
);

const OscillatorUnit = forwardRef(function OscillatorUnit({ id, initialFreq }, ref) {
  const ctx = getAudioContext();
  const oscLeftRef = useRef(null);
  const oscRightRef = useRef(null);
  const masterGainRef = useRef(null);
  const mergerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.15);

  // Sweep ranges [min, max] — min is the fixed frequency when sweep is off
  const [carrierRange, setCarrierRange] = useState([100, 140]);
  const [beatRange, setBeatRange] = useState([10, 20]);

  // Sweep switches
  const [carrierSweep, setCarrierSweep] = useState(false);
  const [beatSweep, setBeatSweep] = useState(false);

  // Sweep speeds
  const [carrierSpeed, setCarrierSpeed] = useState(0.3);
  const [beatSpeed, setBeatSpeed] = useState(0.15);

  // Live display values
  const [displayCarrier, setDisplayCarrier] = useState(100);
  const [displayBeat, setDisplayBeat] = useState(10);

  // Refs for sweep interval (avoid stale closures)
  const carrierRangeRef = useRef([100, 140]);
  const beatRangeRef = useRef([10, 20]);
  const carrierSpeedRef = useRef(0.3);
  const beatSpeedRef = useRef(0.15);
  // Current sweep values and directions (bounce between min/max)
  const carrierValRef = useRef(null);
  const carrierDirRef = useRef(1);
  const beatValRef = useRef(null);
  const beatDirRef = useRef(1);
  const sweepTickRef = useRef(null);

  useEffect(() => { carrierRangeRef.current = carrierRange; }, [carrierRange]);
  useEffect(() => { beatRangeRef.current = beatRange; }, [beatRange]);
  useEffect(() => { carrierSpeedRef.current = carrierSpeed; }, [carrierSpeed]);
  useEffect(() => { beatSpeedRef.current = beatSpeed; }, [beatSpeed]);


  // --- SWEEP INTERVAL ---
  useEffect(() => {
    clearInterval(sweepTickRef.current);

    if (!carrierSweep && !beatSweep) {
      setDisplayCarrier(carrierRangeRef.current[0]);
      setDisplayBeat(beatRangeRef.current[0]);
      return;
    }

    sweepTickRef.current = setInterval(() => {
      // Carrier: bounce current value between min and max
      if (carrierSweep) {
        if (carrierValRef.current === null) carrierValRef.current = carrierRangeRef.current[0];
        const cPos = (carrierValRef.current - carrierRangeRef.current[0]) / (carrierRangeRef.current[1] - carrierRangeRef.current[0]);
        const cTide = Math.sin(cPos * Math.PI) * 0.95 + 0.05; // slow at edges, fast in middle
        const cJitter = 1 + (Math.random() - 0.5) * 0.3;
        carrierValRef.current += carrierDirRef.current * carrierSpeedRef.current * cTide * cJitter;
        if (carrierValRef.current >= carrierRangeRef.current[1]) {
          carrierValRef.current = carrierRangeRef.current[1];
          carrierDirRef.current = -1;
        } else if (carrierValRef.current <= carrierRangeRef.current[0]) {
          carrierValRef.current = carrierRangeRef.current[0];
          carrierDirRef.current = 1;
        }
      }
      // Beat: bounce current value between min and max
      if (beatSweep) {
        if (beatValRef.current === null) beatValRef.current = beatRangeRef.current[0];
        const bPos = (beatValRef.current - beatRangeRef.current[0]) / (beatRangeRef.current[1] - beatRangeRef.current[0]);
        const bTide = Math.sin(bPos * Math.PI) * 0.95 + 0.05;
        const bJitter = 1 + (Math.random() - 0.5) * 0.3;
        beatValRef.current += beatDirRef.current * beatSpeedRef.current * bTide * bJitter;
        if (beatValRef.current >= beatRangeRef.current[1]) {
          beatValRef.current = beatRangeRef.current[1];
          beatDirRef.current = -1;
        } else if (beatValRef.current <= beatRangeRef.current[0]) {
          beatValRef.current = beatRangeRef.current[0];
          beatDirRef.current = 1;
        }
      }
      const carrierVal = carrierSweep ? carrierValRef.current : carrierRangeRef.current[0];
      const beatVal = beatSweep ? beatValRef.current : beatRangeRef.current[0];

      if (oscLeftRef.current) oscLeftRef.current.frequency.value = carrierVal;
      if (oscRightRef.current) oscRightRef.current.frequency.value = carrierVal + beatVal;
      if (carrierSweep) setDisplayCarrier(Math.round(carrierVal));
      if (beatSweep) setDisplayBeat(parseFloat(beatVal.toFixed(1)));
    }, 100);

    return () => clearInterval(sweepTickRef.current);
  }, [carrierSweep, beatSweep]);

  // --- START/STOP HANDLER ---
  useEffect(() => {
    if (isPlaying) {
      const masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);

      const merger = ctx.createChannelMerger(2);
      merger.connect(masterGain);

      const oscLeft = ctx.createOscillator();
      const gainLeft = ctx.createGain();
      oscLeft.type = "sine";
      oscLeft.frequency.value = carrierRange[0];
      gainLeft.gain.value = 1;
      oscLeft.connect(gainLeft).connect(merger, 0, 0);
      oscLeft.start();

      const oscRight = ctx.createOscillator();
      const gainRight = ctx.createGain();
      oscRight.type = "sine";
      oscRight.frequency.value = carrierRange[0] + beatRange[0];
      gainRight.gain.value = 1;
      oscRight.connect(gainRight).connect(merger, 0, 1);
      oscRight.start();

      oscLeftRef.current = oscLeft;
      oscRightRef.current = oscRight;
      masterGainRef.current = masterGain;
      mergerRef.current = merger;
    }

    return () => {
      [oscLeftRef, oscRightRef].forEach((r) => { try { r.current?.stop(); } catch {} });
    };
  }, [isPlaying]);

  // Volume live update
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume;
  }, [volume]);

  const toggle = () => setIsPlaying((prev) => !prev);

  const setParams = (params) => {
    if (params.carrierFreq !== undefined) {
      setCarrierRange((r) => [params.carrierFreq, Math.max(params.carrierFreq + 10, r[1])]);
    }
    if (params.beatFreq !== undefined) {
      setBeatRange((r) => [params.beatFreq, Math.max(params.beatFreq + 5, r[1])]);
    }
    if (params.volume !== undefined) setVolume(params.volume);
    if (!isPlaying) setIsPlaying(true);
  };

  useImperativeHandle(ref, () => ({ setParams }));

  return (
    <div
      style={{
        background: isPlaying ? "linear-gradient(135deg, #1a3f52 0%, #0f2a38 100%)" : "linear-gradient(135deg, #1a2f42 0%, #0f1e2a 100%)",
        border: isPlaying ? "2px solid #8ef59d" : "1.5px solid #2a5e7f",
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
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#6ccff6" }}>🫀 Binaural Generator</h3>
          <div style={{ fontSize: "12px", color: "#7b8aa0", marginTop: "4px" }}>
            L: <span style={{ color: "#6ccff6" }}>{displayCarrier} Hz</span>
            &nbsp;|&nbsp;
            R: <span style={{ color: "#ff8f99" }}>{(displayCarrier + displayBeat).toFixed(1)} Hz</span>
            &nbsp;|&nbsp;Δ <span style={{ color: "#ffc857" }}>{displayBeat.toFixed(1)} Hz</span>
          </div>
        </div>
        <button
          onClick={toggle}
          style={{
            background: isPlaying ? "linear-gradient(180deg, #3a2a17, #230f0f)" : "linear-gradient(180deg, #174d6d, #0f3545)",
            color: isPlaying ? "#ff9999" : "#8ef59d",
            border: isPlaying ? "1px solid #8a4a4a" : "1px solid #2a5e7f",
            borderRadius: "12px", padding: "10px 18px", cursor: "pointer",
            fontWeight: "700", fontSize: "13px", transition: "all 0.2s ease",
          }}
        >
          {isPlaying ? "⏹ Stop" : "▶ Play"}
        </button>
      </div>

      {/* Main layout: vertical volume on left, sweep panels stacked on right */}
      <div style={{ display: "flex", gap: "16px", alignItems: "stretch" }}>

        {/* Vertical Volume */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
          padding: "14px 10px", background: "rgba(0,0,0,.2)", borderRadius: "10px", flexShrink: 0,
        }}>
          <span style={{ fontSize: "13px", color: "#8ef59d", fontWeight: "700" }}>{(volume * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="0.3" step="0.01" value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            style={{ writingMode: "vertical-lr", direction: "rtl", height: "140px", accentColor: "#8ef59d" }}
          />
          <label style={{ fontSize: "11px", color: "#8ef59d", fontWeight: "700" }}>Vol</label>
        </div>

        {/* Sweep panels stacked */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Carrier Sweep */}
          <div style={{ padding: "14px", background: "rgba(0,0,0,.2)", borderRadius: "10px" }}>
            <Switch label="Carrier Sweep" active={carrierSweep} onChange={setCarrierSweep} />
            <div style={{ marginTop: "10px" }}>
              <DualRange min={20} max={500} step={1} value={carrierRange} onChange={setCarrierRange} color="#6ccff6" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                <span style={{ fontSize: "11px", color: "#7b8aa0" }}>Speed</span>
                <span style={{ fontSize: "11px", color: "#6ccff6" }}>{carrierSpeed.toFixed(2)}</span>
              </div>
              <input type="range" min="0.02" max="2" step="0.02" value={carrierSpeed}
                onChange={(e) => setCarrierSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#6ccff6", cursor: "pointer" }}
              />
            </div>
          </div>

          {/* Beat Sweep */}
          <div style={{ padding: "14px", background: "rgba(0,0,0,.2)", borderRadius: "10px" }}>
            <Switch label="Beat Sweep" active={beatSweep} onChange={setBeatSweep} />
            <div style={{ marginTop: "10px" }}>
              <DualRange min={1} max={40} step={1} value={beatRange} onChange={setBeatRange} color="#ff8f99" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
                <span style={{ fontSize: "11px", color: "#7b8aa0" }}>Speed</span>
                <span style={{ fontSize: "11px", color: "#ff8f99" }}>{beatSpeed.toFixed(2)}</span>
              </div>
              <input type="range" min="0.02" max="2" step="0.02" value={beatSpeed}
                onChange={(e) => setBeatSpeed(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "#ff8f99", cursor: "pointer" }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

export default OscillatorUnit;
