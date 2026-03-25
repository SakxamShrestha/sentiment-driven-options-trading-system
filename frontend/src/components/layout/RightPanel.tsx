import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../../stores/useAccountStore';
import { api } from '../../services/api';
import { plSign } from '../../lib/formatters';
import { Spinner } from '../shared/Spinner';
import type { Position } from '../../types';

interface SparkData {
  points: number[];
  changePct: number;
}

const MiniSparkline = memo(function MiniSparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 60;
  const h = 24;
  const step = w / (points.length - 1);
  const d = points
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="shrink-0">
      <path d={d} fill="none" stroke={up ? 'var(--color-gain)' : 'var(--color-loss)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

function PositionRow({ pos, spark, onClick }: { pos: Position; spark?: SparkData; onClick: () => void }) {
  const price = parseFloat(pos.current_price || '0');
  const plPct = parseFloat(pos.unrealized_plpc || '0') * 100;
  const up = plPct >= 0;
  const qty = parseFloat(pos.qty);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-border last:border-0 cursor-pointer hover:bg-hover/60 transition-all duration-200 group"
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold group-hover:text-accent transition-colors">{pos.symbol}</div>
        <div className="text-[11px] text-muted mt-0.5">
          {qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)} shares
        </div>
      </div>
      <MiniSparkline points={spark?.points ?? []} up={up} />
      <div className="text-right shrink-0 min-w-[72px]">
        <div className="text-[13px] font-semibold font-mono">${price.toFixed(2)}</div>
        <div className={`text-[11px] font-semibold mt-0.5 font-mono ${up ? 'text-gain' : 'text-loss'}`}>
          {plSign(plPct)}{plPct.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function RightPanel() {
  const { positions, setPositions } = useAccountStore();
  const [sparks, setSparks] = useState<Record<string, SparkData>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const loaded = useRef(false);

  const loadPositions = useCallback(async () => {
    try {
      const p = await api.getPositions();
      setPositions(p);
    } catch { /* ignore */ }
    setLoading(false);
  }, [setPositions]);

  const loadSparks = useCallback(async (syms: string[]) => {
    const results: Record<string, SparkData> = {};
    await Promise.all(
      syms.map(async (sym) => {
        try {
          const d = await api.getBars(sym, '5Min', 20);
          if (d.bars.length >= 2) {
            const closes = d.bars.map((b) => b.c);
            const first = closes[0];
            const last = closes[closes.length - 1];
            results[sym] = {
              points: closes,
              changePct: ((last - first) / first) * 100,
            };
          }
        } catch { /* ignore */ }
      })
    );
    setSparks(results);
  }, []);

  useEffect(() => {
    loadPositions();
    const id = setInterval(loadPositions, 15_000);
    return () => clearInterval(id);
  }, [loadPositions]);

  useEffect(() => {
    if (positions.length > 0 && !loaded.current) {
      loaded.current = true;
      loadSparks(positions.map((p) => p.symbol));
    }
  }, [positions, loadSparks]);

  return (
    <div className="hidden lg:flex w-[256px] shrink-0 bg-card border-l border-border flex-col overflow-y-auto scrollbar-thin">
      {loading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : positions.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-muted">
          No positions yet.<br />Search a symbol to start trading.
        </div>
      ) : (
        <div>
          <div className="px-4 pt-5 pb-2 flex items-center justify-between">
            <span className="text-[13px] font-bold">Stocks</span>
            <span className="text-[11px] text-muted font-mono">{positions.length}</span>
          </div>
          {positions.map((pos) => (
            <PositionRow
              key={pos.symbol}
              pos={pos}
              spark={sparks[pos.symbol]}
              onClick={() => navigate(`/stock/${pos.symbol}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
