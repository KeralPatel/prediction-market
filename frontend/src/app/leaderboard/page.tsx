"use client";

import { useState, useEffect, useCallback } from "react";
import { LeaderboardEntry } from "@/types";

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function PnlBadge({ pnl }: { pnl: string }) {
  const isPos = pnl.startsWith("+");
  const isNeg = pnl.startsWith("-");
  return (
    <span style={{
      color:      isPos ? "#10b981" : isNeg ? "#ef4444" : "#94a3b8",
      fontWeight: 700,
      fontSize:   14,
    }}>
      {pnl}
    </span>
  );
}

function AccuracyBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
      </div>
      <span style={{ color, fontSize: 12, fontWeight: 600, minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "pnl",      label: "P&L"      },
  { value: "accuracy", label: "Accuracy" },
  { value: "volume",   label: "Volume"   },
] as const;

type SortKey = typeof SORT_OPTIONS[number]["value"];

export default function LeaderboardPage() {
  const [entries,  setEntries]  = useState<LeaderboardEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [sortKey,  setSortKey]  = useState<SortKey>("pnl");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      const data: LeaderboardEntry[] = await res.json();
      setEntries(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...entries].sort((a, b) => {
    if (sortKey === "pnl")      return b.pnlRaw - a.pnlRaw;
    if (sortKey === "accuracy") return b.accuracy - a.accuracy;
    return parseFloat(b.totalBet.replace(/[KM]/g,"")) - parseFloat(a.totalBet.replace(/[KM]/g,""));
  }).map((e, i) => ({ ...e, rank: i + 1 }));

  const rankMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ color: "#3b82f6", fontSize: 11, letterSpacing: 2, fontWeight: 700, margin: "0 0 8px" }}>
          ON-CHAIN · VERIFIED
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px", color: "#fff" }}>
          Leaderboard
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
          Top traders ranked by P&L and accuracy. All data read directly from the blockchain.
        </p>
      </div>

      {/* Sort tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {SORT_OPTIONS.map(o => (
          <button
            key={o.value}
            onClick={() => setSortKey(o.value)}
            style={{
              background:   sortKey === o.value ? "#1e3a5f" : "transparent",
              border:       `1px solid ${sortKey === o.value ? "#3b82f6" : "#1e293b"}`,
              color:        sortKey === o.value ? "#60a5fa" : "#64748b",
              padding:      "8px 20px",
              borderRadius: 8,
              fontSize:     13,
              cursor:       "pointer",
              fontWeight:   600,
            }}
          >
            Sort by {o.label}
          </button>
        ))}
        <button
          onClick={fetchData}
          style={{ marginLeft: "auto", background: "transparent", border: "1px solid #1e293b", color: "#64748b", padding: "8px 16px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 56, margin: 8, background: "#162033", borderRadius: 8, animation: "pulse 2s infinite" }} />
          ))}
        </div>
      ) : error ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <p style={{ color: "#ef4444", marginBottom: 16 }}>{error}</p>
          <button onClick={fetchData} style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 64, textAlign: "center" }}>
          <p style={{ color: "#475569", fontSize: 15 }}>No traders yet. Be the first to place a bet!</p>
        </div>
      ) : (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 120px 100px 120px 80px", gap: 8, padding: "12px 20px", background: "#0d1321", borderBottom: "1px solid #1e293b" }}>
            {["Rank","Address","Bets","Volume","P&L","Accuracy","Wins"].map(h => (
              <span key={h} style={{ color: "#475569", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {sorted.map((e) => (
            <div
              key={e.address}
              style={{ display: "grid", gridTemplateColumns: "60px 1fr 100px 120px 100px 120px 80px", gap: 8, padding: "14px 20px", borderBottom: "1px solid #1a2235", alignItems: "center" }}
              onMouseEnter={ev => (ev.currentTarget.style.background = "#162033")}
              onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
            >
              <span style={{ color: e.rank <= 3 ? "#f59e0b" : "#64748b", fontWeight: 700, fontSize: 14 }}>
                {rankMedal(e.rank)}
              </span>
              <span style={{ color: "#94a3b8", fontSize: 13, fontFamily: "monospace" }}>
                {shortAddr(e.address)}
              </span>
              <span style={{ color: "#f1f5f9", fontSize: 13 }}>{e.totalBets}</span>
              <span style={{ color: "#94a3b8", fontSize: 13 }}>{e.totalBet}</span>
              <PnlBadge pnl={e.pnl} />
              <AccuracyBar pct={e.accuracy} />
              <span style={{ color: "#64748b", fontSize: 12 }}>
                {e.winningBets}/{e.totalBets}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Info note */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "#0d1321", borderRadius: 8, border: "1px solid #1e293b" }}>
        <p style={{ color: "#475569", fontSize: 11, margin: 0 }}>
          📊 Data sourced directly from on-chain BetPlaced, Claimed, and Refunded events. P&L = total received − total wagered.
          Accuracy = winning bets / resolved bets. Refreshes every 2 minutes.
        </p>
      </div>
    </div>
  );
}
