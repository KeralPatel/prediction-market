"use client";

import { useEffect } from "react";
import Ticker from "./Ticker";
import { useStore } from "@/store/useStore";
import { useMarkets } from "@/hooks/useMarkets";

export default function TickerWrapper() {
  const { markets } = useStore();
  const { refetch } = useMarkets();

  useEffect(() => { refetch(); }, []); // eslint-disable-line

  return <Ticker markets={markets} />;
}
