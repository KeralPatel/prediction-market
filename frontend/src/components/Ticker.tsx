"use client";

import { useState, useEffect, useRef } from "react";
import { Market } from "@/types";

interface Props {
  markets: Market[];
}

export default function Ticker({ markets }: Props) {
  const [offset, setOffset] = useState(0);
  const frameRef = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (markets.length === 0) return;
    const totalWidth = markets.length * 420;

    const tick = () => {
      offsetRef.current = (offsetRef.current + 0.6) % totalWidth;
      setOffset(offsetRef.current);
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [markets.length]);

  if (markets.length === 0) return null;

  const doubled = [...markets, ...markets];

  return (
    <div
      style={{
        overflow: "hidden",
        background: "#0d1321",
        borderBottom: "1px solid #1e293b",
        height: 36,
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 60,
          whiteSpace: "nowrap",
          transform: `translateX(-${offset}px)`,
          willChange: "transform",
        }}
      >
        {doubled.map((m, i) => {
          const isUp = m.yesProb >= 50;
          const catMeta =
            typeof document !== "undefined" ? undefined : undefined;
          return (
            <span
              key={i}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12 }}
            >
              <span
                style={{
                  background: "#1e3a5f",
                  color: "#60a5fa",
                  padding: "2px 6px",
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: 0.5,
                }}
              >
                #{m.id}
              </span>
              <span style={{ color: "#94a3b8" }}>
                {m.title.length > 45 ? m.title.slice(0, 45) + "…" : m.title}
              </span>
              <span
                style={{
                  color: isUp ? "#10b981" : "#ef4444",
                  fontWeight: 700,
                }}
              >
                {m.yesProb.toFixed(0)}% YES
              </span>
              <span style={{ color: "#1e293b" }}>·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
