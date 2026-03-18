import { create } from "zustand";
import { Market, Category, SortMode } from "@/types";

interface AppState {
  // ── Markets ─────────────────────────────────────────────────────────────
  markets:       Market[];
  marketsLoading: boolean;
  marketsError:  string | null;
  lastFetched:   number | null;

  setMarkets:    (markets: Market[]) => void;
  setMarketsLoading: (v: boolean) => void;
  setMarketsError:   (err: string | null) => void;
  updateMarket:  (market: Market) => void;

  // ── UI Filters ───────────────────────────────────────────────────────────
  category:  Category;
  sortMode:  SortMode;
  search:    string;

  setCategory: (c: Category) => void;
  setSortMode: (s: SortMode) => void;
  setSearch:   (q: string) => void;

  // ── Token metadata (cached after first load) ────────────────────────────
  tokenSymbol:   string;
  tokenDecimals: number;

  setTokenSymbol:   (s: string) => void;
  setTokenDecimals: (d: number) => void;
}

export const useStore = create<AppState>((set) => ({
  // ── Markets ──────────────────────────────────────────────────────────────
  markets:        [],
  marketsLoading: false,
  marketsError:   null,
  lastFetched:    null,

  setMarkets: (markets) =>
    set({ markets, marketsLoading: false, marketsError: null, lastFetched: Date.now() }),
  setMarketsLoading: (v) => set({ marketsLoading: v }),
  setMarketsError:   (err) => set({ marketsError: err, marketsLoading: false }),
  updateMarket: (market) =>
    set((state) => ({
      markets: state.markets.map((m) => (m.id === market.id ? market : m)),
    })),

  // ── UI Filters ────────────────────────────────────────────────────────────
  category: "all",
  sortMode: "newest",
  search:   "",

  setCategory: (category) => set({ category }),
  setSortMode: (sortMode) => set({ sortMode }),
  setSearch:   (search)   => set({ search }),

  // ── Token metadata ────────────────────────────────────────────────────────
  tokenSymbol:   "USDT",
  tokenDecimals: 18,

  setTokenSymbol:   (tokenSymbol)   => set({ tokenSymbol }),
  setTokenDecimals: (tokenDecimals) => set({ tokenDecimals }),
}));
