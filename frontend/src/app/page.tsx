"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { useMarkets } from "@/hooks/useMarkets";
import { sortMarkets, filterByCategory, formatPool } from "@/lib/market";
import { SortMode } from "@/types";
import MarketCard from "@/components/MarketCard";
import CategoryFilter from "@/components/CategoryFilter";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest",    label: "Newest"         },
  { value: "trending",  label: "Trending"       },
  { value: "liquidity", label: "Most Liquidity" },
  { value: "ending",    label: "Ending Soon"    },
];

export default function MarketsPage() {
  const { markets, marketsLoading, marketsError, category, sortMode, search, setSortMode, setSearch } =
    useStore();
  const { refetch } = useMarkets();

  useEffect(() => { refetch(); }, []); // eslint-disable-line

  const displayed = useMemo(() => {
    let list = filterByCategory(markets, category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
      );
    }
    return sortMarkets(list, sortMode);
  }, [markets, category, sortMode, search]);

  const activeCount  = markets.filter(m => !m.resolved).length;
  const totalVol     = markets.reduce((s, m) => s + m.totalVolume, 0n);
  const totalLiq     = markets.reduce((s, m) => s + m.totalPool,   0n);

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ color: "#3b82f6", fontSize: 11, letterSpacing: 2, fontWeight: 700, margin: "0 0 8px" }}>
          Risk Intelligence Liquidity Forecasting System
        </p>
        <h1 style={{ fontSize: 40, fontWeight: 800, margin: "0 0 12px", color: "#fff", lineHeight: 1.1 }}>
          Where conviction turns into capital.
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, margin: "0 0 20px", maxWidth: 500 }}>
          Trade on the outcomes that move markets. Every position settles instantly on-chain against verified, tamper-proof resolution sources.
        </p>
        <Link
          href="/create"
          style={{
            display: "inline-flex", alignItems: "center",
            background: "transparent", border: "1px solid #10b981",
            color: "#10b981", padding: "8px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600, textDecoration: "none",
            transition: "all 0.15s",
          }}
        >
          + Create Market
        </Link>
      </div>

      {/* Stats bar */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4,1fr)",
        gap: 1, background: "#1e293b", borderRadius: 12,
        overflow: "hidden", marginBottom: 32,
      }}>
        {[
          ["ACTIVE MARKETS",   String(activeCount)],
          ["TOTAL VOLUME",     `$${formatPool(totalVol)}`],
          ["TOTAL LIQUIDITY",  `$${formatPool(totalLiq)}`],
          ["AVG. RESOLUTION",  "< 24h"],
        ].map(([label, value]) => (
          <div key={label} style={{ background: "#111827", padding: "20px 24px" }}>
            <p style={{ color: "#64748b", fontSize: 11, letterSpacing: 1, fontWeight: 600, margin: "0 0 6px" }}>{label}</p>
            <p style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div style={{ marginBottom: 24 }}>
        <CategoryFilter />
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search markets…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: "#111827", border: "1px solid #1e293b",
              color: "#e2e8f0", padding: "8px 14px", borderRadius: 8,
              fontSize: 13, width: 220, outline: "none",
            }}
          />
          <select
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            style={{
              background: "#111827", border: "1px solid #1e293b",
              color: "#e2e8f0", padding: "8px 12px", borderRadius: 8,
              fontSize: 13, cursor: "pointer", outline: "none",
            }}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {marketsLoading && (
            <span style={{ color: "#475569", fontSize: 12 }}>Refreshing…</span>
          )}
        </div>
      </div>

      {/* Market grid */}
      {marketsLoading && markets.length === 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 200, background: "#111827", borderRadius: 12, animation: "pulse 2s infinite" }} />
          ))}
        </div>
      ) : marketsError ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <p style={{ color: "#ef4444", marginBottom: 16 }}>{marketsError}</p>
          <button
            onClick={refetch}
            style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontSize: 14 }}
          >
            Retry
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 64, textAlign: "center" }}>
          <p style={{ color: "#475569", marginBottom: 20, fontSize: 15 }}>
            {search ? `No markets found for "${search}"` : "No markets yet."}
          </p>
          <Link
            href="/create"
            style={{
              display: "inline-block", background: "#3b82f6", color: "#fff",
              padding: "10px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 600,
            }}
          >
            Create the first market
          </Link>
        </div>
      ) : (
        <>
          <p style={{ color: "#475569", fontSize: 12, marginBottom: 16 }}>
            Showing {displayed.length} market{displayed.length !== 1 ? "s" : ""}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {displayed.map(m => <MarketCard key={m.id} market={m} />)}
          </div>
        </>
      )}
    </div>
  );
}
