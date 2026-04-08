import { NextResponse } from "next/server";

const CACHE_TTL = 60_000; // 60 seconds
let cache: { data: unknown; ts: number } | null = null;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function fetchYahoo(symbol: string): Promise<{ price: number; chg: number; chgPct: number; spark: number[] }> {
  const encoded = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=7d`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept": "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Yahoo ${symbol} ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${symbol}`);

  const meta   = result.meta;
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const validCloses = (closes as (number | null)[]).filter((v): v is number => v !== null && !isNaN(v));
  const price  = meta.regularMarketPrice ?? validCloses[validCloses.length - 1] ?? 0;
  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? validCloses[validCloses.length - 2] ?? price;
  const chg    = price - prevClose;
  const chgPct = prevClose !== 0 ? (chg / prevClose) * 100 : 0;

  return { price, chg, chgPct, spark: validCloses.slice(-7) };
}

async function fetchBinance(symbol: string): Promise<{ price: number; chg: number; chgPct: number; spark: number[] }> {
  // 7-day klines for sparkline
  const klinesUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&limit=7`;
  const tickerUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;

  const [klinesRes, tickerRes] = await Promise.all([
    fetch(klinesUrl, { next: { revalidate: 60 } }),
    fetch(tickerUrl, { next: { revalidate: 60 } }),
  ]);

  if (!klinesRes.ok || !tickerRes.ok) throw new Error(`Binance ${symbol} error`);

  const klines: unknown[][] = await klinesRes.json();
  const ticker: Record<string, string> = await tickerRes.json();

  const spark  = klines.map((k) => parseFloat(k[4] as string)); // close prices
  const price  = parseFloat(ticker.lastPrice);
  const chg    = parseFloat(ticker.priceChange);
  const chgPct = parseFloat(ticker.priceChangePercent);

  return { price, chg, chgPct, spark };
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const [btc, sp500, nasdaq, dow, gold] = await Promise.allSettled([
      fetchBinance("BTCUSDT"),
      fetchYahoo("^GSPC"),
      fetchYahoo("^IXIC"),
      fetchYahoo("^DJI"),
      fetchYahoo("GC=F"),
    ]);

    const assets = [
      {
        name: "Bitcoin", sym: "BTC", color: "#f7931a", src: "Binance",
        ...(btc.status === "fulfilled" ? btc.value : { price: 0, chg: 0, chgPct: 0, spark: [] }),
      },
      {
        name: "S&P 500", sym: "SPX", color: "#10b981", src: "Yahoo Finance",
        ...(sp500.status === "fulfilled" ? sp500.value : { price: 0, chg: 0, chgPct: 0, spark: [] }),
      },
      {
        name: "Nasdaq", sym: "IXIC", color: "#8b5cf6", src: "Yahoo Finance",
        ...(nasdaq.status === "fulfilled" ? nasdaq.value : { price: 0, chg: 0, chgPct: 0, spark: [] }),
      },
      {
        name: "Dow Jones", sym: "DJI", color: "#3b82f6", src: "Yahoo Finance",
        ...(dow.status === "fulfilled" ? dow.value : { price: 0, chg: 0, chgPct: 0, spark: [] }),
      },
      {
        name: "Gold", sym: "XAU", color: "#ffd700", src: "Yahoo Finance",
        ...(gold.status === "fulfilled" ? gold.value : { price: 0, chg: 0, chgPct: 0, spark: [] }),
      },
    ];

    // Macro indicators derived from fetched data
    const macroIndicators = [
      { label: "BTC/USD",    value: `$${assets[0].price.toLocaleString("en-US",{maximumFractionDigits:0})}`, chg: `${assets[0].chgPct>=0?"+":""}${assets[0].chgPct.toFixed(2)}%`, up: assets[0].chg >= 0 },
      { label: "S&P 500",    value: assets[1].price.toLocaleString("en-US",{maximumFractionDigits:2}),       chg: `${assets[1].chgPct>=0?"+":""}${assets[1].chgPct.toFixed(2)}%`, up: assets[1].chg >= 0 },
      { label: "Nasdaq",     value: assets[2].price.toLocaleString("en-US",{maximumFractionDigits:2}),       chg: `${assets[2].chgPct>=0?"+":""}${assets[2].chgPct.toFixed(2)}%`, up: assets[2].chg >= 0 },
      { label: "Dow Jones",  value: assets[3].price.toLocaleString("en-US",{maximumFractionDigits:2}),       chg: `${assets[3].chgPct>=0?"+":""}${assets[3].chgPct.toFixed(2)}%`, up: assets[3].chg >= 0 },
      { label: "Gold (oz)",  value: `$${assets[4].price.toLocaleString("en-US",{maximumFractionDigits:2})}`, chg: `${assets[4].chgPct>=0?"+":""}${assets[4].chgPct.toFixed(2)}%`, up: assets[4].chg >= 0 },
      { label: "Market",     value: "LIVE",  chg: "Real-time", up: null },
    ];

    const data = { assets, macroIndicators };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (err) {
    console.error("Prices API error:", err);
    return NextResponse.json({ assets: [], macroIndicators: [] }, { status: 500 });
  }
}
