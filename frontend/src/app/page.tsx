"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/store/useStore";
import { useMarkets } from "@/hooks/useMarkets";
import { sortMarkets, filterByCategory } from "@/lib/market";
import { SortMode } from "@/types";
import MarketCard from "@/components/MarketCard";
import CategoryFilter from "@/components/CategoryFilter";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest",    label: "Newest"        },
  { value: "trending",  label: "Trending"      },
  { value: "liquidity", label: "Most Liquidity" },
  { value: "ending",    label: "Ending Soon"   },
];

export default function HomePage() {
  const { markets, marketsLoading, marketsError, category, sortMode, search, setSortMode, setSearch } =
    useStore();
  const { refetch } = useMarkets();

  // Trigger initial fetch
  useEffect(() => { refetch(); }, []); // eslint-disable-line

  const displayed = useMemo(() => {
    let list = filterByCategory(markets, category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }
    return sortMarkets(list, sortMode);
  }, [markets, category, sortMode, search]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center py-8 space-y-3">
        <h1 className="text-4xl font-bold">
          <span className="text-gradient">Predict the Future.</span>
          <br />
          <span className="text-[#e8eaf6]">Earn from your insight.</span>
        </h1>
        <p className="text-[#8892b0] max-w-xl mx-auto">
          Bet on real-world outcomes using decentralized prediction markets on BNB Chain.
          No middlemen, no censorship, just markets.
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Link href="/create" className="btn-primary px-6 py-2.5">
            Create Market
          </Link>
          <Link href="/portfolio" className="btn-secondary px-6 py-2.5">
            My Portfolio
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Markets",  value: markets.filter((m) => !m.resolved).length.toString() },
          { label: "Total Liquidity", value: `$${(markets.reduce((a, m) => a + Number(m.totalPool / 10n ** 18n), 0)).toLocaleString()}` },
          { label: "Total Volume",    value: `$${(markets.reduce((a, m) => a + Number(m.totalVolume / 10n ** 18n), 0)).toLocaleString()}` },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-[#e8eaf6]">{value}</div>
            <div className="text-xs text-[#546e8a] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <CategoryFilter />

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <input
              type="text"
              placeholder="Search markets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input text-sm h-9 flex-1 sm:w-56"
            />
            {/* Sort */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="input text-sm h-9 w-auto pr-8 cursor-pointer"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Market grid */}
      {marketsLoading && markets.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-48 animate-pulse bg-[#1a2035]" />
          ))}
        </div>
      ) : marketsError ? (
        <div className="card p-8 text-center space-y-3">
          <p className="text-red-400">{marketsError}</p>
          <button className="btn-primary" onClick={refetch}>Retry</button>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card p-12 text-center space-y-4">
          <div className="text-4xl">◈</div>
          <p className="text-[#8892b0]">
            {search ? `No markets found for "${search}"` : "No markets yet."}
          </p>
          <Link href="/create" className="btn-primary inline-flex">
            Create the first market
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#546e8a]">
              Showing {displayed.length} market{displayed.length !== 1 ? "s" : ""}
            </p>
            {marketsLoading && (
              <span className="text-xs text-[#546e8a] animate-pulse">Refreshing…</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayed.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
