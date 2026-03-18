"use client";

import { useWallet } from "@/context/WalletContext";
import { getChainInfo } from "@/lib/config";
import clsx from "clsx";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  const {
    address,
    chainId,
    isConnected,
    isConnecting,
    wrongNetwork,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  if (isConnecting) {
    return (
      <button className="btn-primary opacity-75 cursor-wait" disabled>
        <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
        Connecting…
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button className="btn-primary" onClick={connectWallet}>
        Connect Wallet
      </button>
    );
  }

  const chainInfo = getChainInfo(chainId ?? undefined);

  return (
    <div className="flex items-center gap-2">
      {wrongNetwork && (
        <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-lg border border-red-400/20">
          Wrong Network
        </span>
      )}

      {!wrongNetwork && chainInfo && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-[#8892b0] bg-[#1a2035] px-2 py-1 rounded-lg border border-[#2a3450]">
          <span
            className={clsx(
              "w-1.5 h-1.5 rounded-full",
              wrongNetwork ? "bg-red-400" : "bg-green-400"
            )}
          />
          {chainInfo.shortName}
        </span>
      )}

      <div className="relative group">
        <button className="btn-secondary font-mono text-sm">
          {shortAddress(address!)}
        </button>

        {/* Dropdown */}
        <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a2035] border border-[#2a3450] rounded-xl shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-[#8892b0] hover:text-[#e8eaf6] hover:bg-[#1f2744] rounded-xl transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(address!);
            }}
          >
            Copy address
          </button>
          <button
            className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-[#1f2744] rounded-xl transition-colors"
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
