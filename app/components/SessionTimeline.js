"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { unlockAudioContext } from "./audioContext";
import { timelinePresets } from "./timelinePresets";

const DURATION   = 600; // 10 min in seconds
const ROWS       = 5;
const ROW_H      = 44; // px per row
const MIN_DUR    = 10; // minimum item duration in seconds
const HANDLE_W   = 10; // desktop handle px
const HANDLE_W_T = 32; // touch handle px

const CAT_COLORS = {
  "Chakra Bowls":           "#c084fc",
  "Tibetan Bowls":          "#94a3b8",
  "Singing Bowls":          "#60a5fa",
  "Crystal Bowls & Drones": "#67e8f9",
  "Flutes":                 "#86efac",
  "Tuned Notes":            "#fde68a",
  "Drums & Percussion":     "#f87171",
  "Nature Sounds":          "#4ade80",
  "Shamanic Effects":       "#fb923c",
  "Binaural Beats":         "#8ef59d",
};

const CAT_ICONS = {
  "Chakra Bowls":           "🌈",
  "Tibetan Bowls":          "🏔️",
  "Singing Bowls":          "🎶",
  "Crystal Bowls & Drones": "✨",
  "Flutes":                 "🪶",
  "Tuned Notes":            "🎵",
  "Drums & Percussion":     "🥁",
  "Nature Sounds":          "🌿",
  "Shamanic Effects":       "🔮",
  "Binaural Beats":         "🫀",
};

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function SessionTimeline({ categoryMap, onPlaySounds, onStopSounds, onApplyOscillator }) {
  const [isRunning,   setIsRunning]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [placedItems, setPlacedItems] = useState([]);
  const [nextId,      setNextId]      = useState(1);
  const [activePreset, setActivePreset] = useState(null);
  const nextIdRef = useRef(1);
  const [dragOver,    setDragOver]    = useState(false);
  const [showHelp,    setShowHelp]    = useState(false);
  const [isTouch,     setIsTouch]     = useState(false);

  // Touch drag-from-palette state
  const [paletteDragging, setPaletteDragging] = useState(null); // category string or null
  const [touchPos,        setTouchPos]        = useState({ x: 0, y: 0 });

  const rafRef        = useRef(null);
  const startEpochRef = useRef(null);
  const offsetRef     = useRef(0);
  const prevTimeRef   = useRef(0);
  const placedRef     = useRef([]);
  const activeSounds  = useRef(new Map());
  const timelineRef   = useRef(null);
  const opRef         = useRef(null);
  const paletteDragRef = useRef(null);
  const currentTimeRef = useRef(0);
  const paletteTouchCatRef = useRef(null); // category being finger-dragged

  useEffect(() => { placedRef.current = placedItems; }, [placedItems]);

  // Detect touch device
  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  // Stop sounds when items move out from under playhead
  useEffect(() => {
    const t = currentTimeRef.current;
    activeSounds.current.forEach((sounds, id) => {
      const item = placedItems.find((i) => i.id === id);
      const inside = item && t >= item.time && t < item.time + item.duration;
      if (!inside) {
        onStopSounds(sounds);
        activeSounds.current.delete(id);
      }
    });
  }, [placedItems, onStopSounds]);

  // ── Playback loop ─────────────────────────────────────────────────────────
  const tick = useCallback((now) => {
    const elapsed = (now - startEpochRef.current) / 1000 + offsetRef.current;
    const t       = elapsed % DURATION;
    const prev    = prevTimeRef.current;
    if (t < prev - 1) activeSounds.current.clear();

    placedRef.current.forEach((item) => {
      const end    = item.time + item.duration;
      const id     = item.id;
      const inside = t >= item.time && t < end;
      if (inside && !activeSounds.current.has(id)) {
        const pool   = categoryMap[item.category] || [];
        const count  = Math.min(2, pool.length);
        const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count).map((s) => s.name);
        activeSounds.current.set(id, picked);
        onPlaySounds(picked);
      }
      if (!inside && activeSounds.current.has(id)) {
        onStopSounds(activeSounds.current.get(id));
        activeSounds.current.delete(id);
      }
    });

    prevTimeRef.current    = t;
    currentTimeRef.current = t;
    setCurrentTime(t);
    rafRef.current = requestAnimationFrame(tick);
  }, [categoryMap, onPlaySounds, onStopSounds]);

  useEffect(() => {
    if (!isRunning) { cancelAnimationFrame(rafRef.current); return; }
    startEpochRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (startEpochRef.current !== null) {
        offsetRef.current = ((performance.now() - startEpochRef.current) / 1000 + offsetRef.current) % DURATION;
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePlayPause = async () => {
    if (isRunning) {
      offsetRef.current = (performance.now() - startEpochRef.current) / 1000 % DURATION + offsetRef.current;
      offsetRef.current = offsetRef.current % DURATION;
      setIsRunning(false);
    } else {
      // Unlock the AudioContext inside this real user gesture so that
      // the programmatic btn.click() calls from the RAF tick will work on iOS
      await unlockAudioContext();
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    offsetRef.current   = 0;
    prevTimeRef.current = 0;
    activeSounds.current.clear();
    setCurrentTime(0);
  };

  const loadPreset = (preset) => {
    const items = preset.items.map((it, i) => ({ ...it, id: nextIdRef.current + i }));
    nextIdRef.current += preset.items.length;
    setNextId(nextIdRef.current);
    setPlacedItems(items);
    setActivePreset(preset);
    if (preset.oscillator) onApplyOscillator?.(preset.oscillator);
  };

  // ── Time ↔ pixel helpers ──────────────────────────────────────────────────
  const pxToTime = useCallback((px) => {
    const w = timelineRef.current?.getBoundingClientRect().width || 1;
    return Math.max(0, Math.min(DURATION, (px / w) * DURATION));
  }, []);

  const timeToPct = (t) => `${(t / DURATION) * 100}%`;

  const clientXToTime = useCallback((clientX) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return pxToTime(clientX - rect.left);
  }, [pxToTime]);

  const clientYToRow = useCallback((clientY) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(ROWS - 1, Math.floor((clientY - rect.top) / ROW_H)));
  }, []);

  // ── Mouse move/resize ─────────────────────────────────────────────────────
  const onItemMouseDown = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    opRef.current = { type, id: item.id, startX: e.clientX, startY: e.clientY,
                      startTime: item.time, startDur: item.duration, startRow: item.row };
  };

  const applyOp = useCallback((clientX, clientY, op) => {
    const dt = clientXToTime(clientX) - clientXToTime(op.startX);
    setPlacedItems((prev) => prev.map((item) => {
      if (item.id !== op.id) return item;
      if (op.type === "move") {
        return {
          ...item,
          time: Math.max(0, Math.min(DURATION - item.duration, op.startTime + dt)),
          row:  clientYToRow(clientY),
        };
      }
      if (op.type === "resize-r") {
        return { ...item, duration: Math.max(MIN_DUR, Math.min(DURATION - item.time, op.startDur + dt)) };
      }
      if (op.type === "resize-l") {
        const newTime = Math.max(0, Math.min(op.startTime + op.startDur - MIN_DUR, op.startTime + dt));
        return { ...item, time: newTime, duration: op.startDur - (newTime - op.startTime) };
      }
      return item;
    }));
  }, [clientXToTime, clientYToRow]);

  // Mouse listeners
  useEffect(() => {
    const onMove = (e) => { if (opRef.current) applyOp(e.clientX, e.clientY, opRef.current); };
    const onUp   = () => { opRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [applyOp]);

  // Touch listeners for item move/resize
  useEffect(() => {
    const onTouchMove = (e) => {
      if (!opRef.current) return;
      e.preventDefault();
      const t = e.touches[0];
      applyOp(t.clientX, t.clientY, opRef.current);
    };
    const onTouchEnd = () => { opRef.current = null; };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend",  onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend",  onTouchEnd);
    };
  }, [applyOp]);

  const onItemTouchStart = (e, item, type) => {
    e.stopPropagation();
    const touch = e.touches[0];
    opRef.current = { type, id: item.id, startX: touch.clientX, startY: touch.clientY,
                      startTime: item.time, startDur: item.duration, startRow: item.row };
  };

  // ── Palette HTML5 drag (desktop) ──────────────────────────────────────────
  const onPaletteDragStart = (e, cat) => {
    paletteDragRef.current = cat;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", cat);
  };

  const onTimelineDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onTimelineDragLeave = () => setDragOver(false);

  const onTimelineDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const cat = paletteDragRef.current;
    if (!cat || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const time = pxToTime(e.clientX - rect.left);
    const row  = clientYToRow(e.clientY);
    setPlacedItems((prev) => [...prev, { id: nextIdRef.current, category: cat, time, duration: 60, row }]);
    nextIdRef.current += 1;
    setNextId(nextIdRef.current);
    setActivePreset(null);
    paletteDragRef.current = null;
  };

  // ── Palette touch drag (mobile) ───────────────────────────────────────────
  // We use imperative listeners so we can call preventDefault (passive:false)
  useEffect(() => {
    const handleDocTouchMove = (e) => {
      if (!paletteTouchCatRef.current) return;
      e.preventDefault(); // prevent page scroll while dragging
      const touch = e.touches[0];
      setTouchPos({ x: touch.clientX, y: touch.clientY });

      // Highlight timeline if finger is over it
      const rect = timelineRef.current?.getBoundingClientRect();
      if (rect) {
        const over = touch.clientX >= rect.left && touch.clientX <= rect.right &&
                     touch.clientY >= rect.top  && touch.clientY <= rect.bottom;
        setDragOver(over);
      }
    };
    const handleDocTouchEnd = (e) => {
      if (!paletteTouchCatRef.current) return;
      const touch = e.changedTouches[0];
      const rect  = timelineRef.current?.getBoundingClientRect();
      if (rect &&
          touch.clientX >= rect.left && touch.clientX <= rect.right &&
          touch.clientY >= rect.top  && touch.clientY <= rect.bottom) {
        const time = pxToTime(touch.clientX - rect.left);
        const row  = clientYToRow(touch.clientY);
        setPlacedItems((prev) => [
          ...prev,
          { id: nextIdRef.current, category: paletteTouchCatRef.current, time, duration: 120, row },
        ]);
        nextIdRef.current += 1;
        setNextId(nextIdRef.current);
        setActivePreset(null);
      }
      paletteTouchCatRef.current = null;
      setPaletteDragging(null);
      setDragOver(false);
    };
    document.addEventListener("touchmove", handleDocTouchMove, { passive: false });
    document.addEventListener("touchend",  handleDocTouchEnd);
    return () => {
      document.removeEventListener("touchmove", handleDocTouchMove);
      document.removeEventListener("touchend",  handleDocTouchEnd);
    };
  }, [pxToTime, clientYToRow]); // no nextId dep — use nextIdRef to avoid re-registering listeners

  const onPaletteTouchStart = (e, cat) => {
    paletteTouchCatRef.current = cat;
    setPaletteDragging(cat);
    const touch = e.touches[0];
    setTouchPos({ x: touch.clientX, y: touch.clientY });
  };

  // ── Remove item ───────────────────────────────────────────────────────────
  const removeItem = (e, id) => {
    e.stopPropagation();
    setPlacedItems((prev) => prev.filter((item) => item.id !== id));
    setActivePreset(null);
    if (activeSounds.current.has(id)) {
      onStopSounds(activeSounds.current.get(id));
      activeSounds.current.delete(id);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const headPct  = (currentTime / DURATION) * 100;
  const cats     = Object.keys(categoryMap);
  const handleW  = isTouch ? HANDLE_W_T : HANDLE_W;

  return (
    <div style={{
      background: "linear-gradient(135deg,#111e2a 0%,#0a1219 100%)",
      border: "1.5px solid #2a4a62",
      borderRadius: "20px",
      padding: "20px 16px",
      color: "white",
      userSelect: "none",
      WebkitUserSelect: "none",
    }}>

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: "#6ccff6" }}>
          🎹 Session Timeline
        </h3>

        {/* Help toggle */}
        <button
          onClick={() => setShowHelp((v) => !v)}
          style={{
            background: showHelp ? "rgba(108,207,246,0.15)" : "rgba(108,207,246,0.06)",
            border: "1px solid #2a4a62",
            borderRadius: "50%",
            color: "#6ccff6",
            width: "22px", height: "22px",
            cursor: "pointer", fontSize: "12px", fontWeight: "700",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
          aria-label="Show instructions"
        >?</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#9db1c5", minWidth: "40px", textAlign: "right" }}>
            {fmt(currentTime)}
          </span>
          <button onClick={handlePlayPause} style={{
            background: isRunning ? "linear-gradient(180deg,#3a1f1f,#2a1010)" : "linear-gradient(180deg,#1a4d2a,#0f3018)",
            border: isRunning ? "1px solid #8a4a4a" : "1px solid #3a7a4a",
            borderRadius: "8px", color: isRunning ? "#ff9999" : "#8ef59d",
            padding: "8px 14px", cursor: "pointer", fontWeight: "700", fontSize: "13px",
            WebkitTapHighlightColor: "transparent",
          }}>
            {isRunning ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={handleReset} style={{
            background: "linear-gradient(180deg,#1a2431,#0e1a24)",
            border: "1px solid #334252", borderRadius: "8px",
            color: "#c1c9d6", padding: "8px 12px", cursor: "pointer", fontSize: "13px",
            WebkitTapHighlightColor: "transparent",
          }}>
            ↺
          </button>
        </div>
      </div>

      {/* Instructions panel */}
      {showHelp && (
        <div style={{
          background: "rgba(108,207,246,0.07)",
          border: "1px solid rgba(108,207,246,0.2)",
          borderRadius: "10px",
          padding: "12px 14px",
          marginBottom: "14px",
          fontSize: "12px",
          color: "#9db1c5",
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: "700", color: "#6ccff6", marginBottom: "6px" }}>How to use the timeline</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px" }}>
            {isTouch ? <>
              <span style={{ color: "#6ccff6" }}>☝ Press &amp; drag</span>
              <span>a sound group down onto the timeline grid to place it</span>
              <span style={{ color: "#6ccff6" }}>↔ Drag body</span>
              <span>move a block left/right to change its start time, or up/down to change row</span>
              <span style={{ color: "#6ccff6" }}>‹ › Edge strips</span>
              <span>drag the left/right edge strips to shorten or lengthen a block</span>
              <span style={{ color: "#6ccff6" }}>× Button</span>
              <span>tap × on a block to remove it</span>
              <span style={{ color: "#6ccff6" }}>▶ Play</span>
              <span>the green playhead sweeps across — sounds play when it enters a block</span>
            </> : <>
              <span style={{ color: "#6ccff6" }}>Drag chip</span>
              <span>drag a sound group from the palette onto the timeline grid</span>
              <span style={{ color: "#6ccff6" }}>Drag body</span>
              <span>move a block left/right (time) or up/down (row)</span>
              <span style={{ color: "#6ccff6" }}>Edge handles</span>
              <span>drag the left or right edge to resize a block</span>
              <span style={{ color: "#6ccff6" }}>× Button</span>
              <span>click × to remove a block</span>
              <span style={{ color: "#6ccff6" }}>▶ Play</span>
              <span>the playhead sweeps across the 10-min loop — sounds play when it enters a block</span>
            </>}
          </div>
        </div>
      )}

      {/* Session presets */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", color: "#7b8aa0", marginBottom: "7px" }}>
          Presets · load an arrangement, then press ▶ Play
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {timelinePresets.map((p) => {
            const active = activePreset?.name === p.name;
            return (
              <button
                key={p.name}
                onClick={() => loadPreset(p)}
                title={p.description}
                style={{
                  background: active ? "rgba(142,245,157,0.12)" : "linear-gradient(180deg,#1a2431,#0e1a24)",
                  border: active ? "1px solid #8ef59d" : "1px solid #334252",
                  borderRadius: "8px",
                  color: active ? "#8ef59d" : "#c1c9d6",
                  padding: "7px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "600",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {p.icon} {p.name}
              </button>
            );
          })}
        </div>
        {activePreset && (
          <div style={{ fontSize: "11px", color: "#9db1c5", marginTop: "7px", lineHeight: 1.5 }}>
            {activePreset.icon} {activePreset.description}
          </div>
        )}
      </div>

      {/* Palette */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", color: "#7b8aa0", marginBottom: "7px" }}>
          {isTouch
            ? "Press and drag a group down onto the timeline ↓"
            : "Drag a group onto the timeline ↓ · drag body to move · edge handles to resize"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {cats.map((cat) => (
            <div
              key={cat}
              draggable={!isTouch}
              onDragStart={!isTouch ? (e) => onPaletteDragStart(e, cat) : undefined}
              onTouchStart={isTouch ? (e) => onPaletteTouchStart(e, cat) : undefined}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                background: paletteDragging === cat
                  ? `${CAT_COLORS[cat]}44`
                  : `${CAT_COLORS[cat]}22`,
                border: `1px solid ${CAT_COLORS[cat]}${paletteDragging === cat ? "cc" : "66"}`,
                borderRadius: "20px", padding: "6px 12px",
                cursor: isTouch ? "default" : "grab",
                fontSize: "12px", fontWeight: "600", color: CAT_COLORS[cat],
                transition: "background 0.1s, border-color 0.1s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "none",
              }}
            >
              {CAT_ICONS[cat]} {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Floating ghost while touch-dragging from palette */}
      {paletteDragging && (
        <div style={{
          position: "fixed",
          left: touchPos.x - 60, top: touchPos.y - 18,
          zIndex: 9999,
          background: `${CAT_COLORS[paletteDragging]}33`,
          border: `1.5px solid ${CAT_COLORS[paletteDragging]}99`,
          borderRadius: "12px",
          padding: "5px 12px",
          fontSize: "12px", fontWeight: "700",
          color: CAT_COLORS[paletteDragging],
          pointerEvents: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}>
          {CAT_ICONS[paletteDragging]} {paletteDragging}
        </div>
      )}

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        <div
          ref={timelineRef}
          onDragOver={onTimelineDragOver}
          onDragLeave={onTimelineDragLeave}
          onDrop={onTimelineDrop}
          style={{
            position: "relative",
            height: `${ROW_H * ROWS}px`,
            background: dragOver ? "rgba(108,207,246,0.08)" : "#080f15",
            border: `1.5px solid ${dragOver ? "#6ccff6" : "#1a2e40"}`,
            borderRadius: "8px",
            overflow: "hidden",
            transition: "border-color 0.15s, background 0.15s",
            touchAction: "none",
          }}
        >
          {/* Row separators */}
          {Array.from({ length: ROWS - 1 }, (_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i + 1) * ROW_H}px`, height: "1px",
              background: "rgba(108,207,246,0.08)", pointerEvents: "none",
            }} />
          ))}

          {/* Minute grid lines */}
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{
              position: "absolute", top: 0, bottom: 0,
              left: `${((i + 1) / 10) * 100}%`, width: "1px",
              background: "rgba(108,207,246,0.07)", pointerEvents: "none",
            }} />
          ))}

          {/* Placed items */}
          {placedItems.map((item) => {
            const color = CAT_COLORS[item.category] || "#6ccff6";
            const left  = timeToPct(item.time);
            const width = timeToPct(item.duration);
            const top   = item.row * ROW_H;
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left, width, top: `${top}px`,
                  height: `${ROW_H - 3}px`,
                  background: `${color}28`,
                  border: `1.5px solid ${color}99`,
                  borderRadius: "6px",
                  display: "flex", alignItems: "center",
                  cursor: "grab",
                  overflow: "hidden",
                  boxSizing: "border-box",
                  touchAction: "none",
                }}
                onMouseDown={(e) => onItemMouseDown(e, item, "move")}
                onTouchStart={(e) => onItemTouchStart(e, item, "move")}
              >
                {/* Left resize handle */}
                <div
                  onMouseDown={(e) => { e.stopPropagation(); onItemMouseDown(e, item, "resize-l"); }}
                  onTouchStart={(e) => { e.stopPropagation(); onItemTouchStart(e, item, "resize-l"); }}
                  style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${handleW}px`, cursor: "ew-resize",
                    background: `${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, zIndex: 2,
                    touchAction: "none",
                  }}
                >
                  <div style={{
                    fontSize: isTouch ? "12px" : "9px",
                    color, opacity: 0.9, fontWeight: "700", lineHeight: 1,
                    userSelect: "none",
                  }}>‹</div>
                </div>

                {/* Label */}
                <div style={{
                  flex: 1, textAlign: "center", fontSize: "11px", fontWeight: "700",
                  color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  padding: `0 ${handleW + 4}px`,
                  pointerEvents: "none",
                }}>
                  {CAT_ICONS[item.category]} {item.category}
                </div>

                {/* Remove button */}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={(e) => removeItem(e, item.id)}
                  style={{
                    position: "absolute", top: "1px", right: `${handleW + 2}px`,
                    background: "none", border: "none", color, cursor: "pointer",
                    fontSize: isTouch ? "14px" : "10px",
                    lineHeight: 1, padding: "2px", opacity: 0.75, zIndex: 3,
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                >×</button>

                {/* Right resize handle */}
                <div
                  onMouseDown={(e) => { e.stopPropagation(); onItemMouseDown(e, item, "resize-r"); }}
                  onTouchStart={(e) => { e.stopPropagation(); onItemTouchStart(e, item, "resize-r"); }}
                  style={{
                    position: "absolute", right: 0, top: 0, bottom: 0,
                    width: `${handleW}px`, cursor: "ew-resize",
                    background: `${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, zIndex: 2,
                    touchAction: "none",
                  }}
                >
                  <div style={{
                    fontSize: isTouch ? "12px" : "9px",
                    color, opacity: 0.9, fontWeight: "700", lineHeight: 1,
                    userSelect: "none",
                  }}>›</div>
                </div>
              </div>
            );
          })}

          {/* Playhead */}
          <div style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${headPct}%`, width: "2px",
            background: "#8ef59d",
            boxShadow: "0 0 6px rgba(142,245,157,0.7)",
            pointerEvents: "none", zIndex: 10,
          }} />
        </div>

        {/* Time ruler */}
        <div style={{ position: "relative", height: "18px", marginTop: "4px" }}>
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${(i / 10) * 100}%`,
              transform: i === 10 ? "translateX(-100%)" : i > 0 ? "translateX(-50%)" : "none",
              fontSize: "10px", color: "#3d5c72", whiteSpace: "nowrap",
            }}>
              {fmt(i * 60)}
            </div>
          ))}
        </div>
      </div>

      {placedItems.length === 0 && (
        <p style={{ textAlign: "center", fontSize: "12px", color: "#283c4e", margin: "8px 0 0" }}>
          {isTouch
            ? "Press and drag a group from the palette above onto the timeline"
            : "No groups placed — drag one from the palette above"}
        </p>
      )}
    </div>
  );
}
