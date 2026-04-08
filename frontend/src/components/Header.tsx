"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import WalletButton from "./WalletButton";
import { useWallet } from "@/context/WalletContext";

const NAV_LINKS = [
  { href: "/",            label: "Markets"    },
  { href: "/research",    label: "Research"   },
  { href: "/leaderboard", label: "Leaderboard"},
];

export default function Header() {
  const pathname = usePathname();
  const router   = useRouter();
  const { wrongNetwork } = useWallet();
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toISOString().slice(11, 19) + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const activePage = NAV_LINKS.find(l => l.href === pathname)?.label
    ?? (pathname.startsWith("/market") ? "Markets"
      : pathname === "/create" ? "Markets"
      : pathname === "/portfolio" ? "Markets"
      : "");

  return (
    <>
      {wrongNetwork && (
        <div style={{
          background: "rgba(239,68,68,0.1)",
          borderBottom: "1px solid rgba(239,68,68,0.2)",
          color: "#f87171",
          fontSize: 13,
          textAlign: "center",
          padding: "8px 16px",
        }}>
          Wrong network detected. Please switch to the correct network in your wallet.
        </div>
      )}

      <nav style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        borderBottom: "1px solid #1e293b",
        background: "#0a0f1a",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}>
        {/* Left: logo + nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          {/* Logo */}
          <div
            onClick={() => router.push("/")}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%",
              background: "linear-gradient(135deg,#3b82f6,#10b981)",
            }} />
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: 2, color: "#fff" }}>
              KNIGHTSBRIDGE
            </span>
          </div>

          {/* Nav links */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {NAV_LINKS.map(({ href, label }) => {
              const active = activePage === label;
              return (
                <span
                  key={href}
                  onClick={() => router.push(href)}
                  style={{
                    fontSize: 14,
                    color: active ? "#fff" : "#64748b",
                    cursor: "pointer",
                    fontWeight: active ? 600 : 400,
                    borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
                    paddingBottom: 2,
                    marginRight: 16,
                    transition: "color 0.15s",
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right: clock + wallet */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: "#64748b", fontSize: 13, fontFamily: "monospace" }}>{time}</span>
          <WalletButton />
        </div>
      </nav>
    </>
  );
}
