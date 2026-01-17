import type { Candle } from "./marketData";

export type LinePoint = { time: number; value: number };

export function simpleMovingAverage(candles: Candle[], windowSize: number): LinePoint[] {
  if (windowSize <= 0) return [];
  const result: LinePoint[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i += 1) {
    sum += candles[i].close;
    if (i >= windowSize) {
      sum -= candles[i - windowSize].close;
    }
    if (i >= windowSize - 1) {
      result.push({
        time: candles[i].time,
        value: Number((sum / windowSize).toFixed(4))
      });
    }
  }

  return result;
}

export function candlesToLine(candles: Candle[]): LinePoint[] {
  return candles.map((candle) => ({ time: candle.time, value: candle.close }));
}
