"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { MARKET_FACTORY_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, RPC_URL, INDEXER_URL } from "@/lib/config";
import { BetEvent } from "@/types";
import { formatTokenAmount } from "@/lib/market";
import { formatDistanceToNow } from "date-fns";

interface Props {
  marketId: number;
}

interface TradeRow {
  bettor:      string;
  isYes:       boolean;
  grossAmount: bigint;
  fee:         bigint;
  txHash:      string;
  timestamp:   number | null;
}

async function fetchFromIndexer(marketId: number): Promise<TradeRow[]> {
  const res = await fetch(`${INDEXER_URL}/bets/${marketId}`);
  if (!res.ok) throw new Error();
  const data: BetEvent[] = await res.json();
  return data.map((e) => ({
    bettor:      e.data.bettor,
    isYes:       e.data.isYes,
    grossAmount: BigInt(e.data.grossAmount),
    fee:         BigInt(e.data.fee),
    txHash:      e.tx_hash,
    timestamp:   e.block_timestamp,
  })).reverse();
}

async function fetchFromChain(marketId: number): Promise<TradeRow[]> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKET_FACTORY_ABI, provider);
  const filter   = contract.filters.BetPlaced(marketId);
  const logs     = await contract.queryFilter(filter, 0, "latest");

  const rows: TradeRow[] = [];
  for (const log of [...logs].reverse().slice(0, 50)) {
    const e = log as ethers.EventLog;
    const block = await provider.getBlock(log.blockNumber);
    rows.push({
      bettor:      e.args[1],
      isYes:       e.args[2],
      grossAmount: e.args[3],
      fee:         e.args[4],
      txHash:      log.transactionHash,
      timestamp:   block?.timestamp ?? null,
    });
  }
  return rows;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function TradeHistory({ marketId }: Props) {
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        const rows = INDEXER_URL
          ? await fetchFromIndexer(marketId)
          : await fetchFromChain(marketId);
        setTrades(rows);
      } catch {
        try {
          const rows = await fetchFromChain(marketId);
          setTrades(rows);
        } catch (err) {
          console.error("TradeHistory error:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [marketId]);

  return (
    <div className="card">
      <div className="px-5 py-4 border-b border-[#2a3450]">
        <h3 className="text-[#e8eaf6] font-semibold">Trade History</h3>
      </div>

      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-brand-500/30 border-t-brand-500 rounded-full" />
        </div>
      ) : trades.length === 0 ? (
        <div className="p-8 text-center text-[#546e8a] text-sm">No trades yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#546e8a] text-xs border-b border-[#2a3450]">
                <th className="text-left px-5 py-2">User</th>
                <th className="text-left px-3 py-2">Side</th>
                <th className="text-right px-3 py-2">Amount</th>
                <th className="text-right px-5 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 50).map((t, i) => (
                <tr
                  key={i}
                  className="border-b border-[#2a3450]/50 hover:bg-[#1f2744]/50 transition-colors"
                >
                  <td className="px-5 py-3 font-mono text-[#8892b0]">
                    {shortAddr(t.bettor)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`badge ${
                        t.isYes
                          ? "bg-yes/20 text-yes border border-yes/30"
                          : "bg-no/20 text-no border border-no/30"
                      }`}
                    >
                      {t.isYes ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-[#e8eaf6] font-medium">
                    {formatTokenAmount(t.grossAmount)}
                  </td>
                  <td className="px-5 py-3 text-right text-[#546e8a] text-xs">
                    {t.timestamp
                      ? formatDistanceToNow(new Date(t.timestamp * 1000), { addSuffix: true })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
