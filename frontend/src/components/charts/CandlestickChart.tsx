import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, CandlestickSeries, CrosshairMode } from 'lightweight-charts';
import { api } from '../../services/api';
import type { Timeframe } from '../../lib/constants';
import { useThemeStore } from '../../stores/useThemeStore';

interface Props {
  symbol: string;
  timeframe: Timeframe;
  height?: number;
}

const chartTheme = {
  dark: {
    background: '#18181b',
    text: '#71717a',
    grid: '#27272a',
    border: '#3f3f46',
    upColor: '#22c55e',
    downColor: '#ef4444',
  },
  light: {
    background: '#ffffff',
    text: '#a1a1aa',
    grid: '#f4f4f5',
    border: '#e4e4e7',
    upColor: '#16a34a',
    downColor: '#dc2626',
  },
};

export function CandlestickChart({ symbol, timeframe, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!containerRef.current) return;
    const colors = chartTheme[theme];

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: colors.background }, textColor: colors.text },
      grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: colors.border },
      timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: timeframe === '1Min' },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor, downColor: colors.downColor,
      borderUpColor: colors.upColor, borderDownColor: colors.downColor,
      wickUpColor: colors.upColor, wickDownColor: colors.downColor,
    });

    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    (async () => {
      if (statusRef.current) statusRef.current.textContent = 'Loading...';
      try {
        const d = await api.getBars(symbol, timeframe, 200);
        if (!d.bars.length) {
          if (statusRef.current) statusRef.current.textContent = 'No bars returned';
          return;
        }
        const candles = d.bars
          .map((b) => ({ time: Math.floor(new Date(b.t).getTime() / 1000) as any, open: b.o, high: b.h, low: b.l, close: b.c }))
          .sort((a: any, b: any) => a.time - b.time);
        series.setData(candles);
        chart.timeScale().fitContent();
        if (statusRef.current) statusRef.current.textContent = `${d.bars.length} bars`;
      } catch (e: any) {
        if (statusRef.current) statusRef.current.textContent = 'Chart error: ' + e.message;
      }
    })();

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [symbol, timeframe, height, theme]);

  return (
    <div>
      <span ref={statusRef} className="text-[11px] text-muted font-mono" />
      <div ref={containerRef} style={{ height }} />
    </div>
  );
}
