import { NextResponse } from "next/server";
import {
  normalizeTicker,
  parseStooqCsv,
  resampleDailyToWeekly,
  type Candle
} from "@/lib/marketData";
import { candlesToLine, simpleMovingAverage } from "@/lib/movingAverage";

const SMA_WINDOW = 200;
const YAHOO_MARKET_SUFFIX: Record<string, string> = {
  US: "",
  FR: ".PA",
  UK: ".L",
  DE: ".DE",
  CA: ".TO",
  JP: ".T"
};

async function fetchStooqCsv(ticker: string, interval: "d" | "w"): Promise<string> {
  const url = `https://stooq.com/q/d/l/?s=${ticker}&i=${interval}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Stooq error: ${response.status}`);
  }
  return response.text();
}

async function fetchAlphaVantageWeekly(ticker: string, apiKey: string): Promise<Candle[]> {
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "TIME_SERIES_WEEKLY_ADJUSTED");
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Alpha Vantage error: ${response.status}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const series = payload["Weekly Adjusted Time Series"];
  if (!series || typeof series !== "object") return [];

  const entries = Object.entries(series as Record<string, Record<string, string>>)
    .map(([date, values]) => ({
      time: Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000),
      open: Number(values["1. open"]),
      high: Number(values["2. high"]),
      low: Number(values["3. low"]),
      close: Number(values["5. adjusted close"] ?? values["4. close"])
    }))
    .filter((candle) => Number.isFinite(candle.time) && Number.isFinite(candle.close))
    .sort((a, b) => a.time - b.time);

  return entries;
}

type YahooWeeklyResult = {
  candles: Candle[];
  currency: string | null;
};

function normalizeYahooTicker(input: string, market: string): string {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return trimmed;
  if (trimmed.includes(":")) {
    const [prefix, symbol] = trimmed.split(":", 2);
    if (prefix === "EPA" && symbol) {
      return `${symbol}.PA`;
    }
    return trimmed;
  }
  if (trimmed.includes(".") || trimmed.includes("-") || trimmed.includes("/")) {
    return trimmed;
  }
  const suffix = YAHOO_MARKET_SUFFIX[market] ?? "";
  return `${trimmed}${suffix}`;
}

async function fetchYahooWeekly(ticker: string): Promise<YahooWeeklyResult> {
  const url = new URL(`https://query1.finance.yahoo.com/v7/finance/chart/${ticker}`);
  url.searchParams.set("interval", "1wk");
  url.searchParams.set("range", "max");
  url.searchParams.set("includeAdjustedClose", "true");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Yahoo error: ${response.status}`);
  }
  const payload = (await response.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: number[];
            high?: number[];
            low?: number[];
            close?: number[];
          }>;
          adjclose?: Array<{ adjclose?: number[] }>;
        };
        meta?: { currency?: string };
      }>;
    };
  };

  const result = payload.chart?.result?.[0];
  if (!result?.timestamp?.length) return { candles: [], currency: null };
  const quote = result.indicators?.quote?.[0];
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
  if (!quote) return { candles: [], currency: result.meta?.currency ?? null };

  const candles: Candle[] = [];
  for (let i = 0; i < result.timestamp.length; i += 1) {
    const time = result.timestamp[i];
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = adjclose?.[i] ?? quote.close?.[i];
    if (
      typeof time !== "number" ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      continue;
    }
    candles.push({ time, open, high, low, close });
  }

  return { candles, currency: result.meta?.currency ?? null };
}

function pickWeeklyData(weekly: Candle[], daily: Candle[]): { candles: Candle[]; source: string } {
  if (weekly.length >= SMA_WINDOW) {
    return { candles: weekly, source: "weekly" };
  }
  if (daily.length === 0) {
    return { candles: weekly, source: "weekly" };
  }
  const resampled = resampleDailyToWeekly(daily);
  return { candles: resampled, source: "daily-resampled" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickerInput = searchParams.get("ticker") ?? "";
  const market = (searchParams.get("market") ?? "US").toUpperCase();
  const normalized = normalizeTicker(tickerInput, market);

  if (!normalized) {
    return NextResponse.json({ error: "Ticker is required" }, { status: 400 });
  }

  try {
    let weekly: Candle[] = [];
    let daily: Candle[] = [];
    try {
      const [weeklyCsv, dailyCsv] = await Promise.all([
        fetchStooqCsv(normalized, "w"),
        fetchStooqCsv(normalized, "d")
      ]);
      weekly = parseStooqCsv(weeklyCsv);
      daily = parseStooqCsv(dailyCsv);
    } catch {
      weekly = [];
      daily = [];
    }
    const { candles, source } = pickWeeklyData(weekly, daily);

    if (candles.length === 0) {
      const yahooTicker = normalizeYahooTicker(tickerInput, market);
      if (yahooTicker) {
        const yahoo = await fetchYahooWeekly(yahooTicker);
        if (yahoo.candles.length > 0) {
          const ma = simpleMovingAverage(yahoo.candles, SMA_WINDOW);
          const line = candlesToLine(yahoo.candles);
          return NextResponse.json({
            ticker: yahooTicker,
            source: "yahoo-weekly",
            currency: yahoo.currency,
            candles: yahoo.candles,
            line,
            ma
          });
        }
      }

      const apiKey = process.env.ALPHAVANTAGE_API_KEY;
      if (apiKey) {
        const alphaWeekly = await fetchAlphaVantageWeekly(tickerInput, apiKey);
        if (alphaWeekly.length > 0) {
          const ma = simpleMovingAverage(alphaWeekly, SMA_WINDOW);
          const line = candlesToLine(alphaWeekly);
          return NextResponse.json({
            ticker: tickerInput.toUpperCase(),
            source: "alphavantage-weekly",
            currency: null,
            candles: alphaWeekly,
            line,
            ma
          });
        }
      }

      return NextResponse.json(
        { error: "No data found for ticker" },
        { status: 404 }
      );
    }

    const ma = simpleMovingAverage(candles, SMA_WINDOW);
    const line = candlesToLine(candles);

    return NextResponse.json({
      ticker: normalized,
      source,
      currency: null,
      candles,
      line,
      ma
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
