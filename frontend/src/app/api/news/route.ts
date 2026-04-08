import { NextResponse } from "next/server";
import { NewsItem } from "@/types";

const CACHE_TTL = 300_000; // 5 minutes
let cache: { data: NewsItem[]; ts: number } | null = null;

const UA = "Mozilla/5.0 (compatible; NewsBot/1.0)";

interface FeedConfig {
  url:      string;
  src:      string;
  tag:      string;
  tagColor: string;
}

const FEEDS: FeedConfig[] = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/",   src: "CoinDesk",    tag: "CRYPTO",     tagColor: "#f59e0b" },
  { url: "https://cointelegraph.com/rss",                     src: "CoinTelegraph",tag: "CRYPTO",     tagColor: "#f59e0b" },
  { url: "https://feeds.reuters.com/reuters/businessNews",    src: "Reuters",     tag: "MARKETS",    tagColor: "#10b981" },
];

function parseRss(xml: string, cfg: FeedConfig): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;

  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];

    const getField = (tag: string): string => {
      // Try CDATA first, then plain text
      const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(block);
      if (cdata) return cdata[1].trim();
      const plain = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i").exec(block);
      return plain ? plain[1].trim() : "";
    };

    const title  = getField("title");
    const link   = getField("link") || getField("guid");
    const pubRaw = getField("pubDate");
    const desc   = getField("description").replace(/<[^>]+>/g, "").slice(0, 120);

    if (!title) continue;

    // Format relative time
    let time = "recently";
    if (pubRaw) {
      try {
        const diff = Date.now() - new Date(pubRaw).getTime();
        const h    = Math.floor(diff / 3_600_000);
        const m2   = Math.floor(diff / 60_000);
        time = h > 0 ? `${h}h ago` : m2 > 0 ? `${m2}m ago` : "just now";
      } catch {}
    }

    items.push({
      time,
      src:      cfg.src,
      tag:      cfg.tag,
      tagColor: cfg.tagColor,
      title:    title.slice(0, 140),
      snippet:  desc || "Read more…",
      url:      link || undefined,
    });

    if (items.length >= 4) break;
  }

  return items;
}

async function fetchFeed(cfg: FeedConfig): Promise<NewsItem[]> {
  const res = await fetch(cfg.url, {
    headers: { "User-Agent": UA, "Accept": "application/rss+xml,application/xml,text/xml" },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Feed ${cfg.src} ${res.status}`);
  const xml = await res.text();
  return parseRss(xml, cfg);
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const results = await Promise.allSettled(FEEDS.map(fetchFeed));

    const all: NewsItem[] = [];
    for (const r of results) {
      if (r.status === "fulfilled") all.push(...r.value);
    }

    // Interleave sources and cap at 12
    const merged: NewsItem[] = [];
    const max = Math.max(...results.map(r => r.status === "fulfilled" ? r.value.length : 0));
    for (let i = 0; i < max && merged.length < 12; i++) {
      for (const r of results) {
        if (r.status === "fulfilled" && r.value[i]) merged.push(r.value[i]);
      }
    }

    // Fallback static items if all feeds fail
    const data = merged.length > 0 ? merged : getFallback();
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (err) {
    console.error("News API error:", err);
    return NextResponse.json(getFallback());
  }
}

function getFallback(): NewsItem[] {
  return [
    { time: "now", src: "Market Alert", tag: "MARKETS", tagColor: "#10b981", title: "Live market data temporarily unavailable", snippet: "News feeds are refreshing. Check back shortly for the latest updates.", url: undefined },
  ];
}
