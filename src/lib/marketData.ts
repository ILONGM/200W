export type Candle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
};

type CsvRow = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export function normalizeTicker(input: string, marketSuffix: string): string {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return trimmed;
  if (trimmed.includes(":")) {
    const [prefix, symbol] = trimmed.split(":", 2);
    if (prefix === "EPA" && symbol) {
      return `${symbol}.FR`;
    }
    return trimmed;
  }
  if (
    trimmed.includes(".") ||
    trimmed.includes("-") ||
    trimmed.includes("/")
  ) {
    return trimmed;
  }
  return `${trimmed}.${marketSuffix}`;
}

export function parseStooqCsv(csv: string): Candle[] {
  const lines = csv.trim().split("\n");
  if (lines.length <= 1) return [];
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const [date, open, high, low, close] = line.split(",");
    const parsed = {
      date,
      open: Number(open),
      high: Number(high),
      low: Number(low),
      close: Number(close)
    };
    if (!Number.isFinite(parsed.open)) continue;
    if (!Number.isFinite(parsed.close)) continue;
    rows.push(parsed);
  }

  return rows
    .map((row) => ({
      time: Math.floor(Date.parse(`${row.date}T00:00:00Z`) / 1000),
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close
    }))
    .filter((candle) => Number.isFinite(candle.time))
    .sort((a, b) => a.time - b.time);
}

export function isoWeekKey(date: Date): string {
  const temp = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${temp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function resampleDailyToWeekly(daily: Candle[]): Candle[] {
  if (daily.length === 0) return [];
  const grouped = new Map<string, Candle[]>();

  for (const candle of daily) {
    const key = isoWeekKey(new Date(candle.time * 1000));
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(candle);
    } else {
      grouped.set(key, [candle]);
    }
  }

  const weekly: Candle[] = [];
  for (const [_, candles] of grouped) {
    candles.sort((a, b) => a.time - b.time);
    const open = candles[0].open;
    const close = candles[candles.length - 1].close;
    let high = -Infinity;
    let low = Infinity;
    for (const candle of candles) {
      high = Math.max(high, candle.high);
      low = Math.min(low, candle.low);
    }
    weekly.push({
      time: candles[candles.length - 1].time,
      open,
      high,
      low,
      close
    });
  }

  weekly.sort((a, b) => a.time - b.time);
  return weekly;
}
