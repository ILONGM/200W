import { describe, expect, it } from "vitest";
import { resampleDailyToWeekly, type Candle } from "@/lib/marketData";
import { simpleMovingAverage } from "@/lib/movingAverage";

function day(date: string, open: number, high: number, low: number, close: number): Candle {
  return {
    time: Math.floor(Date.parse(`${date}T00:00:00Z`) / 1000),
    open,
    high,
    low,
    close
  };
}

describe("resampleDailyToWeekly", () => {
  it("aggregates daily candles into weekly OHLC", () => {
    const daily = [
      day("2024-01-08", 10, 12, 9, 11),
      day("2024-01-09", 11, 13, 10, 12),
      day("2024-01-10", 12, 14, 11, 13),
      day("2024-01-12", 13, 15, 12, 14)
    ];

    const weekly = resampleDailyToWeekly(daily);
    expect(weekly).toHaveLength(1);
    expect(weekly[0].open).toBe(10);
    expect(weekly[0].close).toBe(14);
    expect(weekly[0].high).toBe(15);
    expect(weekly[0].low).toBe(9);
  });

  it("keeps ISO week boundaries", () => {
    const daily = [
      day("2023-12-29", 100, 105, 95, 102),
      day("2024-01-02", 102, 110, 100, 108)
    ];

    const weekly = resampleDailyToWeekly(daily);
    expect(weekly).toHaveLength(2);
    expect(weekly[0].close).toBe(102);
    expect(weekly[1].close).toBe(108);
  });
});

describe("simpleMovingAverage", () => {
  it("calculates SMA with the window size", () => {
    const candles = Array.from({ length: 5 }, (_, index) =>
      day(`2024-01-0${index + 1}`, 0, 0, 0, index + 1)
    );
    const sma = simpleMovingAverage(candles, 3);
    expect(sma).toHaveLength(3);
    expect(sma[0].value).toBeCloseTo(2, 4);
    expect(sma[2].value).toBeCloseTo(4, 4);
  });
});
