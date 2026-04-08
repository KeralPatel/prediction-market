// ─── Contract Data Types ───────────────────────────────────────────────────

export enum Outcome {
  UNRESOLVED = 0,
  YES        = 1,
  NO         = 2,
}

export interface RawMarket {
  id:          bigint;
  title:       string;
  description: string;
  category:    string;
  creator:     string;
  endTime:     bigint;
  yesPool:     bigint;
  noPool:      bigint;
  resolved:    boolean;
  outcome:     Outcome;
  createdAt:   bigint;
  totalVolume: bigint;
}

export interface Market {
  id:          number;
  title:       string;
  description: string;
  category:    string;
  creator:     string;
  endTime:     number;
  yesPool:     bigint;
  noPool:      bigint;
  totalPool:   bigint;
  resolved:    boolean;
  outcome:     Outcome;
  createdAt:   number;
  totalVolume: bigint;
  yesProbBps:  number;
  noProbBps:   number;
  yesProb:     number;
  noProb:      number;
}

export interface RawBet {
  yesAmount: bigint;
  noAmount:  bigint;
  claimed:   boolean;
}

export interface PortfolioItem {
  market:        Market;
  bet:           RawBet;
  pendingPayout: bigint;
  canClaim:      boolean;
  canRefund:     boolean;
}

// ─── Sort / Filter Types ───────────────────────────────────────────────────

export type SortMode = "trending" | "liquidity" | "ending" | "newest";

export type Category =
  | "all"
  | "central-bank"
  | "elections"
  | "macro"
  | "geopolitics"
  | "commodities"
  | "regulatory"
  | "crypto"
  | "sports"
  | "politics"
  | "AI"
  | "finance";

export const CATEGORIES: Category[] = [
  "all",
  "central-bank",
  "elections",
  "macro",
  "geopolitics",
  "commodities",
  "regulatory",
  "crypto",
];

export const CATEGORY_DISPLAY: Record<string, { label: string; color: string }> = {
  "all":          { label: "All Markets",  color: "#94a3b8" },
  "central-bank": { label: "Central Bank", color: "#3b82f6" },
  "elections":    { label: "Elections",    color: "#8b5cf6" },
  "macro":        { label: "Macro",        color: "#f59e0b" },
  "geopolitics":  { label: "Geopolitics",  color: "#ef4444" },
  "commodities":  { label: "Commodities",  color: "#3b82f6" },
  "regulatory":   { label: "Regulatory",   color: "#f59e0b" },
  "crypto":       { label: "Crypto",       color: "#10b981" },
  // Legacy categories
  "sports":   { label: "Sports",   color: "#f59e0b" },
  "politics": { label: "Politics", color: "#8b5cf6" },
  "AI":       { label: "AI",       color: "#3b82f6" },
  "finance":  { label: "Finance",  color: "#10b981" },
};

// ─── Indexer Types ─────────────────────────────────────────────────────────

export interface ProbabilityPoint {
  timestamp:   number;
  blockNumber: number;
  yesPool:     string;
  noPool:      string;
  yesProbBps:  number;
  noProbBps:   number;
}

export interface VolumePoint {
  timestamp: number;
  volume:    string;
}

export interface BetEvent {
  id:              number;
  event_name:      string;
  market_id:       number;
  block_number:    number;
  block_timestamp: number;
  tx_hash:         string;
  data: {
    bettor:      string;
    isYes:       boolean;
    grossAmount: string;
    fee:         string;
  };
}

// ─── Wallet Types ──────────────────────────────────────────────────────────

export interface WalletState {
  address:      string | null;
  chainId:      number | null;
  isConnected:  boolean;
  isConnecting: boolean;
  wrongNetwork: boolean;
}

// ─── Tx Status ─────────────────────────────────────────────────────────────

export type TxStatus = "idle" | "approving" | "pending" | "success" | "error";

export interface TxState {
  status:  TxStatus;
  hash:    string | null;
  message: string | null;
}

// ─── Price / News / Leaderboard Types ──────────────────────────────────────

export interface AssetPrice {
  name:   string;
  sym:    string;
  price:  number;
  chg:    number;
  chgPct: number;
  color:  string;
  spark:  number[];
  src:    string;
}

export interface MacroIndicator {
  label: string;
  value: string;
  chg:   string;
  up:    boolean | null;
}

export interface NewsItem {
  time:     string;
  src:      string;
  tag:      string;
  tagColor: string;
  title:    string;
  snippet:  string;
  url?:     string;
}

export interface LeaderboardEntry {
  rank:          number;
  address:       string;
  totalBet:      string;
  totalReceived: string;
  pnl:           string;
  pnlRaw:        number;
  accuracy:      number;
  totalBets:     number;
  winningBets:   number;
}

