// ─── Network / Chain Config ────────────────────────────────────────────────

export const CHAIN_ID   = Number((process.env.NEXT_PUBLIC_CHAIN_ID   || "56").trim());
export const RPC_URL    =        (process.env.NEXT_PUBLIC_RPC_URL    || "https://bsc-dataseed.binance.org/").trim();

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "").trim();
export const TOKEN_ADDRESS    = (process.env.NEXT_PUBLIC_TOKEN_ADDRESS    || "").trim();

// Human-readable amounts (in full tokens, e.g. "5" means 5 USDT)
export const CREATION_FEE  = (process.env.NEXT_PUBLIC_CREATION_FEE  || "5").trim();
export const TRADE_FEE     = (process.env.NEXT_PUBLIC_TRADE_FEE     || "0.5").trim();
export const MIN_BET       = (process.env.NEXT_PUBLIC_MIN_BET        || "1").trim();
export const REFUND_DELAY  = Number((process.env.NEXT_PUBLIC_REFUND_DELAY  || "259200").trim());

export const INDEXER_URL  = (process.env.NEXT_PUBLIC_INDEXER_URL || "").trim();

// ─── Chain Metadata ────────────────────────────────────────────────────────

interface ChainInfo {
  name:          string;
  shortName:     string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  blockExplorer: string;
  rpcUrl:        string;
}

const CHAIN_CONFIG: Record<number, ChainInfo> = {
  56: {
    name:          "BNB Smart Chain",
    shortName:     "BSC",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    blockExplorer: "https://bscscan.com",
    rpcUrl:        "https://bsc-dataseed.binance.org/",
  },
  97: {
    name:          "BSC Testnet",
    shortName:     "BSC Testnet",
    nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
    blockExplorer: "https://testnet.bscscan.com",
    rpcUrl:        "https://data-seed-prebsc-1-s1.binance.org:8545/",
  },
  31337: {
    name:          "Hardhat Local",
    shortName:     "Local",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    blockExplorer: "http://localhost:8545",
    rpcUrl:        "http://127.0.0.1:8545",
  },
};

export function getChainInfo(chainId?: number): ChainInfo | null {
  return CHAIN_CONFIG[chainId ?? CHAIN_ID] ?? null;
}

export function getTxUrl(txHash: string, chainId?: number): string {
  const info = getChainInfo(chainId);
  if (!info) return "";
  return `${info.blockExplorer}/tx/${txHash}`;
}

export function getAddressUrl(address: string, chainId?: number): string {
  const info = getChainInfo(chainId);
  if (!info) return "";
  return `${info.blockExplorer}/address/${address}`;
}
