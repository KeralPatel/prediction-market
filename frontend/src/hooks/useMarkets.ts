"use client";

import { useCallback, useEffect } from "react";
import { useStore } from "@/store/useStore";
import { useFactoryContract, useTokenContract } from "@/hooks/useContract";
import { parseMarket } from "@/lib/market";
import { Market, RawMarket } from "@/types";

const REFETCH_INTERVAL = 30_000; // 30 seconds

// ─── useMarkets – global market list ──────────────────────────────────────

export function useMarkets() {
  const { setMarkets, setMarketsLoading, setMarketsError, setTokenSymbol, setTokenDecimals } =
    useStore();
  const { readContract } = useFactoryContract();
  const { readContract: tokenRead } = useTokenContract();

  const fetchMarkets = useCallback(async () => {
    if (!readContract) return;

    setMarketsLoading(true);
    try {
      const rawMarkets: RawMarket[] = await (readContract as unknown as {
        getAllMarkets: () => Promise<RawMarket[]>;
      }).getAllMarkets();

      const parsed: Market[] = rawMarkets.map(parseMarket);
      setMarkets(parsed);
    } catch (err) {
      console.error("fetchMarkets error:", err);
      setMarketsError("Failed to load markets. Please check your network.");
    }
  }, [readContract, setMarkets, setMarketsLoading, setMarketsError]);

  // Load token metadata once
  useEffect(() => {
    if (!tokenRead) return;
    Promise.all([
      (tokenRead as unknown as { symbol: () => Promise<string> }).symbol(),
      (tokenRead as unknown as { decimals: () => Promise<bigint> }).decimals(),
    ])
      .then(([sym, dec]) => {
        setTokenSymbol(sym);
        setTokenDecimals(Number(dec));
      })
      .catch(() => {});
  }, [tokenRead, setTokenSymbol, setTokenDecimals]);

  // Initial fetch + polling
  useEffect(() => {
    fetchMarkets();
    const id = setInterval(fetchMarkets, REFETCH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchMarkets]);

  return { refetch: fetchMarkets };
}

// ─── useSingleMarket – individual market page ──────────────────────────────

export function useSingleMarket(marketId: number) {
  const { readContract } = useFactoryContract();

  const fetchMarket = useCallback(async (): Promise<Market | null> => {
    if (!readContract || !marketId) return null;
    try {
      const raw: RawMarket = await (readContract as unknown as {
        getMarket: (id: number) => Promise<RawMarket>;
      }).getMarket(marketId);
      if (raw.id === 0n) return null;
      return parseMarket(raw);
    } catch {
      return null;
    }
  }, [readContract, marketId]);

  return { fetchMarket };
}

// ─── useUserBet ────────────────────────────────────────────────────────────

export function useUserBet() {
  const { readContract } = useFactoryContract();

  const getUserBet = useCallback(
    async (marketId: number, userAddress: string) => {
      if (!readContract) return null;
      try {
        return await (readContract as unknown as {
          getUserBet: (
            marketId: number,
            user: string
          ) => Promise<{ yesAmount: bigint; noAmount: bigint; claimed: boolean }>;
        }).getUserBet(marketId, userAddress);
      } catch {
        return null;
      }
    },
    [readContract]
  );

  return { getUserBet };
}
