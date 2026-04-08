"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { getChainInfo } from "@/lib/config";

function shortAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  const router = useRouter();
  const {
    address, chainId, isConnected, isConnecting, wrongNetwork,
    connectWallet, disconnectWallet,
  } = useWallet();

  if (isConnecting) {
    return (
      <button
        disabled
        style={{
          background: "transparent", border: "1px solid #10b981", color: "#10b981",
          padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          cursor: "wait", opacity: 0.7, display: "flex", alignItems: "center", gap: 8,
        }}
      >
        <span style={{
          width: 14, height: 14, border: "2px solid #10b98144",
          borderTopColor: "#10b981", borderRadius: "50%",
          display: "inline-block", animation: "spin 0.8s linear infinite",
        }} />
        Connecting…
      </button>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        style={{
          background: "transparent", border: "1px solid #10b981", color: "#10b981",
          padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        Connect Wallet
      </button>
    );
  }

  const chainInfo = getChainInfo(chainId ?? undefined);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {wrongNetwork ? (
        <span style={{
          fontSize: 11, color: "#f87171", background: "rgba(239,68,68,0.1)",
          padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)",
        }}>
          Wrong Network
        </span>
      ) : chainInfo && (
        <span style={{
          display: "flex", alignItems: "center", gap: 4, fontSize: 11,
          color: "#94a3b8", background: "#111827", padding: "3px 8px",
          borderRadius: 6, border: "1px solid #1e293b",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
          {chainInfo.shortName}
        </span>
      )}

      {/* Address dropdown */}
      <div style={{ position: "relative" }} className="group">
        <button style={{
          background: "#111827", border: "1px solid #1e293b", color: "#e2e8f0",
          padding: "8px 14px", borderRadius: 8, fontSize: 13, fontFamily: "monospace",
          cursor: "pointer",
        }}>
          {shortAddress(address!)}
        </button>

        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)",
          width: 176, background: "#111827", border: "1px solid #1e293b",
          borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 50,
        }} className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
          <button
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer", borderRadius: "12px 12px 0 0" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#162033")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => navigator.clipboard.writeText(address!)}
          >
            Copy address
          </button>
          <button
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#162033")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => router.push("/portfolio")}
          >
            Portfolio
          </button>
          <button
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "#94a3b8", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#162033")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={() => router.push("/create")}
          >
            Create Market
          </button>
          <button
            style={{ width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 13, color: "#f87171", background: "transparent", border: "none", cursor: "pointer", borderRadius: "0 0 12px 12px" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#162033")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            onClick={disconnectWallet}
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
