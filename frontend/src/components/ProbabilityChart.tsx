"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ethers } from "ethers";
import { MARKET_FACTORY_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS, RPC_URL, INDEXER_URL } from "@/lib/config";
import { ProbabilityPoint } from "@/types";
import { format } from "date-fns";

interface Props {
  marketId: number;
}

interface ChartPoint {
  time:    string;
  yes:     number;
  no:      number;
  rawTime: number;
}

// ─── Fetch from indexer (preferred) or derive from on-chain events ─────────

async function fetchFromIndexer(marketId: number): Promise<ChartPoint[]> {
  const res = await fetch(`${INDEXER_URL}/probability/${marketId}`);
  if (!res.ok) throw new Error("Indexer unavailable");
  const data: ProbabilityPoint[] = await res.json();
  return data.map((p) => ({
    time:    p.timestamp ? format(new Date(p.timestamp * 1000), "MMM d HH:mm") : `Block ${p.blockNumber}`,
    yes:     p.yesProbBps / 100,
    no:      p.noProbBps  / 100,
    rawTime: p.timestamp || p.blockNumber,
  }));
}

async function fetchFromChain(marketId: number): Promise<ChartPoint[]> {
  const provider  = new ethers.JsonRpcProvider(RPC_URL);
  const contract  = new ethers.Contract(CONTRACT_ADDRESS, MARKET_FACTORY_ABI, provider);

  const filter    = contract.filters.BetPlaced(marketId);
  const logs      = await contract.queryFilter(filter, 0, "latest");

  let yesPool = 0n;
  let noPool  = 0n;
  const points: ChartPoint[] = [];

  for (const log of logs) {
    const event = log as ethers.EventLog;
    const isYes: boolean = event.args[2];
    const gross: bigint  = event.args[3];
    const fee:   bigint  = event.args[4];
    const net           = gross - fee;

    if (isYes) yesPool += net;
    else       noPool  += net;

    const total    = yesPool + noPool;
    const yesBps   = total > 0n ? Number((yesPool * 10000n) / total) : 5000;
    const block    = await provider.getBlock(log.blockNumber);

    points.push({
      time:    block ? format(new Date(block.timestamp * 1000), "MMM d HH:mm") : `Block ${log.blockNumber}`,
      yes:     yesBps / 100,
      no:      (10000 - yesBps) / 100,
      rawTime: block ? block.timestamp : log.blockNumber,
    });
  }

  return points;
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number; color: string; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2035] border border-[#2a3450] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#546e8a] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toFixed(1)}%
        </p>
      ))}
    </div>
  );
}

// ─── Chart Component ───────────────────────────────────────────────────────

export default function ProbabilityChart({ marketId }: Props) {
  const [data, setData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"probability" | "volume">("probability");

  useEffect(() => {
    setLoading(true);

    const load = async () => {
      try {
        const points = INDEXER_URL
          ? await fetchFromIndexer(marketId)
          : await fetchFromChain(marketId);
        setData(points);
      } catch {
        try {
          const points = await fetchFromChain(marketId);
          setData(points);
        } catch (err) {
          console.error("Chart data fetch failed:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [marketId]);

  if (loading) {
    return (
      <div className="card p-6 h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="card p-6 h-64 flex items-center justify-center text-[#546e8a]">
        No bet history yet. Be the first to place a bet!
      </div>
    );
  }

  // Add starting 50/50 point
  const chartData = [{ time: "Start", yes: 50, no: 50, rawTime: 0 }, ...data];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#e8eaf6] font-semibold">Probability History</h3>
        <div className="flex gap-1">
          {(["probability"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-brand-600/20 text-brand-400"
                  : "text-[#546e8a] hover:text-[#8892b0]"
              }`}
            >
              Probability
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="yesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
            </linearGradient>
            <linearGradient id="noGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3450" />
          <XAxis
            dataKey="time"
            tick={{ fill: "#546e8a", fontSize: 11 }}
            axisLine={{ stroke: "#2a3450" }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#546e8a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "12px", color: "#8892b0" }}
            formatter={(value) => value.toUpperCase()}
          />
          <Area
            type="monotone"
            dataKey="yes"
            name="yes"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#yesGrad)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="no"
            name="no"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#noGrad)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
