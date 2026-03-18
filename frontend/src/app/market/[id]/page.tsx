"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Market, Outcome, TxState } from "@/types";
import { useSingleMarket } from "@/hooks/useMarkets";
import { useFactoryContract } from "@/hooks/useContract";
import { useWallet } from "@/context/WalletContext";
import { useStore } from "@/store/useStore";
import { formatPool, formatTokenAmount, timeRemaining, OUTCOME_LABEL } from "@/lib/market";
import BettingInterface from "@/components/BettingInterface";
import ProbabilityChart from "@/components/ProbabilityChart";
import TradeHistory from "@/components/TradeHistory";
import clsx from "clsx";

const INITIAL_TX: TxState = { status: "idle", hash: null, message: null };

export default function MarketPage() {
  const params  = useParams();
  const router  = useRouter();
  const marketId = Number(params.id);

  const [market,    setMarket]    = useState<Market | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [userBet,   setUserBet]   = useState<{ yesAmount: bigint; noAmount: bigint; claimed: boolean } | null>(null);
  const [claimTx,   setClaimTx]   = useState<TxState>(INITIAL_TX);
  const [refundTx,  setRefundTx]  = useState<TxState>(INITIAL_TX);
  const [resolveTx, setResolveTx] = useState<TxState>(INITIAL_TX);
  const [isOwner,   setIsOwner]   = useState(false);
  const [resolveOutcome, setResolveOutcome] = useState<"1" | "2">("1");

  const { fetchMarket }   = useSingleMarket(marketId);
  const { readContract, writeContract } = useFactoryContract();
  const { address, isConnected } = useWallet();
  const { tokenSymbol }   = useStore();

  // ── Load market ───────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!marketId) return;
    setLoading(true);
    try {
      const m = await fetchMarket();
      if (!m) { router.push("/"); return; }
      setMarket(m);

      // Load user bet
      if (address && readContract) {
        const bet = await (readContract as unknown as {
          getUserBet: (id: number, addr: string) => Promise<{ yesAmount: bigint; noAmount: bigint; claimed: boolean }>;
        }).getUserBet(marketId, address);
        setUserBet(bet);
      }

      // Check if user is owner
      if (address && readContract) {
        try {
          const owner: string = await (readContract as unknown as { owner: () => Promise<string> }).owner();
          setIsOwner(owner.toLowerCase() === address.toLowerCase());
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, [marketId, fetchMarket, address, readContract, router]);

  useEffect(() => { load(); }, [load]);

  // ── Claim ─────────────────────────────────────────────────────────────────

  const handleClaim = async () => {
    if (!writeContract) return;
    setClaimTx({ status: "pending", hash: null, message: "Claiming winnings…" });
    try {
      const tx = await (writeContract as unknown as { claim: (id: number) => Promise<{ hash: string; wait: () => Promise<unknown> }> }).claim(marketId);
      setClaimTx({ status: "pending", hash: tx.hash, message: "Waiting for confirmation…" });
      await tx.wait();
      setClaimTx({ status: "success", hash: tx.hash, message: "Winnings claimed!" });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setClaimTx({ status: "error", hash: null, message: msg.includes("user rejected") ? "Rejected." : "Claim failed." });
    }
  };

  // ── Refund ────────────────────────────────────────────────────────────────

  const handleRefund = async () => {
    if (!writeContract) return;
    setRefundTx({ status: "pending", hash: null, message: "Requesting refund…" });
    try {
      const tx = await (writeContract as unknown as { refund: (id: number) => Promise<{ hash: string; wait: () => Promise<unknown> }> }).refund(marketId);
      setRefundTx({ status: "pending", hash: tx.hash, message: "Waiting for confirmation…" });
      await tx.wait();
      setRefundTx({ status: "success", hash: tx.hash, message: "Refunded!" });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setRefundTx({ status: "error", hash: null, message: msg.includes("user rejected") ? "Rejected." : "Refund failed." });
    }
  };

  // ── Resolve (admin) ───────────────────────────────────────────────────────

  const handleResolve = async () => {
    if (!writeContract) return;
    setResolveTx({ status: "pending", hash: null, message: "Resolving market…" });
    try {
      const tx = await (writeContract as unknown as {
        resolveMarket: (id: number, outcome: number) => Promise<{ hash: string; wait: () => Promise<unknown> }>;
      }).resolveMarket(marketId, Number(resolveOutcome));
      setResolveTx({ status: "pending", hash: tx.hash, message: "Waiting for confirmation…" });
      await tx.wait();
      setResolveTx({ status: "success", hash: tx.hash, message: "Market resolved!" });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResolveTx({ status: "error", hash: null, message: msg.includes("user rejected") ? "Rejected." : "Resolution failed." });
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin w-10 h-10 border-2 border-brand-500/30 border-t-brand-500 rounded-full" />
      </div>
    );
  }

  if (!market) return null;

  const now       = Math.floor(Date.now() / 1000);
  const isEnded   = now >= market.endTime;
  const refundAvailableAt = market.endTime + 259200; // 3 days default
  const canRefund = !market.resolved && now > refundAvailableAt;

  const userTotalBet = userBet ? userBet.yesAmount + userBet.noAmount : 0n;
  const hasWinningBet = userBet && market.resolved && (
    (market.outcome === Outcome.YES && userBet.yesAmount > 0n) ||
    (market.outcome === Outcome.NO  && userBet.noAmount  > 0n)
  );

  const winningPool  = market.outcome === Outcome.YES ? market.yesPool : market.noPool;
  const userWinBet   = market.outcome === Outcome.YES ? (userBet?.yesAmount ?? 0n) : (userBet?.noAmount ?? 0n);
  const potentialPayout = winningPool > 0n && hasWinningBet
    ? (userWinBet * market.totalPool) / winningPool
    : 0n;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#546e8a]">
        <Link href="/" className="hover:text-[#8892b0] transition-colors">Markets</Link>
        <span>/</span>
        <span className="text-[#8892b0] truncate max-w-xs">{market.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: market info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Market header */}
          <div className="card p-6 space-y-4">
            <div className="flex items-start gap-3 flex-wrap">
              <span className={`badge-${market.category} badge`}>{market.category}</span>
              {market.resolved ? (
                <span className={clsx(
                  "badge border",
                  market.outcome === Outcome.YES
                    ? "bg-yes/20 text-yes border-yes/30"
                    : "bg-no/20 text-no border-no/30"
                )}>
                  Resolved: {OUTCOME_LABEL[market.outcome]}
                </span>
              ) : isEnded ? (
                <span className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  Awaiting Resolution
                </span>
              ) : (
                <span className="badge bg-brand-600/10 text-brand-400 border border-brand-600/20">
                  Active · {timeRemaining(market.endTime)}
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold text-[#e8eaf6] leading-snug">
              {market.title}
            </h1>

            <p className="text-[#8892b0] text-sm leading-relaxed">
              {market.description}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#2a3450]">
              {[
                { label: "Total Liquidity", value: `${formatPool(market.totalPool)} ${tokenSymbol}` },
                { label: "Volume",          value: `${formatPool(market.totalVolume)} ${tokenSymbol}` },
                { label: "YES Pool",        value: `${formatPool(market.yesPool)} ${tokenSymbol}`, color: "text-yes" },
                { label: "NO Pool",         value: `${formatPool(market.noPool)} ${tokenSymbol}`,  color: "text-no" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="text-[#546e8a] text-xs mb-0.5">{label}</div>
                  <div className={clsx("font-semibold text-sm", color ?? "text-[#e8eaf6]")}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Probability display */}
          <div className="card p-5 space-y-3">
            <h3 className="text-[#e8eaf6] font-semibold">Current Probabilities</h3>
            <div className="flex gap-0.5 h-4 rounded-full overflow-hidden bg-[#0f1117]">
              <div className="bg-yes transition-all duration-500" style={{ width: `${market.yesProb}%` }} />
              <div className="bg-no  transition-all duration-500" style={{ width: `${market.noProb}%` }}  />
            </div>
            <div className="flex justify-between">
              <div>
                <div className="text-yes text-2xl font-bold">{market.yesProb.toFixed(1)}%</div>
                <div className="text-[#546e8a] text-xs">YES</div>
              </div>
              <div className="text-right">
                <div className="text-no text-2xl font-bold">{market.noProb.toFixed(1)}%</div>
                <div className="text-[#546e8a] text-xs">NO</div>
              </div>
            </div>
          </div>

          {/* Chart */}
          <ProbabilityChart marketId={market.id} />

          {/* Trade history */}
          <TradeHistory marketId={market.id} />
        </div>

        {/* Right: betting + position */}
        <div className="space-y-4">
          {/* Betting */}
          <BettingInterface market={market} onSuccess={load} />

          {/* User position */}
          {isConnected && userTotalBet > 0n && (
            <div className="card p-5 space-y-3">
              <h3 className="text-[#e8eaf6] font-semibold">Your Position</h3>
              {userBet && userBet.yesAmount > 0n && (
                <div className="flex justify-between text-sm">
                  <span className="text-yes">YES</span>
                  <span className="text-[#e8eaf6] font-medium">
                    {formatTokenAmount(userBet.yesAmount)} {tokenSymbol}
                  </span>
                </div>
              )}
              {userBet && userBet.noAmount > 0n && (
                <div className="flex justify-between text-sm">
                  <span className="text-no">NO</span>
                  <span className="text-[#e8eaf6] font-medium">
                    {formatTokenAmount(userBet.noAmount)} {tokenSymbol}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-[#2a3450] pt-2">
                <span className="text-[#546e8a]">Total bet</span>
                <span className="text-[#e8eaf6] font-bold">
                  {formatTokenAmount(userTotalBet)} {tokenSymbol}
                </span>
              </div>

              {/* Claim button */}
              {hasWinningBet && !userBet?.claimed && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#546e8a]">Payout</span>
                    <span className="text-yes font-bold">
                      {formatTokenAmount(potentialPayout)} {tokenSymbol}
                    </span>
                  </div>
                  <button
                    onClick={handleClaim}
                    disabled={claimTx.status === "pending"}
                    className="w-full btn-yes py-2.5"
                  >
                    {claimTx.status === "pending" ? "Claiming…" : "Claim Winnings"}
                  </button>
                  {claimTx.message && (
                    <p className={`text-xs ${claimTx.status === "error" ? "text-no" : "text-yes"}`}>
                      {claimTx.message}
                    </p>
                  )}
                </div>
              )}

              {userBet?.claimed && (
                <div className="text-xs text-[#546e8a] text-center">
                  Already claimed / refunded.
                </div>
              )}

              {/* Refund button */}
              {canRefund && !userBet?.claimed && (
                <div className="space-y-2 border-t border-[#2a3450] pt-3">
                  <p className="text-xs text-[#8892b0]">
                    Market unresolved past deadline. You can request a refund.
                  </p>
                  <button
                    onClick={handleRefund}
                    disabled={refundTx.status === "pending"}
                    className="w-full btn-secondary py-2.5"
                  >
                    {refundTx.status === "pending" ? "Refunding…" : "Request Refund"}
                  </button>
                  {refundTx.message && (
                    <p className={`text-xs ${refundTx.status === "error" ? "text-no" : "text-yes"}`}>
                      {refundTx.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin: resolve panel */}
          {isOwner && !market.resolved && (
            <div className="card p-5 space-y-3 border-yellow-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <h3 className="text-yellow-400 font-semibold text-sm">Admin: Resolve Market</h3>
              </div>
              <div className="flex gap-2">
                {(["1", "2"] as const).map((val) => (
                  <button
                    key={val}
                    onClick={() => setResolveOutcome(val)}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                      resolveOutcome === val
                        ? val === "1"
                          ? "bg-yes/20 text-yes border-yes/40"
                          : "bg-no/20 text-no border-no/40"
                        : "bg-[#1a2035] text-[#8892b0] border-[#2a3450]"
                    )}
                  >
                    {val === "1" ? "YES" : "NO"}
                  </button>
                ))}
              </div>
              <button
                onClick={handleResolve}
                disabled={resolveTx.status === "pending"}
                className="w-full btn-secondary py-2"
              >
                {resolveTx.status === "pending" ? "Resolving…" : "Resolve"}
              </button>
              {resolveTx.message && (
                <p className={`text-xs ${resolveTx.status === "error" ? "text-no" : "text-yes"}`}>
                  {resolveTx.message}
                </p>
              )}
            </div>
          )}

          {/* Market meta */}
          <div className="card p-4 space-y-2 text-xs text-[#546e8a]">
            <div className="flex justify-between">
              <span>Market ID</span>
              <span className="text-[#8892b0] font-mono">#{market.id}</span>
            </div>
            <div className="flex justify-between">
              <span>Creator</span>
              <span className="font-mono">{market.creator.slice(0, 6)}…{market.creator.slice(-4)}</span>
            </div>
            <div className="flex justify-between">
              <span>End date</span>
              <span>{new Date(market.endTime * 1000).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span>{new Date(market.createdAt * 1000).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
