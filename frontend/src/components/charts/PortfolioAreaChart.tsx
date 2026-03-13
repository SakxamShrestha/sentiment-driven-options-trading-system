import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, AreaSeries, CrosshairMode } from 'lightweight-charts';
import { api } from '../../services/api';
import type { PortfolioPeriod } from '../../lib/constants';
import { Spinner } from '../shared/Spinner';

interface Props {
  period: PortfolioPeriod;
  height?: number;
}

export function PortfolioAreaChart({ period, height = 160 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const statusRef = useRef<string>('loading');

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    let chart: IChartApi;

    (async () => {
      try {
        const d = await api.getPortfolioHistory(period);
        if (!d.points || d.points.length < 2) {
          if (containerRef.current) containerRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-muted text-xs">No history data yet</div>';
          return;
        }

        const first = d.points[0].v;
        const last = d.points[d.points.length - 1].v;
        const isUp = last >= first;
        const lineColor = isUp ? '#16a34a' : '#dc2626';
        const topColor = isUp ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)';

        chart = createChart(containerRef.current!, {
          width: containerRef.current!.clientWidth,
          height,
          layout: { background: { color: '#ffffff' }, textColor: '#6b7280' },
          grid: { vertLines: { color: '#f3f4f6' }, horzLines: { color: '#f3f4f6' } },
          crosshair: { mode: CrosshairMode.Magnet },
          rightPriceScale: { borderColor: '#e5e7eb', scaleMargins: { top: 0.1, bottom: 0.1 } },
          timeScale: { borderColor: '#e5e7eb', timeVisible: true, secondsVisible: false },
          handleScroll: false,
          handleScale: false,
        });

        chartRef.current = chart;

        const series = chart.addSeries(AreaSeries, {
          lineColor,
          topColor,
          bottomColor: 'rgba(255,255,255,0)',
          lineWidth: 2,
          priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        });

        const data = d.points.map((p) => ({
          time: p.t as any,
          value: parseFloat(p.v.toFixed(2)),
        }));
        series.setData(data);
        chart.timeScale().fitContent();

        const ro = new ResizeObserver(() => {
          if (containerRef.current && chart) chart.applyOptions({ width: containerRef.current.clientWidth });
        });
        ro.observe(containerRef.current!);
      } catch (e: any) {
        if (containerRef.current) containerRef.current.innerHTML = `<div class="flex items-center justify-center h-full text-muted text-xs">Chart unavailable: ${e.message}</div>`;
      }
    })();

    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [period, height]);

  return (
    <div ref={containerRef} style={{ height }} className="w-full rounded-lg overflow-hidden relative">
      <div className="flex items-center justify-center h-full text-muted text-xs gap-2">
        <Spinner /> Loading chart…
      </div>
    </div>
  );
}
