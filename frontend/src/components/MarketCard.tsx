"use client";

import { useState } from "react";
import Link from "next/link";
import { Market, Outcome, CATEGORY_DISPLAY } from "@/types";
import { formatPool, timeRemaining } from "@/lib/market";
import { useStore } from "@/store/useStore";
import { Spark, generateSparkline } from "./Spark";

interface Props {
  market: Market;
}

export default function MarketCard({ market }: Props) {
  const [hovered, setHovered] = useState(false);
  const { tokenSymbol }       = useStore();

  const isEnded   = Date.now() / 1000 > market.endTime;
  const remaining = timeRemaining(market.endTime);
  const meta      = CATEGORY_DISPLAY[market.category];
  const catColor  = meta?.color ?? "#94a3b8";
  const catLabel  = meta?.label ?? market.category;

  const pct       = market.yesProb;
  const sparkData = generateSparkline(market.id, pct);
  const sparkColor = pct >= 50 ? "#10b981" : "#ef4444";

  const endDate = new Date(market.endTime * 1000).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <Link href={`/market/${market.id}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background:   hovered ? "#162033" : "#111827",
          border:       "1px solid #1e293b",
          borderRadius: 12,
          padding:      20,
          display:      "flex",
          flexDirection:"column",
          justifyContent:"space-between",
          cursor:       "pointer",
          transition:   "all 0.2s",
          minHeight:    200,
        }}
      >
        {/* Top: badges + sparkline */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {/* Primary category badge */}
              <span style={{
                background: "#1e293b", color: "#94a3b8",
                padding: "3px 8px", borderRadius: 4,
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
              }}>
                {catLabel.toUpperCase()}
              </span>
              {/* Status badge */}
              {market.resolved ? (
                <span style={{
                  background: market.outcome === Outcome.YES ? "#10b98122" : "#ef444422",
                  color:      market.outcome === Outcome.YES ? "#10b981" : "#ef4444",
                  padding: "3px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                }}>
                  {market.outcome === Outcome.YES ? "RESOLVED YES" : "RESOLVED NO"}
                </span>
              ) : isEnded ? (
                <span style={{ background:"#f59e0b22", color:"#f59e0b", padding:"3px 8px", borderRadius:4, fontSize:10, fontWeight:700 }}>
                  PENDING
                </span>
              ) : null}
            </div>
            <Spark data={sparkData} color={sparkColor} w={80} h={32} />
          </div>

          {/* Title */}
          <h3 style={{ color:"#f1f5f9", fontSize:15, fontWeight:600, lineHeight:1.4, margin:0,
            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
            {market.title}
          </h3>
        </div>

        {/* Bottom: prob bar + stats */}
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, margin:"16px 0 12px" }}>
            <div style={{ flex:1, height:4, background:"#1e293b", borderRadius:2, overflow:"hidden" }}>
              <div style={{ width:`${pct}%`, height:"100%", background:pct>=50?"#10b981":"#ef4444", borderRadius:2 }}/>
            </div>
            <span style={{ color:pct>=50?"#10b981":"#ef4444", fontWeight:700, fontSize:14 }}>{pct.toFixed(0)}%</span>
            <span style={{ color:pct>=50?"#10b981":"#ef4444", fontSize:11 }}>YES</span>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", color:"#64748b", fontSize:11 }}>
            <span>Vol {formatPool(market.totalVolume)} {tokenSymbol}</span>
            <span>Liq {formatPool(market.totalPool)} {tokenSymbol}</span>
            <span>Ends {endDate}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
