import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, CrosshairMode } from 'lightweight-charts';
import { api } from '../../services/api';
import type { Timeframe } from '../../lib/constants';

interface Props {
  symbol: string;
  timeframe: Timeframe;
  height?: number;
}

export function CandlestickChart({ symbol, timeframe, height = 300 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: { background: { color: '#ffffff' }, textColor: '#374151' },
      grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#e5e7eb' },
      timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: timeframe === '1Min' },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#16a34a', downColor: '#dc2626',
      borderUpColor: '#16a34a', borderDownColor: '#dc2626',
      wickUpColor: '#16a34a', wickDownColor: '#dc2626',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    (async () => {
      if (statusRef.current) statusRef.current.textContent = 'Loading…';
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
        if (statusRef.current) statusRef.current.textContent = `${d.bars.length} bars · ${timeframe}`;
      } catch (e: any) {
        if (statusRef.current) statusRef.current.textContent = 'Chart error: ' + e.message;
      }
    })();

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [symbol, timeframe, height]);

  return (
    <div>
      <span ref={statusRef} className="text-[11px] text-muted" />
      <div ref={containerRef} style={{ height }} />
    </div>
  );
}
