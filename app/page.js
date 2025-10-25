"use client";

import PadGrid from "./components/PadGrid";
import NavBar from "./components/NavBar";
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 80% -10%, #1a2430 0%, #0b0f14 55%), #0b0f14",
        color: "white",
        padding: "40px",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      }}
    >
      <NavBar />

      <h1
        style={{ textAlign: "center", marginBottom: "30px", fontSize: "28px" }}
      >
        Vibro Acoustic – 12 Pad Player
      </h1>
      <PadGrid />
    </main>
  );
}
