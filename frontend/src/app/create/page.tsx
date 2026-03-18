"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { useWallet } from "@/context/WalletContext";
import { useFactoryContract, useTokenContract, ensureAllowance } from "@/hooks/useContract";
import { CONTRACT_ADDRESS, CREATION_FEE } from "@/lib/config";
import { useStore } from "@/store/useStore";
import { CATEGORIES, Category, TxState } from "@/types";
import clsx from "clsx";

const INITIAL_TX: TxState = { status: "idle", hash: null, message: null };

const CATEGORY_OPTIONS = CATEGORIES.filter((c) => c !== "all");

// Minimum end time: 1 hour from now
function minEndTime(): string {
  const d = new Date(Date.now() + 3600 * 1000);
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16);
}

export default function CreatePage() {
  const router  = useRouter();
  const { address, isConnected, connectWallet, wrongNetwork } = useWallet();
  const { writeContract: factoryWrite, readContract: factoryRead } = useFactoryContract();
  const { writeContract: tokenWrite }  = useTokenContract();
  const { tokenSymbol } = useStore();

  const [title,    setTitle]    = useState("");
  const [desc,     setDesc]     = useState("");
  const [category, setCategory] = useState<Category>("crypto");
  const [endTime,  setEndTime]  = useState("");
  const [tx,       setTx]       = useState<TxState>(INITIAL_TX);

  const creationFeeDisplay = CREATION_FEE;

  // ── Validation ────────────────────────────────────────────────────────────

  const errors: string[] = [];
  if (!title.trim())           errors.push("Title is required.");
  if (title.length > 200)      errors.push("Title must be under 200 characters.");
  if (!desc.trim())            errors.push("Description is required.");
  if (!endTime)                errors.push("End time is required.");
  if (endTime) {
    const ts = new Date(endTime).getTime();
    if (ts <= Date.now() + 3600_000) errors.push("End time must be at least 1 hour from now.");
  }

  const canSubmit =
    errors.length === 0 &&
    tx.status !== "approving" &&
    tx.status !== "pending";

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected) { connectWallet(); return; }
      if (!factoryWrite || !tokenWrite || !address) return;
      if (wrongNetwork) return;
      if (!canSubmit) return;

      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

      setTx({ status: "approving", hash: null, message: "Approving token spending…" });

      try {
        // Get creation fee from contract (source of truth)
        let fee = ethers.parseEther(CREATION_FEE);
        if (factoryRead) {
          try {
            fee = await (factoryRead as unknown as { creationFee: () => Promise<bigint> }).creationFee();
          } catch {}
        }

        // Approve if needed
        if (fee > 0n) {
          await ensureAllowance(tokenWrite, address, CONTRACT_ADDRESS, fee);
        }

        setTx({ status: "pending", hash: null, message: "Creating market…" });

        const tx2 = await (factoryWrite as unknown as {
          createMarket: (
            title: string,
            description: string,
            category: string,
            endTime: number
          ) => Promise<{ hash: string; wait: () => Promise<{ logs: unknown[] }> }>;
        }).createMarket(title.trim(), desc.trim(), category, endTimestamp);

        setTx({ status: "pending", hash: tx2.hash, message: "Waiting for confirmation…" });

        const receipt = await tx2.wait();

        setTx({ status: "success", hash: tx2.hash, message: "Market created successfully!" });

        // Navigate to the new market after a short delay
        setTimeout(() => router.push("/"), 1500);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const friendly = msg.includes("user rejected")
          ? "Transaction rejected."
          : msg.includes("End time must be in future")
          ? "End time is in the past."
          : "Failed to create market. Please try again.";
        setTx({ status: "error", hash: null, message: friendly });
      }
    },
    [
      isConnected, connectWallet, factoryWrite, tokenWrite, address, wrongNetwork,
      canSubmit, title, desc, category, endTime, factoryRead, router,
    ]
  );

  const isBusy = tx.status === "approving" || tx.status === "pending";

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#e8eaf6]">Create a Market</h1>
        <p className="text-[#8892b0] mt-1 text-sm">
          Ask a question about the future. Anyone can bet on YES or NO.
          Creation fee: {creationFeeDisplay} {tokenSymbol}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#e8eaf6]">
            Question <span className="text-no">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Will Bitcoin reach $200,000 before 2027?"
            maxLength={200}
            className="input"
            disabled={isBusy}
          />
          <div className="flex justify-between text-xs text-[#546e8a]">
            <span>Frame as a YES/NO question</span>
            <span>{title.length}/200</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#e8eaf6]">
            Resolution Criteria <span className="text-no">*</span>
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="This market resolves YES if BTC/USD price reaches $200,000 on any major exchange before the market end date."
            rows={4}
            className="textarea"
            disabled={isBusy}
          />
          <p className="text-xs text-[#546e8a]">
            Be precise. Describe exactly what conditions resolve YES or NO.
          </p>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#e8eaf6]">Category</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                disabled={isBusy}
                className={clsx(
                  "py-2 rounded-lg text-sm font-medium transition-all border capitalize",
                  category === cat
                    ? "bg-brand-600/20 text-brand-400 border-brand-600/40"
                    : "bg-[#0f1117] text-[#8892b0] border-[#2a3450] hover:border-[#3a4870]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* End time */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#e8eaf6]">
            Market End Date <span className="text-no">*</span>
          </label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            min={minEndTime()}
            className="input"
            disabled={isBusy}
          />
          <p className="text-xs text-[#546e8a]">
            After this date, no more bets can be placed. The admin resolves the market.
          </p>
        </div>

        {/* Fee notice */}
        <div className="bg-brand-600/5 border border-brand-600/20 rounded-xl p-3 text-sm text-[#8892b0] space-y-1">
          <div className="flex justify-between">
            <span>Creation fee</span>
            <span className="text-[#e8eaf6] font-medium">
              {creationFeeDisplay} {tokenSymbol}
            </span>
          </div>
          <p className="text-xs text-[#546e8a]">
            The fee is paid to the treasury when the market is created.
            You will be prompted to approve the token transfer first.
          </p>
        </div>

        {/* Validation errors */}
        {errors.length > 0 && title && (
          <ul className="space-y-1">
            {errors.map((e) => (
              <li key={e} className="text-xs text-no">{e}</li>
            ))}
          </ul>
        )}

        {/* Status */}
        {isBusy && (
          <div className="flex items-center gap-2 text-sm text-brand-400">
            <span className="animate-spin w-4 h-4 border-2 border-brand-400/30 border-t-brand-400 rounded-full" />
            {tx.message}
          </div>
        )}
        {tx.status === "success" && (
          <div className="text-sm text-yes">{tx.message} Redirecting…</div>
        )}
        {tx.status === "error" && (
          <div className="text-sm text-no">{tx.message}</div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={(!isConnected ? false : !canSubmit || isBusy || wrongNetwork)}
          className="w-full btn-primary py-3 text-base font-bold"
        >
          {!isConnected
            ? "Connect Wallet to Create"
            : wrongNetwork
            ? "Wrong Network"
            : isBusy
            ? "Creating…"
            : `Create Market (${creationFeeDisplay} ${tokenSymbol})`}
        </button>
      </form>
    </div>
  );
}
