// ─── Contract Data Types ───────────────────────────────────────────────────

export enum Outcome {
  UNRESOLVED = 0,
  YES        = 1,
  NO         = 2,
}

/** Raw market data as returned by the smart contract (BigInt fields) */
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

/** Parsed market for frontend display */
export interface Market {
  id:             number;
  title:          string;
  description:    string;
  category:       string;
  creator:        string;
  endTime:        number;       // Unix seconds
  yesPool:        bigint;
  noPool:         bigint;
  totalPool:      bigint;
  resolved:       boolean;
  outcome:        Outcome;
  createdAt:      number;       // Unix seconds
  totalVolume:    bigint;
  yesProbBps:     number;       // basis points (5000 = 50%)
  noProbBps:      number;
  yesProb:        number;       // 0–100 %
  noProb:         number;
}

/** Raw bet data from contract */
export interface RawBet {
  yesAmount: bigint;
  noAmount:  bigint;
  claimed:   boolean;
}

/** Portfolio item – combines market + user bet */
export interface PortfolioItem {
  market:        Market;
  bet:           RawBet;
  pendingPayout: bigint;       // 0 if not claimable
  canClaim:      boolean;
  canRefund:     boolean;
}

// ─── Sort / Filter Types ───────────────────────────────────────────────────

export type SortMode = "trending" | "liquidity" | "ending" | "newest";

export type Category =
  | "all"
  | "crypto"
  | "sports"
  | "politics"
  | "AI"
  | "finance";

export const CATEGORIES: Category[] = [
  "all", "crypto", "sports", "politics", "AI", "finance",
];

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
  id:           number;
  event_name:   string;
  market_id:    number;
  block_number: number;
  block_timestamp: number;
  tx_hash:      string;
  data: {
    bettor:      string;
    isYes:       boolean;
    grossAmount: string;
    fee:         string;
  };
}

// ─── Wallet Types ──────────────────────────────────────────────────────────

export interface WalletState {
  address:     string | null;
  chainId:     number | null;
  isConnected: boolean;
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
