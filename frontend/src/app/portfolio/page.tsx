"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { useFactoryContract } from "@/hooks/useContract";
import { useStore } from "@/store/useStore";
import { Market, Outcome, RawBet, RawMarket } from "@/types";
import { parseMarket, formatTokenAmount, formatPool, timeRemaining, OUTCOME_LABEL } from "@/lib/market";
import clsx from "clsx";

interface Position {
  market:   Market;
  bet:      RawBet;
  payout:   bigint;
  canClaim: boolean;
  canRefund: boolean;
}

const REFUND_DELAY = 259200; // 3 days — mirrors contract default

export default function PortfolioPage() {
  const { address, isConnected, connectWallet } = useWallet();
  const { readContract, writeContract } = useFactoryContract();
  const { tokenSymbol } = useStore();

  const [positions, setPositions] = useState<Position[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [refundingId, setRefundingId] = useState<number | null>(null);
  const [txMsg, setTxMsg] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  // ── Load positions ─────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!readContract || !address) return;
    setLoading(true);
    try {
      // Get markets created by user + all markets (to find bets)
      const rawMarkets: RawMarket[] = await (readContract as unknown as {
        getAllMarkets: () => Promise<RawMarket[]>;
      }).getAllMarkets();

      const now = Math.floor(Date.now() / 1000);
      const result: Position[] = [];

      for (const raw of rawMarkets) {
        const market = parseMarket(raw);
        const bet: RawBet = await (readContract as unknown as {
          getUserBet: (id: number, addr: string) => Promise<RawBet>;
        }).getUserBet(market.id, address);

        const hasAnyBet = bet.yesAmount > 0n || bet.noAmount > 0n;
        if (!hasAnyBet) continue;

        // Can claim?
        const winBet = market.outcome === Outcome.YES ? bet.yesAmount : bet.noAmount;
        const winPool = market.outcome === Outcome.YES ? market.yesPool : market.noPool;
        const hasWinner = market.resolved &&
          ((market.outcome === Outcome.YES && bet.yesAmount > 0n) ||
           (market.outcome === Outcome.NO  && bet.noAmount  > 0n));
        const payout = hasWinner && winPool > 0n
          ? (winBet * market.totalPool) / winPool
          : 0n;

        const canClaim  = hasWinner && !bet.claimed;
        const canRefund = !market.resolved && now > market.endTime + REFUND_DELAY && !bet.claimed;

        result.push({ market, bet, payout, canClaim, canRefund });
      }

      // Sort: claimable first, then refundable, then active, then resolved
      result.sort((a, b) => {
        if (a.canClaim && !b.canClaim)   return -1;
        if (!a.canClaim && b.canClaim)   return  1;
        if (a.canRefund && !b.canRefund) return -1;
        if (!a.canRefund && b.canRefund) return  1;
        return b.market.endTime - a.market.endTime;
      });

      setPositions(result);
    } finally {
      setLoading(false);
    }
  }, [readContract, address]);

  useEffect(() => {
    if (isConnected) load();
  }, [isConnected, load]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleClaim = async (marketId: number) => {
    if (!writeContract) return;
    setClaimingId(marketId);
    setTxMsg(null);
    try {
      const tx = await (writeContract as unknown as { claim: (id: number) => Promise<{ wait: () => Promise<unknown> }> })
        .claim(marketId);
      await tx.wait();
      setTxMsg({ id: marketId, msg: "Winnings claimed!", ok: true });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxMsg({ id: marketId, msg: msg.includes("user rejected") ? "Rejected." : "Claim failed.", ok: false });
    } finally {
      setClaimingId(null);
    }
  };

  const handleRefund = async (marketId: number) => {
    if (!writeContract) return;
    setRefundingId(marketId);
    setTxMsg(null);
    try {
      const tx = await (writeContract as unknown as { refund: (id: number) => Promise<{ wait: () => Promise<unknown> }> })
        .refund(marketId);
      await tx.wait();
      setTxMsg({ id: marketId, msg: "Refund received!", ok: true });
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTxMsg({ id: marketId, msg: msg.includes("user rejected") ? "Rejected." : "Refund failed.", ok: false });
    } finally {
      setRefundingId(null);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalBet = positions.reduce(
    (s, p) => s + p.bet.yesAmount + p.bet.noAmount,
    0n
  );
  const pendingClaims = positions.filter((p) => p.canClaim);
  const totalPending  = pendingClaims.reduce((s, p) => s + p.payout, 0n);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 space-y-4">
        <div className="text-5xl">◈</div>
        <h2 className="text-xl font-bold text-[#e8eaf6]">Connect your wallet</h2>
        <p className="text-[#8892b0]">Connect your wallet to see your portfolio and positions.</p>
        <button className="btn-primary px-8 py-3" onClick={connectWallet}>
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#e8eaf6]">Portfolio</h1>
        <p className="text-[#8892b0] text-sm mt-1 font-mono">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </p>
      </div>

      {/* Summary stats */}
      {!loading && positions.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Positions",      value: positions.length.toString() },
            { label: "Total Invested", value: `${formatPool(totalBet)} ${tokenSymbol}` },
            { label: "Pending Payout", value: `${formatPool(totalPending)} ${tokenSymbol}`, highlight: totalPending > 0n },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="card p-4 text-center">
              <div className={clsx("text-xl font-bold", highlight ? "text-yes" : "text-[#e8eaf6]")}>
                {value}
              </div>
              <div className="text-xs text-[#546e8a] mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="card p-16 text-center space-y-4">
          <div className="text-4xl">◈</div>
          <p className="text-[#8892b0]">No positions yet. Browse markets and place your first bet!</p>
          <Link href="/" className="btn-primary inline-flex px-6">
            Browse Markets
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map(({ market, bet, payout, canClaim, canRefund }) => {
            const totalBetAmt = bet.yesAmount + bet.noAmount;
            const isEnded   = Date.now() / 1000 > market.endTime;
            const isActive  = !market.resolved && !isEnded;

            return (
              <div
                key={market.id}
                className={clsx(
                  "card p-5 space-y-4 transition-all",
                  canClaim && "border-yes/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/market/${market.id}`}
                    className="text-[#e8eaf6] font-semibold hover:text-brand-400 transition-colors line-clamp-1 flex-1"
                  >
                    {market.title}
                  </Link>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`badge badge-${market.category}`}>{market.category}</span>
                    {market.resolved ? (
                      <span className={clsx(
                        "badge border",
                        market.outcome === Outcome.YES
                          ? "bg-yes/20 text-yes border-yes/30"
                          : "bg-no/20 text-no border-no/30"
                      )}>
                        {OUTCOME_LABEL[market.outcome]}
                      </span>
                    ) : isEnded ? (
                      <span className="badge bg-yellow-500/10 text-yellow-400">Pending</span>
                    ) : (
                      <span className="badge bg-brand-600/10 text-brand-400">
                        {timeRemaining(market.endTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Position details */}
                <div className="flex flex-wrap gap-4 text-sm">
                  {bet.yesAmount > 0n && (
                    <div className="flex items-center gap-1.5">
                      <span className="badge bg-yes/20 text-yes border border-yes/30">YES</span>
                      <span className="text-[#e8eaf6] font-medium">
                        {formatTokenAmount(bet.yesAmount)} {tokenSymbol}
                      </span>
                    </div>
                  )}
                  {bet.noAmount > 0n && (
                    <div className="flex items-center gap-1.5">
                      <span className="badge bg-no/20 text-no border border-no/30">NO</span>
                      <span className="text-[#e8eaf6] font-medium">
                        {formatTokenAmount(bet.noAmount)} {tokenSymbol}
                      </span>
                    </div>
                  )}
                  {isActive && (
                    <div className="flex items-center gap-1 text-[#546e8a]">
                      <span>Prob:</span>
                      <span className="text-yes">{market.yesProb.toFixed(0)}%</span>
                      <span>/</span>
                      <span className="text-no">{market.noProb.toFixed(0)}%</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  {bet.claimed && (
                    <span className="text-xs text-[#546e8a]">Claimed / Refunded</span>
                  )}

                  {canClaim && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-[#8892b0]">
                        Payout:{" "}
                        <span className="text-yes font-bold">
                          {formatTokenAmount(payout)} {tokenSymbol}
                        </span>
                      </span>
                      <button
                        onClick={() => handleClaim(market.id)}
                        disabled={claimingId === market.id}
                        className="btn-yes py-1.5 px-4 text-sm"
                      >
                        {claimingId === market.id ? "Claiming…" : "Claim"}
                      </button>
                    </div>
                  )}

                  {canRefund && (
                    <button
                      onClick={() => handleRefund(market.id)}
                      disabled={refundingId === market.id}
                      className="btn-secondary py-1.5 px-4 text-sm"
                    >
                      {refundingId === market.id ? "Refunding…" : "Refund"}
                    </button>
                  )}

                  {txMsg && txMsg.id === market.id && (
                    <span className={`text-xs ${txMsg.ok ? "text-yes" : "text-no"}`}>
                      {txMsg.msg}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
