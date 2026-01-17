"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ColorType,
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type CandlestickData
} from "lightweight-charts";

export type ChartSeries = {
  candles: CandlestickData[];
  line: LineData[];
  ma: LineData[];
};

type ChartType = "line" | "candles";

type Props = {
  data: ChartSeries;
  showMA: boolean;
  chartType: ChartType;
  height?: number;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2
});

function formatValue(value?: number) {
  if (value === undefined) return "—";
  return numberFormatter.format(value);
}

export default function PriceChart({ data, showMA, chartType, height = 520 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const maSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const chartData = useMemo(() => data, [data]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#0b1220" },
        textColor: "#cbd5f5",
        fontFamily: "IBM Plex Sans, system-ui"
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.1)" },
        horzLines: { color: "rgba(148, 163, 184, 0.1)" }
      },
      crosshair: {
        mode: CrosshairMode.Normal
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
        timeVisible: true,
        secondsVisible: false
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)"
      }
    });

    chartRef.current = chart;
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444"
    });
    const lineSeries = chart.addLineSeries({
      color: "#38bdf8",
      lineWidth: 2
    });
    const maSeries = chart.addLineSeries({
      color: "#f97316",
      lineWidth: 2,
      lineStyle: LineStyle.Solid
    });

    candleSeriesRef.current = candleSeries;
    lineSeriesRef.current = lineSeries;
    maSeriesRef.current = maSeries;

    const tooltip = document.createElement("div");
    tooltip.className = "chart-tooltip";
    tooltip.style.display = "none";
    containerRef.current.appendChild(tooltip);
    tooltipRef.current = tooltip;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !tooltipRef.current) {
        if (tooltipRef.current) tooltipRef.current.style.display = "none";
        return;
      }

      const tooltipEl = tooltipRef.current;
      const candleData = param.seriesData.get(candleSeries) as CandlestickData | undefined;
      const lineData = param.seriesData.get(lineSeries) as LineData | undefined;
      const maData = param.seriesData.get(maSeries) as LineData | undefined;
      const price = chartType === "candles" ? candleData?.close : lineData?.value;
      const date = new Date((param.time as number) * 1000);

      tooltipEl.style.display = "block";
      tooltipEl.innerHTML = `
        <div class="font-display text-sm">${date.toISOString().slice(0, 10)}</div>
        <div class="mt-1">Close: <strong>${formatValue(price)}</strong></div>
        <div>MA200W: <strong>${formatValue(maData?.value)}</strong></div>
      `;

      const { point } = param;
      if (point) {
        const left = Math.min(point.x + 16, (containerRef.current?.clientWidth ?? 0) - 160);
        const top = Math.max(point.y - 40, 0);
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
      }
    });

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [height, chartType]);

  useEffect(() => {
    if (!candleSeriesRef.current || !lineSeriesRef.current || !maSeriesRef.current) return;
    candleSeriesRef.current.setData(chartData.candles);
    lineSeriesRef.current.setData(chartData.line);
    maSeriesRef.current.setData(chartData.ma);

    candleSeriesRef.current.applyOptions({ visible: chartType === "candles" });
    lineSeriesRef.current.applyOptions({ visible: chartType === "line" });
    maSeriesRef.current.applyOptions({ visible: showMA });

    chartRef.current?.timeScale().fitContent();
  }, [chartData, chartType, showMA]);

  return <div ref={containerRef} className="relative w-full" />;
}
