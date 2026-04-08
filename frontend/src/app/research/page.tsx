"use client";

import { useState } from "react";
import AssetCard from "@/components/AssetCard";
import MacroBar from "@/components/MacroBar";
import NewsCard from "@/components/NewsCard";
import EconomicCalendar from "@/components/EconomicCalendar";
import { usePrices } from "@/hooks/usePrices";
import { useNews } from "@/hooks/useNews";

const NEWS_TAGS = ["ALL", "CRYPTO", "MARKETS", "GEOPOLITICS", "MACRO", "COMMODITIES"];

const TAG_COLORS: Record<string, string> = {
  CRYPTO:      "#f59e0b",
  MARKETS:     "#10b981",
  GEOPOLITICS: "#ef4444",
  MACRO:       "#8b5cf6",
  COMMODITIES: "#3b82f6",
};

// Trending on X – static/mock; replace with Twitter API later
const trendingTopics = [
  { topic: "#BTC",          posts: "142K posts", sentiment: "Bullish",  sentColor: "#10b981", desc: "Bitcoin price action and macro drivers" },
  { topic: "#FOMC",         posts: "89K posts",  sentiment: "Neutral",  sentColor: "#f59e0b", desc: "Rate decision expectations and Fed commentary" },
  { topic: "#Gold",         posts: "67K posts",  sentiment: "Bullish",  sentColor: "#10b981", desc: "Gold holding near all-time highs amid uncertainty" },
  { topic: "#SP500",        posts: "54K posts",  sentiment: "Mixed",    sentColor: "#f59e0b", desc: "Equities mixed as earnings season approaches" },
  { topic: "#CPI",          posts: "43K posts",  sentiment: "Bearish",  sentColor: "#ef4444", desc: "Inflation data watch — CPI expected Friday" },
  { topic: "#SolanaETF",    posts: "38K posts",  sentiment: "Bullish",  sentColor: "#10b981", desc: "SEC deliberating spot Solana ETF approval" },
];

export default function ResearchPage() {
  const [tab,      setTab]      = useState<"overview" | "calendar" | "news">("overview");
  const [newsFilt, setNewsFilt] = useState("ALL");

  const { assets, macroIndicators, loading: pricesLoading } = usePrices();
  const { news, loading: newsLoading } = useNews();

  const filteredNews = newsFilt === "ALL"
    ? news
    : news.filter(n => n.tag === newsFilt);

  const tabBtn = (key: string, label: string) => (
    <button
      key={key}
      onClick={() => setTab(key as "overview" | "calendar" | "news")}
      style={{
        background:   "transparent",
        border:       "none",
        borderBottom: tab === key ? "2px solid #3b82f6" : "2px solid transparent",
        color:        tab === key ? "#fff" : "#64748b",
        padding:      "10px 20px",
        fontSize:     14,
        cursor:       "pointer",
        fontWeight:   tab === key ? 600 : 400,
        transition:   "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: "#3b82f6", fontSize: 11, letterSpacing: 2, fontWeight: 700, margin: "0 0 8px" }}>
          RESEARCH & INTELLIGENCE
        </p>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px", color: "#fff" }}>
          Market Intelligence Hub
        </h1>
        <p style={{ color: "#64748b", fontSize: 15, margin: 0, maxWidth: 600 }}>
          Live prices, macro data, economic calendar and the latest news — all in one place.
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid #1e293b" }}>
        {tabBtn("overview", "Overview")}
        {tabBtn("calendar", "Economic Calendar")}
        {tabBtn("news",     "News & X")}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "overview" && (
        <>
          {/* Live Prices */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Live Prices</h2>
              {pricesLoading && <span style={{ color: "#475569", fontSize: 12 }}>Loading…</span>}
            </div>
            {assets.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
                {assets.map(a => <AssetCard key={a.sym} asset={a} />)}
              </div>
            ) : (
              <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 32, textAlign: "center", color: "#475569" }}>
                {pricesLoading ? "Loading live prices…" : "Price data unavailable. Yahoo Finance or Binance may be rate-limiting."}
              </div>
            )}
          </div>

          {/* Macro Indicators */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>Macro Indicators</h2>
            {macroIndicators.length > 0 ? (
              <MacroBar indicators={macroIndicators} />
            ) : (
              <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24, textAlign: "center", color: "#475569" }}>
                Loading macro data…
              </div>
            )}
          </div>

          {/* Key events this week */}
          <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
            <h3 style={{ color: "#fff", fontSize: 16, fontWeight: 700, margin: "0 0 14px" }}>Key Events This Week</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
              {[
                { day: "Thu", ev: "GDP 3rd Release, Initial Claims, PCE Deflator, FOMC Minutes", imp: "#ef4444" },
                { day: "Fri", ev: "US CPI (MoM & YoY), Core CPI, Michigan Consumer Sentiment",    imp: "#ef4444" },
                { day: "Next Week", ev: "FOMC speakers, PPI, Retail Sales",                         imp: "#f59e0b" },
              ].map((e, i) => (
                <div key={i} style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: e.imp }} />
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{e.day}</span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, margin: 0 }}>{e.ev}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => setTab("calendar")}
              style={{ background: "#1e3a5f", border: "1px solid #3b82f6", color: "#60a5fa", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 16 }}
            >
              View Full Calendar →
            </button>
          </div>
        </>
      )}

      {/* ── ECONOMIC CALENDAR TAB ── */}
      {tab === "calendar" && <EconomicCalendar />}

      {/* ── NEWS & X TAB ── */}
      {tab === "news" && (
        <>
          {/* Tag filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {NEWS_TAGS.map(t => (
              <button
                key={t}
                onClick={() => setNewsFilt(t)}
                style={{
                  background:   newsFilt === t ? "#1e3a5f" : "transparent",
                  border:       `1px solid ${newsFilt === t ? "#3b82f6" : "#1e293b"}`,
                  color:        newsFilt === t ? "#60a5fa" : "#64748b",
                  padding:      "6px 14px",
                  borderRadius: 20,
                  fontSize:     12,
                  cursor:       "pointer",
                  fontWeight:   600,
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* News grid */}
          {newsLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 140, background: "#111827", borderRadius: 12, animation: "pulse 2s infinite" }} />
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
              No news items match this filter.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 16 }}>
              {filteredNews.map((n, i) => <NewsCard key={i} item={n} />)}
            </div>
          )}

          {/* Trending on X */}
          <div style={{ marginTop: 32, background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 700, margin: 0 }}>Trending on X</h2>
              <span style={{ color: "#475569", fontSize: 11, marginLeft: 8 }}>Mock data · integrate X API to make live</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12 }}>
              {trendingTopics.map((t, i) => (
                <div key={i} style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ color: "#60a5fa", fontSize: 14, fontWeight: 700 }}>{t.topic}</span>
                    <span style={{ background: t.sentColor + "22", color: t.sentColor, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{t.sentiment}</span>
                  </div>
                  <p style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.4, margin: "0 0 6px" }}>{t.desc}</p>
                  <span style={{ color: "#475569", fontSize: 11 }}>{t.posts}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
