import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, AreaSeries, CrosshairMode } from 'lightweight-charts';
import { api } from '../../services/api';
import type { PortfolioPeriod } from '../../lib/constants';
import { Spinner } from '../shared/Spinner';
import { useThemeStore } from '../../stores/useThemeStore';

interface Props {
  period: PortfolioPeriod;
  height?: number;
}

const chartTheme = {
  dark: {
    background: '#18181b',
    text: '#71717a',
    grid: '#27272a',
    border: '#3f3f46',
    bottomColor: 'rgba(0,0,0,0)',
  },
  light: {
    background: '#ffffff',
    text: '#a1a1aa',
    grid: '#f4f4f5',
    border: '#e4e4e7',
    bottomColor: 'rgba(250,250,250,0)',
  },
};

export function PortfolioAreaChart({ period, height = 160 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    let chart: IChartApi;
    const colors = chartTheme[theme];

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
        const lineColor = isUp
          ? (theme === 'dark' ? '#22c55e' : '#16a34a')
          : (theme === 'dark' ? '#ef4444' : '#dc2626');
        const topColor = isUp
          ? (theme === 'dark' ? 'rgba(34,197,94,0.15)' : 'rgba(22,163,74,0.14)')
          : (theme === 'dark' ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.14)');

        chart = createChart(containerRef.current!, {
          width: containerRef.current!.clientWidth,
          height,
          layout: { background: { color: colors.background }, textColor: colors.text },
          grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
          crosshair: { mode: CrosshairMode.Magnet },
          rightPriceScale: { borderColor: colors.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
          timeScale: { borderColor: colors.border, timeVisible: true, secondsVisible: false },
          handleScroll: false,
          handleScale: false,
        });

        chartRef.current = chart;

        const series = chart.addSeries(AreaSeries, {
          lineColor,
          topColor,
          bottomColor: colors.bottomColor,
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
  }, [period, height, theme]);

  return (
    <div ref={containerRef} style={{ height }} className="w-full rounded-lg overflow-hidden relative">
      <div className="flex items-center justify-center h-full text-muted text-xs gap-2">
        <Spinner /> Loading chart…
      </div>
    </div>
  );
}
