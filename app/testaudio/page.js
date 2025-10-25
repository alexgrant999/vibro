"use client";
import React from "react";
import { getAudioContext } from "../components/audioContext";

export default function TestAudio() {
  const playTone = async () => {
    try {
      const ctx = await getAudioContext();
      if (!ctx) return;
      await ctx.resume();
      console.log("AudioContext state:", ctx.state);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 440;
      gain.gain.value = 0.4;

      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch (err) {
      console.error("Audio test failed:", err);
    }
  };

  return (
    <div
      onClick={playTone}
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0f14",
        color: "#fff",
        fontSize: "20px",
      }}
    >
      🔈 Tap to play test tone
    </div>
  );
}
