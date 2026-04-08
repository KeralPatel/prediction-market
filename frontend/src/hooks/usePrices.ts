"use client";

import { useState, useEffect, useCallback } from "react";
import { AssetPrice, MacroIndicator } from "@/types";

const POLL_INTERVAL = 60_000; // 1 minute

interface PricesData {
  assets:         AssetPrice[];
  macroIndicators:MacroIndicator[];
}

export function usePrices() {
  const [data,    setData]    = useState<PricesData>({ assets: [], macroIndicators: [] });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error("Failed to fetch prices");
      const json: PricesData = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetch_]);

  return { ...data, loading, error, refetch: fetch_ };
}
