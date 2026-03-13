"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";

const DURATION    = 600; // 10 min in seconds
const ROWS        = 5;
const ROW_H       = 40; // px per row
const MIN_DUR     = 5;  // minimum item duration in seconds
const HANDLE_W    = 8;  // px width of resize handles

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

export default function SessionTimeline({ categoryMap, onPlaySounds, onStopSounds }) {
  const [isRunning,   setIsRunning]   = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [placedItems, setPlacedItems] = useState([]); // {id, category, time, duration, row}
  const [nextId,      setNextId]      = useState(1);
  const [dragOver,    setDragOver]    = useState(false);

  // Refs
  const rafRef         = useRef(null);
  const startEpochRef  = useRef(null);
  const offsetRef      = useRef(0);
  const prevTimeRef    = useRef(0);
  const placedRef      = useRef([]);          // mirror of placedItems for RAF
  const activeSounds   = useRef(new Map());   // itemId → [soundNames]
  const timelineRef    = useRef(null);

  // Drag/resize op state (mouse-based, not HTML5)
  const opRef = useRef(null);
  // { type: 'move'|'resize-l'|'resize-r', id, startX, startTime, startDur, startRow }

  // Palette HTML5 drag data
  const paletteDragRef = useRef(null);

  const currentTimeRef = useRef(0);

  useEffect(() => { placedRef.current = placedItems; }, [placedItems]);

  // When items are moved/resized, stop any active sounds that are no longer under the playhead
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

  // ── Playback loop ────────────────────────────────────────────────────────────
  const tick = useCallback((now) => {
    const elapsed  = (now - startEpochRef.current) / 1000 + offsetRef.current;
    const t        = elapsed % DURATION;
    const prev     = prevTimeRef.current;
    if (t < prev - 1) activeSounds.current.clear(); // loop boundary — re-evaluate on next tick

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

    prevTimeRef.current  = t;
    currentTimeRef.current = t;
    setCurrentTime(t);
    rafRef.current = requestAnimationFrame(tick);
  }, [categoryMap, onPlaySounds, onStopSounds]);

  useEffect(() => {
    if (!isRunning) { cancelAnimationFrame(rafRef.current); return; }
    startEpochRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      // Save current position before cancelling so restarts don't jump to 0
      if (startEpochRef.current !== null) {
        offsetRef.current = ((performance.now() - startEpochRef.current) / 1000 + offsetRef.current) % DURATION;
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [isRunning, tick]);

  // ── Controls ─────────────────────────────────────────────────────────────────
  const handlePlayPause = () => {
    if (isRunning) {
      offsetRef.current = (performance.now() - startEpochRef.current) / 1000 % DURATION + offsetRef.current;
      offsetRef.current = offsetRef.current % DURATION;
      setIsRunning(false);
    } else {
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

  // ── Time ↔ pixel helpers ─────────────────────────────────────────────────────
  const pxToTime  = useCallback((px) => {
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

  // ── Mouse-based move / resize ────────────────────────────────────────────────
  const onItemMouseDown = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    opRef.current = { type, id: item.id, startX: e.clientX, startY: e.clientY,
                      startTime: item.time, startDur: item.duration, startRow: item.row };
  };

  useEffect(() => {
    const onMove = (e) => {
      const op = opRef.current;
      if (!op) return;
      const dt = clientXToTime(e.clientX) - clientXToTime(op.startX);
      setPlacedItems((prev) => prev.map((item) => {
        if (item.id !== op.id) return item;
        if (op.type === "move") {
          const newTime = Math.max(0, Math.min(DURATION - item.duration, op.startTime + dt));
          const newRow  = clientYToRow(e.clientY);
          return { ...item, time: newTime, row: newRow };
        }
        if (op.type === "resize-r") {
          const newDur = Math.max(MIN_DUR, Math.min(DURATION - item.time, op.startDur + dt));
          return { ...item, duration: newDur };
        }
        if (op.type === "resize-l") {
          const newTime = Math.max(0, Math.min(op.startTime + op.startDur - MIN_DUR, op.startTime + dt));
          const newDur  = op.startDur - (newTime - op.startTime);
          return { ...item, time: newTime, duration: newDur };
        }
        return item;
      }));
    };
    const onUp = () => { opRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [clientXToTime, clientYToRow]);

  // ── Palette HTML5 drag → timeline drop ───────────────────────────────────────
  const onPaletteDragStart = (e, cat) => {
    paletteDragRef.current = cat;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", cat);
  };

  const onTimelineDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onTimelineDragLeave = () => setDragOver(false);

  const onTimelineDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const cat = paletteDragRef.current;
    if (!cat || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const time = pxToTime(e.clientX - rect.left);
    const row  = clientYToRow(e.clientY);
    setPlacedItems((prev) => [...prev, { id: nextId, category: cat, time, duration: 30, row }]);
    setNextId((n) => n + 1);
    paletteDragRef.current = null;
  };

  const removeItem = (e, id) => {
    e.stopPropagation();
    setPlacedItems((prev) => prev.filter((item) => item.id !== id));
    if (activeSounds.current.has(id)) {
      onStopSounds(activeSounds.current.get(id));
      activeSounds.current.delete(id);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const headPct = (currentTime / DURATION) * 100;
  const cats    = Object.keys(categoryMap);

  return (
    <div style={{
      background: "linear-gradient(135deg,#111e2a 0%,#0a1219 100%)",
      border: "1.5px solid #2a4a62",
      borderRadius: "20px",
      padding: "24px",
      color: "white",
      userSelect: "none",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#6ccff6" }}>
          🎹 Session Timeline
        </h3>
        <span style={{ fontSize: "11px", color: "#7b8aa0" }}>10-min loop · 5 rows · drag to place, handles to resize</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "13px", color: "#9db1c5", minWidth: "40px", textAlign: "right" }}>
            {fmt(currentTime)}
          </span>
          <button onClick={handlePlayPause} style={{
            background: isRunning ? "linear-gradient(180deg,#3a1f1f,#2a1010)" : "linear-gradient(180deg,#1a4d2a,#0f3018)",
            border: isRunning ? "1px solid #8a4a4a" : "1px solid #3a7a4a",
            borderRadius: "8px", color: isRunning ? "#ff9999" : "#8ef59d",
            padding: "7px 14px", cursor: "pointer", fontWeight: "700", fontSize: "13px",
          }}>
            {isRunning ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={handleReset} style={{
            background: "linear-gradient(180deg,#1a2431,#0e1a24)",
            border: "1px solid #334252", borderRadius: "8px",
            color: "#c1c9d6", padding: "7px 12px", cursor: "pointer", fontSize: "13px",
          }}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Palette */}
      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "11px", color: "#7b8aa0", marginBottom: "6px" }}>
          Drag a group onto the timeline ↓ · middle-drag to move · edge-drag to resize
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {cats.map((cat) => (
            <div
              key={cat} draggable
              onDragStart={(e) => onPaletteDragStart(e, cat)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                background: `${CAT_COLORS[cat]}22`, border: `1px solid ${CAT_COLORS[cat]}66`,
                borderRadius: "20px", padding: "4px 10px", cursor: "grab",
                fontSize: "12px", fontWeight: "600", color: CAT_COLORS[cat],
              }}
            >
              {CAT_ICONS[cat]} {cat}
            </div>
          ))}
        </div>
      </div>

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
            background: dragOver ? "rgba(108,207,246,0.06)" : "#080f15",
            border: `1px solid ${dragOver ? "#6ccff6" : "#1a2e40"}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* Row separators */}
          {Array.from({ length: ROWS - 1 }, (_, i) => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${(i + 1) * ROW_H}px`, height: "1px",
              background: "rgba(108,207,246,0.06)", pointerEvents: "none",
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
                  height: `${ROW_H - 2}px`,
                  background: `${color}28`,
                  border: `1.5px solid ${color}99`,
                  borderRadius: "6px",
                  display: "flex", alignItems: "center",
                  cursor: "grab",
                  overflow: "hidden",
                  boxSizing: "border-box",
                }}
                onMouseDown={(e) => onItemMouseDown(e, item, "move")}
              >
                {/* Left resize handle */}
                <div
                  onMouseDown={(e) => onItemMouseDown(e, item, "resize-l")}
                  style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${HANDLE_W}px`, cursor: "ew-resize",
                    background: `${color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, zIndex: 2,
                  }}
                >
                  <div style={{ width: "2px", height: "60%", background: color, borderRadius: "1px" }} />
                </div>

                {/* Label */}
                <div style={{
                  flex: 1, textAlign: "center", fontSize: "11px", fontWeight: "700",
                  color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  padding: `0 ${HANDLE_W + 4}px`,
                  pointerEvents: "none",
                }}>
                  {CAT_ICONS[item.category]} {item.category}
                </div>

                {/* Remove button */}
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => removeItem(e, item.id)}
                  style={{
                    position: "absolute", top: "2px", right: `${HANDLE_W + 2}px`,
                    background: "none", border: "none", color, cursor: "pointer",
                    fontSize: "10px", lineHeight: 1, padding: "1px", opacity: 0.7, zIndex: 2,
                  }}
                >×</button>

                {/* Right resize handle */}
                <div
                  onMouseDown={(e) => onItemMouseDown(e, item, "resize-r")}
                  style={{
                    position: "absolute", right: 0, top: 0, bottom: 0,
                    width: `${HANDLE_W}px`, cursor: "ew-resize",
                    background: `${color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, zIndex: 2,
                  }}
                >
                  <div style={{ width: "2px", height: "60%", background: color, borderRadius: "1px" }} />
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
          No groups placed — drag one from the palette above
        </p>
      )}
    </div>
  );
}
