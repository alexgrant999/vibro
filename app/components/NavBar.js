"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const pathname = usePathname();

  const navStyle = {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    padding: "16px 40px",
    background: "linear-gradient(180deg, rgba(26,44,48,0.9) 0%, rgba(11,15,20,0.9) 100%)",
    borderBottom: "1px solid #2a5e7f",
    backdropFilter: "blur(10px)",
  };

  const linkStyle = {
    color: "#9db1c5",
    textDecoration: "none",
    fontWeight: "600",
    padding: "10px 16px",
    borderRadius: "10px",
    fontSize: "14px",
    transition: "all 0.2s ease",
    cursor: "pointer",
  };

  const activeLinkStyle = {
    ...linkStyle,
    background: "linear-gradient(180deg, #2a5e7f, #1a3f5a)",
    color: "#6ccff6",
    borderBottom: "2px solid #6ccff6",
  };

  const isActive = (path) => pathname === path;

  return (
    <nav style={navStyle}>
      <Link href="/" style={isActive("/") ? activeLinkStyle : linkStyle}>
        🪘 Vibro Acoustic
      </Link>
    </nav>
  );
}
