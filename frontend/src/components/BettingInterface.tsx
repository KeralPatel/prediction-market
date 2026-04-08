"use client";

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { Market, TxState, Outcome } from "@/types";
import { useWallet } from "@/context/WalletContext";
import { useFactoryContract, useTokenContract, ensureAllowance } from "@/hooks/useContract";
import { CONTRACT_ADDRESS } from "@/lib/config";
import { calcExpectedPayout, formatTokenAmount } from "@/lib/market";
import { useStore } from "@/store/useStore";
import clsx from "clsx";

interface Props {
  market:    Market;
  onSuccess: () => void;
}

const INITIAL_TX: TxState = { status: "idle", hash: null, message: null };

export default function BettingInterface({ market, onSuccess }: Props) {
  const [side,     setSide]     = useState<"YES" | "NO">("YES");
  const [amount,   setAmount]   = useState("");
  const [tx,       setTx]       = useState<TxState>(INITIAL_TX);

  const { address, isConnected, connectWallet, wrongNetwork } = useWallet();
  const { writeContract: factoryWrite, readContract: factoryRead } = useFactoryContract();
  const { writeContract: tokenWrite }  = useTokenContract();
  const { tokenSymbol } = useStore();

  const now      = Math.floor(Date.now() / 1000);
  const isEnded  = now >= market.endTime;
  const disabled = market.resolved || isEnded || wrongNetwork;

  // ── Calculate expected payout ─────────────────────────────────────────────

  const amountBig = (() => {
    try {
      return amount ? ethers.parseEther(amount) : 0n;
    } catch {
      return 0n;
    }
  })();

  let tradeFeePercent = 50n; // default 0.5%
  const expectedPayout = calcExpectedPayout(amountBig, side === "YES", market, tradeFeePercent);
  const fee            = (amountBig * tradeFeePercent) / 10000n;
  const netBet         = amountBig - fee;

  // ── Place Bet ─────────────────────────────────────────────────────────────

  const placeBet = useCallback(async () => {
    if (!isConnected) { connectWallet(); return; }
    if (!factoryWrite || !tokenWrite || !address) return;
    if (!amount || amountBig === 0n) return;

    setTx({ status: "approving", hash: null, message: "Approving token spending…" });

    try {
      // 1) Read trade fee from contract
      let feeBps = 50n;
      if (factoryRead) {
        try {
          feeBps = await (factoryRead as unknown as { tradeFeePercent: () => Promise<bigint> }).tradeFeePercent();
          tradeFeePercent = feeBps;
        } catch {}
      }

      // 2) Ensure allowance (approve MaxUint256 for UX)
      await ensureAllowance(tokenWrite, address, CONTRACT_ADDRESS, amountBig);

      setTx({ status: "pending", hash: null, message: "Confirming transaction…" });

      // 3) Place bet
      const fn = side === "YES" ? "betYes" : "betNo";
      const tx2 = await (factoryWrite as Record<string, Function>)[fn](market.id, amountBig);
      setTx({ status: "pending", hash: tx2.hash, message: "Waiting for confirmation…" });

      await tx2.wait();

      setTx({ status: "success", hash: tx2.hash, message: "Bet placed successfully!" });
      setAmount("");
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const friendly = msg.includes("user rejected")
        ? "Transaction rejected."
        : msg.includes("Amount below minimum bet")
        ? "Amount is below the minimum bet."
        : "Transaction failed. Please try again.";
      setTx({ status: "error", hash: null, message: friendly });
    }
  }, [
    isConnected, connectWallet, factoryWrite, tokenWrite, address,
    amount, amountBig, side, market.id, factoryRead, onSuccess,
  ]);

  const quickAmounts = ["5", "10", "50", "100"];

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-[#e8eaf6] font-semibold">Place Bet</h3>

      {/* Side selector */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide("YES")}
          className={clsx(
            "py-3 rounded-xl font-bold text-lg transition-all",
            side === "YES"
              ? "bg-yes text-white shadow-lg shadow-yes/20"
              : "bg-[#1a2035] text-[#8892b0] border border-[#2a3450] hover:border-yes/50"
          )}
        >
          YES
          <div className="text-xs font-normal opacity-75 mt-0.5">
            {market.yesProb.toFixed(1)}% chance
          </div>
        </button>
        <button
          onClick={() => setSide("NO")}
          className={clsx(
            "py-3 rounded-xl font-bold text-lg transition-all",
            side === "NO"
              ? "bg-no text-white shadow-lg shadow-no/20"
              : "bg-[#1a2035] text-[#8892b0] border border-[#2a3450] hover:border-no/50"
          )}
        >
          NO
          <div className="text-xs font-normal opacity-75 mt-0.5">
            {market.noProb.toFixed(1)}% chance
          </div>
        </button>
      </div>

      {/* Amount input */}
      <div className="space-y-2">
        <label className="text-sm text-[#8892b0]">Amount ({tokenSymbol})</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={disabled}
            className="input pr-16 text-lg font-medium"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#546e8a] text-sm">
            {tokenSymbol}
          </span>
        </div>
        {/* Quick amounts */}
        <div className="flex gap-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className="flex-1 py-1 text-xs rounded-lg bg-[#1a2035] border border-[#2a3450] text-[#8892b0] hover:text-[#e8eaf6] hover:border-[#3a4870] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Order summary */}
      {amountBig > 0n && (
        <div className="bg-[#0a0f1a] rounded-xl p-3 space-y-2 text-sm border border-[#1e293b]">
          {/* Implied odds */}
          <div className="flex justify-between items-center pb-2 border-b border-[#1e293b]">
            <span className="text-[#64748b]">Implied odds</span>
            <span className="font-bold text-base" style={{ color: side === "YES" ? "#10b981" : "#ef4444" }}>
              {side === "YES"
                ? market.yesProb > 0 ? `${(100 / market.yesProb).toFixed(2)}x` : "—"
                : market.noProb  > 0 ? `${(100 / market.noProb).toFixed(2)}x`  : "—"}
            </span>
          </div>
          <div className="flex justify-between text-[#8892b0]">
            <span>Trade fee (0.5%)</span>
            <span className="text-[#e2e8f0]">{formatTokenAmount(fee)} {tokenSymbol}</span>
          </div>
          <div className="flex justify-between text-[#8892b0]">
            <span>Net bet</span>
            <span className="text-[#e2e8f0]">{formatTokenAmount(netBet)} {tokenSymbol}</span>
          </div>
          <div className="flex justify-between font-semibold border-t border-[#1e293b] pt-2">
            <span className="text-[#94a3b8]">Potential payout</span>
            <span style={{ color: side === "YES" ? "#10b981" : "#ef4444" }}>
              {formatTokenAmount(expectedPayout)} {tokenSymbol}
            </span>
          </div>
        </div>
      )}

      {/* Status messages */}
      {tx.status === "approving" && (
        <div className="text-xs text-[#8892b0] flex items-center gap-2">
          <span className="animate-spin inline-block w-3 h-3 border border-[#8892b0]/30 border-t-[#8892b0] rounded-full" />
          {tx.message}
        </div>
      )}
      {tx.status === "pending" && (
        <div className="text-xs text-brand-400 flex items-center gap-2">
          <span className="animate-spin inline-block w-3 h-3 border border-brand-400/30 border-t-brand-400 rounded-full" />
          {tx.message}
          {tx.hash && (
            <a
              href={`https://bscscan.com/tx/${tx.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              View
            </a>
          )}
        </div>
      )}
      {tx.status === "success" && (
        <div className="text-xs text-yes">{tx.message}</div>
      )}
      {tx.status === "error" && (
        <div className="text-xs text-no">{tx.message}</div>
      )}

      {/* CTA */}
      {disabled ? (
        <div className="text-center text-sm text-[#546e8a] py-2">
          {market.resolved
            ? "This market has been resolved."
            : wrongNetwork
            ? "Wrong network – please switch to the correct chain."
            : "This market has ended. Waiting for resolution."}
        </div>
      ) : (
        <button
          onClick={placeBet}
          disabled={
            tx.status === "approving" ||
            tx.status === "pending" ||
            (!isConnected ? false : !amount || amountBig === 0n)
          }
          className={clsx(
            "w-full py-3 rounded-xl font-bold text-base transition-all",
            !isConnected
              ? "btn-primary"
              : side === "YES"
              ? "bg-yes hover:bg-yes-dark text-white disabled:opacity-50 disabled:cursor-not-allowed"
              : "bg-no hover:bg-no-dark text-white disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {!isConnected
            ? "Connect Wallet"
            : tx.status === "approving" || tx.status === "pending"
            ? "Processing…"
            : `Bet ${side}`}
        </button>
      )}
    </div>
  );
}
