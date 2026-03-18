// ─── MarketFactory ABI ────────────────────────────────────────────────────
// Covers all functions called from the frontend

export const MARKET_FACTORY_ABI = [
  // ── View: Markets ──────────────────────────────────────────────────────
  {
    name: "getAllMarkets",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "id",          type: "uint256" },
          { name: "title",       type: "string"  },
          { name: "description", type: "string"  },
          { name: "category",    type: "string"  },
          { name: "creator",     type: "address" },
          { name: "endTime",     type: "uint256" },
          { name: "yesPool",     type: "uint256" },
          { name: "noPool",      type: "uint256" },
          { name: "resolved",    type: "bool"    },
          { name: "outcome",     type: "uint8"   },
          { name: "createdAt",   type: "uint256" },
          { name: "totalVolume", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getMarket",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id",          type: "uint256" },
          { name: "title",       type: "string"  },
          { name: "description", type: "string"  },
          { name: "category",    type: "string"  },
          { name: "creator",     type: "address" },
          { name: "endTime",     type: "uint256" },
          { name: "yesPool",     type: "uint256" },
          { name: "noPool",      type: "uint256" },
          { name: "resolved",    type: "bool"    },
          { name: "outcome",     type: "uint8"   },
          { name: "createdAt",   type: "uint256" },
          { name: "totalVolume", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getUserBet",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "user",     type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "yesAmount", type: "uint256" },
          { name: "noAmount",  type: "uint256" },
          { name: "claimed",   type: "bool"    },
        ],
      },
    ],
  },
  {
    name: "getMarketProbabilities",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      { name: "yesProbBps", type: "uint256" },
      { name: "noProbBps",  type: "uint256" },
    ],
  },
  {
    name: "getAllMarketIds",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getMarketsByCategory",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "category", type: "string" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getMarketsByCreator",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "creator", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "marketCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "creationFee",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "minBet",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tradeFeePercent",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "bettingToken",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "refundDelay",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // ── Write: Market Creation ─────────────────────────────────────────────
  {
    name: "createMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title",       type: "string"  },
      { name: "description", type: "string"  },
      { name: "category",    type: "string"  },
      { name: "endTime",     type: "uint256" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  // ── Write: Betting ─────────────────────────────────────────────────────
  {
    name: "betYes",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "amount",   type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "betNo",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "amount",   type: "uint256" },
    ],
    outputs: [],
  },
  // ── Write: Resolution ──────────────────────────────────────────────────
  {
    name: "resolveMarket",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome",  type: "uint8"   },
    ],
    outputs: [],
  },
  // ── Write: Claim / Refund ──────────────────────────────────────────────
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "refund",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  // ── Events ─────────────────────────────────────────────────────────────
  {
    name: "MarketCreated",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "title",    type: "string",  indexed: false },
      { name: "category", type: "string",  indexed: false },
      { name: "creator",  type: "address", indexed: true  },
      { name: "endTime",  type: "uint256", indexed: false },
    ],
  },
  {
    name: "BetPlaced",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "marketId",    type: "uint256", indexed: true  },
      { name: "bettor",      type: "address", indexed: true  },
      { name: "isYes",       type: "bool",    indexed: false },
      { name: "grossAmount", type: "uint256", indexed: false },
      { name: "fee",         type: "uint256", indexed: false },
    ],
  },
  {
    name: "MarketResolved",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "outcome",  type: "uint8",   indexed: false },
    ],
  },
  {
    name: "Claimed",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "claimer",  type: "address", indexed: true  },
      { name: "amount",   type: "uint256", indexed: false },
    ],
  },
  {
    name: "Refunded",
    type: "event",
    anonymous: false,
    inputs: [
      { name: "marketId", type: "uint256", indexed: true  },
      { name: "user",     type: "address", indexed: true  },
      { name: "amount",   type: "uint256", indexed: false },
    ],
  },
] as const;

// ─── ERC20 ABI ────────────────────────────────────────────────────────────

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
