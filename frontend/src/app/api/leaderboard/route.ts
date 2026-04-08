import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { MARKET_FACTORY_ABI } from "@/lib/abi";
import { LeaderboardEntry } from "@/types";

export const dynamic = "force-dynamic";

const CACHE_TTL = 120_000; // 2 minutes
let cache: { data: LeaderboardEntry[]; ts: number } | null = null;

const RPC_URL         = process.env.NEXT_PUBLIC_RPC_URL         || "https://data-seed-prebsc-1-s1.binance.org:8545/";
const CONTRACT_ADDRESS= process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const BLOCK_LOOKBACK  = 500_000; // limit event scan range

function formatAmt(wei: bigint): string {
  if (wei === 0n) return "0";
  const n = Number(wei) / 1e18;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  if (!CONTRACT_ADDRESS) {
    return NextResponse.json([]);
  }

  try {
    const chainId  = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "97");
    const provider = new ethers.JsonRpcProvider(RPC_URL, chainId, { staticNetwork: true });
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKET_FACTORY_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock    = Math.max(0, currentBlock - BLOCK_LOOKBACK);

    // Fetch events in parallel
    const [betLogs, claimLogs, refundLogs, rawMarkets] = await Promise.all([
      contract.queryFilter(contract.filters.BetPlaced(),     fromBlock, "latest"),
      contract.queryFilter(contract.filters.Claimed(),       fromBlock, "latest"),
      contract.queryFilter(contract.filters.Refunded(),      fromBlock, "latest"),
      (contract as unknown as { getAllMarkets: () => Promise<Array<{ id: bigint; resolved: boolean; outcome: number }>> }).getAllMarkets(),
    ]);

    // Build outcome map for resolved markets: marketId → outcome (1=YES, 2=NO)
    const outcomeMap = new Map<number, number>();
    for (const m of rawMarkets) {
      if (m.resolved) outcomeMap.set(Number(m.id), m.outcome);
    }

    // Aggregate per address
    const traders = new Map<string, {
      totalBet:     bigint;
      totalReceived:bigint;
      totalBets:    number;
      winningBets:  number;
      resolvedBets: number;
    }>();

    const ensure = (addr: string) => {
      if (!traders.has(addr)) {
        traders.set(addr, { totalBet:0n, totalReceived:0n, totalBets:0, winningBets:0, resolvedBets:0 });
      }
      return traders.get(addr)!;
    };

    for (const log of betLogs) {
      const e        = log as ethers.EventLog;
      const marketId = Number(e.args[0]);
      const bettor   = (e.args[1] as string).toLowerCase();
      const isYes    = e.args[2] as boolean;
      const gross    = e.args[3] as bigint;

      const t = ensure(bettor);
      t.totalBet  += gross;
      t.totalBets++;

      const outcome = outcomeMap.get(marketId);
      if (outcome !== undefined) {
        t.resolvedBets++;
        const won = (isYes && outcome === 1) || (!isYes && outcome === 2);
        if (won) t.winningBets++;
      }
    }

    for (const log of claimLogs) {
      const e      = log as ethers.EventLog;
      const addr   = (e.args[1] as string).toLowerCase();
      const amount = e.args[2] as bigint;
      ensure(addr).totalReceived += amount;
    }

    for (const log of refundLogs) {
      const e      = log as ethers.EventLog;
      const addr   = (e.args[1] as string).toLowerCase();
      const amount = e.args[2] as bigint;
      ensure(addr).totalReceived += amount;
    }

    // Build sorted leaderboard
    const entries: LeaderboardEntry[] = Array.from(traders.entries())
      .map(([address, t]) => {
        const pnlRaw  = Number(t.totalReceived - t.totalBet) / 1e18;
        const accuracy = t.resolvedBets > 0 ? (t.winningBets / t.resolvedBets) * 100 : 0;
        return {
          rank:          0,
          address:       address,
          totalBet:      formatAmt(t.totalBet),
          totalReceived: formatAmt(t.totalReceived),
          pnl:           `${pnlRaw >= 0 ? "+" : ""}${pnlRaw.toFixed(2)}`,
          pnlRaw,
          accuracy:      Math.round(accuracy),
          totalBets:     t.totalBets,
          winningBets:   t.winningBets,
        };
      })
      .sort((a, b) => b.pnlRaw - a.pnlRaw)
      .slice(0, 100)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    cache = { data: entries, ts: Date.now() };
    return NextResponse.json(entries);
  } catch (err) {
    console.error("Leaderboard API error:", err);
    return NextResponse.json([]);
  }
}
