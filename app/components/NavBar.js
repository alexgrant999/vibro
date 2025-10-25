"use client";

import Link from "next/link";

export default function NavBar() {
  const navStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    padding: "12px",
    background: "rgba(20,30,40,0.8)",
    borderBottom: "1px solid #2a5e7f",
  };

  const linkStyle = {
    color: "#aeeaff",
    textDecoration: "none",
    fontWeight: "500",
    padding: "6px 10px",
    borderRadius: "8px",
  };

  const activeStyle = {
    ...linkStyle,
    background: "rgba(108,207,246,0.1)",
  };

  return (
    <nav style={navStyle}>
      <Link href="/" style={linkStyle}>
        🪘 Pads
      </Link>
      <Link href="/oscillator" style={linkStyle}>
        🎚 Oscillator
      </Link>
    </nav>
  );
}
