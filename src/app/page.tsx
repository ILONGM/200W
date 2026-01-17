"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PriceChart, { type ChartSeries } from "@/components/PriceChart";

const DEFAULT_TICKER = "AAPL";
const SUGGESTIONS = ["AAPL", "MSFT", "GOOG", "SPY"];
const MARKETS = [
  { label: "US (NYSE/Nasdaq)", suffix: "US", currency: "USD" },
  { label: "UK (LSE)", suffix: "UK", currency: "GBP" },
  { label: "DE (Xetra)", suffix: "DE", currency: "EUR" },
  { label: "FR (Euronext)", suffix: "FR", currency: "EUR" },
  { label: "CA (TSX)", suffix: "CA", currency: "CAD" },
  { label: "JP (TSE)", suffix: "JP", currency: "JPY" }
];

type ApiResponse = {
  ticker: string;
  source: string;
  currency: string | null;
  candles: { time: number; open: number; high: number; low: number; close: number }[];
  line: { time: number; value: number }[];
  ma: { time: number; value: number }[];
  error?: string;
};

export default function HomePage() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [market, setMarket] = useState(MARKETS[0]);
  const [chartType, setChartType] = useState<"line" | "candles">("line");
  const [showMA, setShowMA] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ChartSeries>({
    candles: [],
    line: [],
    ma: []
  });
  const [source, setSource] = useState<string | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [resolvedTicker, setResolvedTicker] = useState<string | null>(null);

  const handleLoad = useCallback(async (input: string, marketSuffix = market.suffix) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/history?ticker=${encodeURIComponent(trimmed)}&market=${encodeURIComponent(marketSuffix)}`
      );
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Unknown error");
      }
      setData({
        candles: payload.candles,
        line: payload.line,
        ma: payload.ma
      });
      setSource(payload.source);
      setCurrency(payload.currency ?? null);
      setResolvedTicker(payload.ticker);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, [market.suffix]);

  const canRender = data.candles.length > 0;

  useEffect(() => {
    void handleLoad(DEFAULT_TICKER, market.suffix);
  }, [handleLoad, market.suffix]);

  const chartLabel = useMemo(() => {
    if (!source) return "";
    if (source === "weekly") return "Weekly data";
    if (source === "alphavantage-weekly") return "Alpha Vantage weekly adjusted";
    if (source === "yahoo-weekly") return "Yahoo Finance weekly";
    return "Daily data resampled to weekly";
  }, [source]);

  return (
    <main className="px-6 py-10 md:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">200W Moving Average</p>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">
            Long-term trend lens for any ticker
          </h1>
          <p className="max-w-2xl text-slate-300">
            Fetch US equities (stooq) and overlay a 200-week moving average. Zoom and pan to explore
            two decades of weekly structure.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Ticker</label>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={market.suffix}
                  onChange={(event) => {
                    const next = MARKETS.find((entry) => entry.suffix === event.target.value);
                    if (next) setMarket(next);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  {MARKETS.map((entry) => (
                    <option key={entry.suffix} value={entry.suffix}>
                      {entry.label}
                    </option>
                  ))}
                </select>
                <input
                  value={ticker}
                  onChange={(event) => setTicker(event.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                />
                <button
                  onClick={() => handleLoad(ticker, market.suffix)}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  {loading ? "Loading..." : "Load"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => {
                      setTicker(symbol);
                      void handleLoad(symbol, market.suffix);
                    }}
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-cyan-300 hover:text-cyan-200"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <label className="text-slate-300">MA 200W</label>
                <input
                  type="checkbox"
                  checked={showMA}
                  onChange={(event) => setShowMA(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 text-cyan-400"
                />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <label className="text-slate-300">Chart</label>
                <select
                  value={chartType}
                  onChange={(event) => setChartType(event.target.value as "line" | "candles")}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="line">Line</option>
                  <option value="candles">Candles</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            {!canRender && !error && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-10 text-center text-slate-400">
                Load a ticker to see the chart.
              </div>
            )}
            {canRender && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
                  <span>{resolvedTicker ?? `${ticker}.${market.suffix}`}</span>
                  <span>
                    {chartLabel} · Currency {currency ?? market.currency}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-800">
                  <PriceChart data={data} showMA={showMA} chartType={chartType} />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
