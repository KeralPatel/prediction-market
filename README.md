# PredictX — Decentralized Prediction Market Platform

A fully decentralized prediction market built on BNB Smart Chain using a simplified betting-pool architecture. Users create markets, bet ERC20 tokens on YES/NO outcomes, and claim proportional winnings.

---

## Architecture Overview

```
prediction-market/
├── contracts/                 Solidity smart contracts
│   ├── PredictionMarket.sol   Core betting logic (base contract)
│   ├── MarketFactory.sol      Registry + factory (deployed contract)
│   └── mocks/MockERC20.sol    Test token with faucet
├── scripts/
│   └── deploy.js              Hardhat deployment script
├── test/
│   └── PredictionMarket.test.js  Comprehensive test suite
├── indexer/
│   ├── index.js               Event indexer + REST API
│   └── package.json
├── frontend/                  Next.js 14 App Router frontend
│   └── src/
│       ├── app/               Pages (/, /market/[id], /create, /portfolio)
│       ├── components/        UI components
│       ├── context/           WalletContext (ethers.js)
│       ├── hooks/             useContract, useMarkets
│       ├── lib/               ABI, config, market utilities
│       ├── store/             Zustand global state
│       └── types/             TypeScript types
├── hardhat.config.js
└── package.json
```

---

## Smart Contracts

### MarketFactory.sol (deploy this)

Inherits `PredictionMarket` and adds a registry of market IDs indexed by creator and category.

**Key functions:**

| Function | Description |
|---|---|
| `createMarket(title, description, category, endTime)` | Create a new market (requires creation fee approval) |
| `betYes(marketId, amount)` | Bet tokens on YES outcome |
| `betNo(marketId, amount)` | Bet tokens on NO outcome |
| `resolveMarket(marketId, outcome)` | Admin resolves with YES(1) or NO(2) |
| `claim(marketId)` | Claim proportional winnings |
| `refund(marketId)` | Refund bet if market unresolved past deadline |
| `getAllMarkets()` | Returns all market structs |
| `getUserBet(marketId, user)` | Returns user's bet struct |

**Fee model:**
- Creation fee: flat token fee to create a market (e.g., 5 USDT)
- Trade fee: basis-point fee on each bet (e.g., 50 bps = 0.5%) sent to treasury

**Payout formula:**
```
payout = (userBet / winningPool) * totalPool
```

---

## Quick Start

### 1. Install dependencies

```bash
# Root (Hardhat)
cd prediction-market
npm install

# Frontend
cd frontend
npm install

# Indexer
cd indexer
npm install
```

### 2. Configure environment

```bash
# Root
cp .env.example .env
# Fill in DEPLOYER_PRIVATE_KEY, TREASURY_ADDRESS, TOKEN_ADDRESS

# Frontend
cd frontend
cp .env.local.example .env.local
# Fill in contract addresses after deployment
```

### 3. Run local node + deploy

```bash
# Terminal 1: start local Hardhat node
npm run node

# Terminal 2: deploy contracts (seeds 5 demo markets)
npm run deploy:local
```

The deploy script prints the contract addresses. Copy them into `frontend/.env.local`.

### 4. Run tests

```bash
npm test
# or with gas report
REPORT_GAS=true npm test
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
# Open http://localhost:3000
```

### 6. Start the indexer (optional — enables probability charts + trending)

```bash
cd indexer
cp .env.example .env
# Set INDEXER_CONTRACT_ADDR to deployed MarketFactory address
npm start
```

---

## Deploy to BSC Testnet

```bash
# 1. Get tBNB from https://testnet.bnbchain.org/faucet-smart
# 2. Set DEPLOYER_PRIVATE_KEY in .env
# 3. Deploy
npm run deploy:bsc-testnet
```

## Deploy to BSC Mainnet

```bash
npm run deploy:bsc
```

---

## Frontend Pages

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Market list with category filters, sort modes, search |
| Market | `/market/:id` | Market detail, probability chart, betting, trade history |
| Create | `/create` | Create a new prediction market |
| Portfolio | `/portfolio` | User positions, claim winnings, request refunds |

---

## Wallet Connection

Uses **ethers.js v6** with `window.ethereum` (MetaMask or compatible).

```typescript
// Connect
const provider = new ethers.BrowserProvider(window.ethereum);
await provider.send("eth_requestAccounts", []);
const signer = await provider.getSigner();
const address = await signer.getAddress();
```

Auto-connects if previously authorized. Listens for `accountsChanged` and `chainChanged` events.

---

## Token Approval Flow

Since bets use ERC20 tokens, users must approve the contract before betting:

1. Frontend calls `token.allowance(user, contractAddress)`
2. If insufficient, calls `token.approve(contractAddress, MaxUint256)`
3. User confirms approval in wallet
4. Frontend then calls `betYes(marketId, amount)` or `betNo(marketId, amount)`

The `BettingInterface` component handles this automatically.

---

## Market Sorting

| Mode | Logic |
|---|---|
| Trending | Sort by `totalVolume` descending (24h via indexer, all-time on-chain) |
| Most Liquidity | Sort by `yesPool + noPool` descending |
| Ending Soon | Sort by `endTime` ascending (active markets first) |
| Newest | Sort by `createdAt` descending |

---

## Security

- **ReentrancyGuard** on all state-changing functions
- **Ownable** for admin-only resolution
- **SafeERC20** for all token transfers
- Double-claim prevention via `bet.claimed` flag
- Bet after expiry prevented via `block.timestamp` check
- Trade fee capped at 10% (1000 basis points)

---

## Environment Variables Reference

### Root (.env)

| Variable | Description |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Private key of deployer wallet |
| `TREASURY_ADDRESS` | Address that receives fees |
| `TOKEN_ADDRESS` | ERC20 token address (leave empty on testnet to deploy MockERC20) |
| `CREATION_FEE` | Market creation fee in tokens (e.g., `5`) |
| `TRADE_FEE_PERCENT` | Trade fee in percent (e.g., `0.5`) |
| `MIN_BET` | Minimum bet in tokens (e.g., `1`) |
| `REFUND_DELAY` | Seconds after end time before refund available (e.g., `259200` = 3 days) |

### Frontend (.env.local)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CHAIN_ID` | Target chain ID (56 = BSC, 97 = BSC testnet, 31337 = local) |
| `NEXT_PUBLIC_RPC_URL` | JSON-RPC endpoint |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Deployed MarketFactory address |
| `NEXT_PUBLIC_TOKEN_ADDRESS` | ERC20 betting token address |
| `NEXT_PUBLIC_CREATION_FEE` | Creation fee display (human-readable) |
| `NEXT_PUBLIC_TRADE_FEE` | Trade fee display |
| `NEXT_PUBLIC_MIN_BET` | Minimum bet display |
| `NEXT_PUBLIC_REFUND_DELAY` | Refund delay in seconds |
| `NEXT_PUBLIC_INDEXER_URL` | Indexer API URL (optional) |
