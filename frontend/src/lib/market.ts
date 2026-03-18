import { Market, Outcome, RawMarket, SortMode } from "@/types";

const TOKEN_DECIMALS = 18n;

/** Convert raw contract Market tuple to frontend Market */
export function parseMarket(raw: RawMarket): Market {
  const yesPool   = raw.yesPool;
  const noPool    = raw.noPool;
  const totalPool = yesPool + noPool;

  let yesProbBps = 5000;
  let noProbBps  = 5000;

  if (totalPool > 0n) {
    yesProbBps = Number((yesPool * 10000n) / totalPool);
    noProbBps  = 10000 - yesProbBps;
  }

  return {
    id:          Number(raw.id),
    title:       raw.title,
    description: raw.description,
    category:    raw.category,
    creator:     raw.creator,
    endTime:     Number(raw.endTime),
    yesPool,
    noPool,
    totalPool,
    resolved:    raw.resolved,
    outcome:     raw.outcome as Outcome,
    createdAt:   Number(raw.createdAt),
    totalVolume: raw.totalVolume,
    yesProbBps,
    noProbBps,
    yesProb:     yesProbBps / 100,
    noProb:      noProbBps  / 100,
  };
}

/** Format token amount from BigInt wei to human-readable string */
export function formatTokenAmount(
  amount: bigint,
  decimals = 18,
  displayDecimals = 2
): string {
  if (amount === 0n) return "0";
  const divisor = 10n ** BigInt(decimals);
  const whole   = amount / divisor;
  const frac    = amount % divisor;

  if (displayDecimals === 0) return whole.toLocaleString();

  const fracStr = frac.toString().padStart(decimals, "0").slice(0, displayDecimals);
  return `${whole.toLocaleString()}.${fracStr}`;
}

/** Format pool in short notation: 1200 → "1.2K", 1500000 → "1.5M" */
export function formatPool(amount: bigint): string {
  const n = Number(amount / (10n ** BigInt(TOKEN_DECIMALS)));
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

/** Time remaining string */
export function timeRemaining(endTime: number): string {
  const now  = Math.floor(Date.now() / 1000);
  const diff = endTime - now;

  if (diff <= 0) return "Ended";

  const days    = Math.floor(diff / 86400);
  const hours   = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0)    return `${days}d ${hours}h`;
  if (hours > 0)   return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Sort markets by the given mode */
export function sortMarkets(markets: Market[], mode: SortMode): Market[] {
  const now = Math.floor(Date.now() / 1000);
  const copy = [...markets];

  switch (mode) {
    case "trending":
      // Sort by totalVolume descending (indexer provides 24h volume; fallback to all-time)
      return copy.sort((a, b) => (b.totalVolume > a.totalVolume ? 1 : -1));
    case "liquidity":
      return copy.sort((a, b) => (b.totalPool > a.totalPool ? 1 : -1));
    case "ending":
      return copy
        .filter((m) => m.endTime > now && !m.resolved)
        .sort((a, b) => a.endTime - b.endTime)
        .concat(copy.filter((m) => m.endTime <= now || m.resolved));
    case "newest":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
    default:
      return copy;
  }
}

/** Filter markets by category */
export function filterByCategory(markets: Market[], category: string): Market[] {
  if (category === "all") return markets;
  return markets.filter((m) => m.category === category);
}

/** Calculate expected payout for a bet */
export function calcExpectedPayout(
  betAmount: bigint,
  isYes: boolean,
  market: Market,
  tradeFeePercent: bigint
): bigint {
  if (betAmount === 0n) return 0n;

  const fee      = (betAmount * tradeFeePercent) / 10000n;
  const netBet   = betAmount - fee;

  const currentPool = isYes ? market.yesPool : market.noPool;
  const newPool     = currentPool + netBet;
  const totalPool   = market.totalPool + netBet;

  // Expected payout = netBet / newPool * totalPool
  return (netBet * totalPool) / newPool;
}

/** Calculate potential profit percentage */
export function calcPotentialProfit(payout: bigint, grossBet: bigint): number {
  if (grossBet === 0n) return 0;
  const profit = payout > grossBet ? payout - grossBet : 0n;
  return Number((profit * 10000n) / grossBet) / 100;
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  [Outcome.UNRESOLVED]: "Unresolved",
  [Outcome.YES]:        "YES",
  [Outcome.NO]:         "NO",
};
