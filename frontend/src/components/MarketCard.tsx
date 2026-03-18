"use client";

import Link from "next/link";
import { Market, Outcome } from "@/types";
import { formatPool, timeRemaining } from "@/lib/market";
import { useStore } from "@/store/useStore";
import clsx from "clsx";

interface Props {
  market: Market;
}

const CATEGORY_BADGE: Record<string, string> = {
  crypto:   "badge-crypto",
  sports:   "badge-sports",
  politics: "badge-politics",
  AI:       "badge-AI",
  finance:  "badge-finance",
};

function OutcomeChip({ outcome }: { outcome: Outcome }) {
  if (outcome === Outcome.YES)
    return (
      <span className="badge bg-yes/20 text-yes border border-yes/30 text-xs">
        Resolved YES
      </span>
    );
  if (outcome === Outcome.NO)
    return (
      <span className="badge bg-no/20 text-no border border-no/30 text-xs">
        Resolved NO
      </span>
    );
  return null;
}

export default function MarketCard({ market }: Props) {
  const { tokenSymbol } = useStore();
  const badgeClass = CATEGORY_BADGE[market.category] || "badge-default";
  const isEnded    = Date.now() / 1000 > market.endTime;
  const remaining  = timeRemaining(market.endTime);
  const totalPoolFormatted = formatPool(market.totalPool);

  return (
    <Link href={`/market/${market.id}`} className="block">
      <div className="card-hover p-5 flex flex-col gap-4 h-full cursor-pointer animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            <span className={badgeClass}>{market.category}</span>
            {market.resolved && <OutcomeChip outcome={market.outcome} />}
            {!market.resolved && isEnded && (
              <span className="badge bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                Pending Resolution
              </span>
            )}
          </div>
          <span
            className={clsx(
              "text-xs whitespace-nowrap",
              isEnded ? "text-[#546e8a]" : "text-[#8892b0]"
            )}
          >
            {remaining}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[#e8eaf6] font-semibold text-base leading-snug line-clamp-2">
          {market.title}
        </h3>

        {/* Probability bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-yes font-semibold">YES {market.yesProb.toFixed(1)}%</span>
            <span className="text-no  font-semibold">NO {market.noProb.toFixed(1)}%</span>
          </div>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-[#0f1117]">
            <div
              className="prob-bar-yes"
              style={{ width: `${market.yesProb}%` }}
            />
            <div
              className="prob-bar-no"
              style={{ width: `${market.noProb}%` }}
            />
          </div>
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between text-sm text-[#8892b0] pt-1 border-t border-[#2a3450]">
          <div className="flex items-center gap-1">
            <span className="text-[#546e8a] text-xs">Liquidity</span>
            <span className="text-[#e8eaf6] font-medium">
              {totalPoolFormatted} {tokenSymbol}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#546e8a] text-xs">Vol.</span>
            <span className="text-[#e8eaf6] font-medium">
              {formatPool(market.totalVolume)} {tokenSymbol}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
