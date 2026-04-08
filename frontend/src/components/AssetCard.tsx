"use client";

import { useState } from "react";
import { BigSpark } from "./Spark";
import { AssetPrice } from "@/types";

interface Props {
  asset: AssetPrice;
}

export default function AssetCard({ asset }: Props) {
  const [hovered, setHovered] = useState(false);
  const pos = asset.chg >= 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#162033" : "#111827",
        border: "1px solid #1e293b",
        borderRadius: 12,
        padding: 16,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div>
          <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>{asset.sym}</span>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{asset.name}</div>
        </div>
        <BigSpark data={asset.spark} color={pos ? "#10b981" : "#ef4444"} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: "#fff", fontSize: 20, fontWeight: 800 }}>
          {asset.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span style={{ color: pos ? "#10b981" : "#ef4444", fontSize: 13, fontWeight: 600 }}>
          {pos ? "+" : ""}{asset.chgPct.toFixed(2)}%
        </span>
      </div>
      <div style={{ color: "#475569", fontSize: 10, marginTop: 4 }}>{asset.src}</div>
    </div>
  );
}
