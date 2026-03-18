/**
 * Prediction Market Event Indexer
 *
 * Listens to on-chain events from the MarketFactory contract and stores them
 * in a PostgreSQL database (Supabase). Exposes a REST API for the frontend.
 *
 * Endpoints:
 *   GET /events/:marketId        – All events for a market
 *   GET /bets/:marketId          – BetPlaced events for a market
 *   GET /probability/:marketId   – Probability history (time series)
 *   GET /volume/:marketId        – Volume history (time series)
 *   GET /trending                – Markets ranked by 24h volume
 *   GET /health                  – Healthcheck
 */

require("dotenv").config();
const { ethers } = require("ethers");
const express    = require("express");
const cors       = require("cors");
const { Pool }   = require("pg");

// ─── Config ──────────────────────────────────────────────────────────────────

const RPC_URL          = process.env.INDEXER_RPC_URL       || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS = process.env.INDEXER_CONTRACT_ADDR || "";
const FROM_BLOCK       = Number(process.env.INDEXER_FROM_BLOCK || 0);
const PORT             = Number(process.env.INDEXER_PORT   || 3001);
const POLL_INTERVAL    = Number(process.env.INDEXER_POLL_MS || 12000);

if (!CONTRACT_ADDRESS) {
  console.error("Error: INDEXER_CONTRACT_ADDR is not set in .env");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set in .env");
  process.exit(1);
}

// ─── ABI (minimal, only events) ──────────────────────────────────────────────

const ABI = [
  "event MarketCreated(uint256 indexed marketId, string title, string category, address indexed creator, uint256 endTime)",
  "event BetPlaced(uint256 indexed marketId, address indexed bettor, bool isYes, uint256 grossAmount, uint256 fee)",
  "event MarketResolved(uint256 indexed marketId, uint8 outcome)",
  "event Claimed(uint256 indexed marketId, address indexed claimer, uint256 amount)",
  "event Refunded(uint256 indexed marketId, address indexed user, uint256 amount)",
];

// ─── Database setup ───────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("supabase") ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id              SERIAL PRIMARY KEY,
      event_name      TEXT    NOT NULL,
      market_id       INTEGER NOT NULL,
      block_number    INTEGER NOT NULL,
      block_timestamp INTEGER,
      tx_hash         TEXT    NOT NULL,
      log_index       INTEGER NOT NULL,
      data            TEXT    NOT NULL,
      UNIQUE(tx_hash, log_index)
    );

    CREATE INDEX IF NOT EXISTS idx_events_market_id  ON events(market_id);
    CREATE INDEX IF NOT EXISTS idx_events_event_name ON events(event_name);
    CREATE INDEX IF NOT EXISTS idx_events_block      ON events(block_number);

    CREATE TABLE IF NOT EXISTS indexer_state (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

async function getLastBlock() {
  const { rows } = await pool.query(
    "SELECT value FROM indexer_state WHERE key = 'last_block'"
  );
  return rows.length > 0 ? Number(rows[0].value) : FROM_BLOCK;
}

async function setLastBlock(blockNumber) {
  await pool.query(
    `INSERT INTO indexer_state (key, value) VALUES ('last_block', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [String(blockNumber)]
  );
}

async function insertEvent(eventName, marketId, blockNumber, blockTimestamp, txHash, logIndex, data) {
  await pool.query(
    `INSERT INTO events (event_name, market_id, block_number, block_timestamp, tx_hash, log_index, data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tx_hash, log_index) DO NOTHING`,
    [eventName, marketId, blockNumber, blockTimestamp, txHash, logIndex, data]
  );
}

// ─── Provider & Contract ──────────────────────────────────────────────────────

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function processLog(log, iface) {
  try {
    const parsed = iface.parseLog({ topics: log.topics, data: log.data });
    if (!parsed) return;

    const block    = await provider.getBlock(log.blockNumber);
    const marketId = Number(parsed.args[0]);
    const data     = {};

    switch (parsed.name) {
      case "MarketCreated":
        Object.assign(data, {
          title:    parsed.args[1],
          category: parsed.args[2],
          creator:  parsed.args[3],
          endTime:  Number(parsed.args[4]),
        });
        break;
      case "BetPlaced":
        Object.assign(data, {
          bettor:      parsed.args[1],
          isYes:       parsed.args[2],
          grossAmount: parsed.args[3].toString(),
          fee:         parsed.args[4].toString(),
        });
        break;
      case "MarketResolved":
        Object.assign(data, { outcome: Number(parsed.args[1]) });
        break;
      case "Claimed":
        Object.assign(data, {
          claimer: parsed.args[1],
          amount:  parsed.args[2].toString(),
        });
        break;
      case "Refunded":
        Object.assign(data, {
          user:   parsed.args[1],
          amount: parsed.args[2].toString(),
        });
        break;
    }

    await insertEvent(
      parsed.name,
      marketId,
      log.blockNumber,
      block ? block.timestamp : null,
      log.transactionHash,
      log.index,
      JSON.stringify(data)
    );
  } catch {
    // Silently skip logs we can't decode
  }
}

// ─── Sync loop ────────────────────────────────────────────────────────────────

async function sync() {
  try {
    const iface       = new ethers.Interface(ABI);
    const latestBlock = await provider.getBlockNumber();
    const fromBlock   = await getLastBlock();

    if (fromBlock >= latestBlock) return;

    const BATCH = 2000;
    for (let start = fromBlock; start <= latestBlock; start += BATCH) {
      const end  = Math.min(start + BATCH - 1, latestBlock);
      const logs = await provider.getLogs({
        address:   CONTRACT_ADDRESS,
        fromBlock: start,
        toBlock:   end,
      });
      for (const log of logs) {
        await processLog(log, iface);
      }
      await setLastBlock(end + 1);
    }

    console.log(`[${new Date().toISOString()}] Synced to block ${latestBlock}`);
  } catch (err) {
    console.error("Sync error:", err.message);
  }
}

// ─── API Server ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT value FROM indexer_state WHERE key = 'last_block'"
  );
  res.json({ ok: true, lastBlock: rows.length > 0 ? rows[0].value : 0 });
});

app.get("/events/:marketId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM events WHERE market_id = $1 ORDER BY block_number ASC, log_index ASC",
    [Number(req.params.marketId)]
  );
  res.json(rows.map(r => ({ ...r, data: JSON.parse(r.data) })));
});

app.get("/bets/:marketId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM events WHERE market_id = $1 AND event_name = 'BetPlaced' ORDER BY block_number ASC",
    [Number(req.params.marketId)]
  );
  res.json(rows.map(r => ({ ...r, data: JSON.parse(r.data) })));
});

/**
 * Returns probability time series for a market.
 * Format: [{ timestamp, yesPool, noPool, yesProbBps }]
 */
app.get("/probability/:marketId", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM events WHERE market_id = $1 AND event_name = 'BetPlaced' ORDER BY block_number ASC",
    [Number(req.params.marketId)]
  );

  let yesPool = 0n;
  let noPool  = 0n;
  const series = [];

  for (const row of rows) {
    const d   = JSON.parse(row.data);
    const net = BigInt(d.grossAmount) - BigInt(d.fee);
    if (d.isYes) yesPool += net;
    else         noPool  += net;

    const total  = yesPool + noPool;
    const yesBps = total > 0n ? Number((yesPool * 10000n) / total) : 5000;

    series.push({
      timestamp:   row.block_timestamp,
      blockNumber: row.block_number,
      yesPool:     yesPool.toString(),
      noPool:      noPool.toString(),
      yesProbBps:  yesBps,
      noProbBps:   10000 - yesBps,
    });
  }

  res.json(series);
});

/**
 * Returns volume time series (hourly buckets).
 */
app.get("/volume/:marketId", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT block_timestamp, data FROM events
     WHERE market_id = $1 AND event_name = 'BetPlaced' AND block_timestamp IS NOT NULL
     ORDER BY block_timestamp ASC`,
    [Number(req.params.marketId)]
  );

  const hourly = {};
  for (const row of rows) {
    const d      = JSON.parse(row.data);
    const bucket = Math.floor(row.block_timestamp / 3600) * 3600;
    hourly[bucket] = (hourly[bucket] || 0n) + BigInt(d.grossAmount);
  }

  const series = Object.entries(hourly).map(([ts, vol]) => ({
    timestamp: Number(ts),
    volume:    vol.toString(),
  }));

  res.json(series);
});

/**
 * Returns markets sorted by 24h volume.
 */
app.get("/trending", async (_req, res) => {
  const since = Math.floor(Date.now() / 1000) - 86400;
  const { rows } = await pool.query(
    `SELECT market_id, SUM((data::json->>'grossAmount')::BIGINT) AS volume_24h
     FROM events
     WHERE event_name = 'BetPlaced' AND block_timestamp >= $1
     GROUP BY market_id
     ORDER BY volume_24h DESC
     LIMIT 50`,
    [since]
  );
  res.json(rows);
});

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await initDb();
  console.log("Database tables ready.");

  app.listen(PORT, () => {
    console.log(`Indexer API running on http://localhost:${PORT}`);
    console.log(`Contract: ${CONTRACT_ADDRESS}`);
  });

  const fromBlock = await getLastBlock();
  console.log(`Syncing from block ${fromBlock} on ${RPC_URL}`);

  sync();
  setInterval(sync, POLL_INTERVAL);
}

start().catch(err => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
