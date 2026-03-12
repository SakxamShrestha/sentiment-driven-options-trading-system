import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmt, plClass, plSign } from '../lib/formatters';
import { VirtualTable } from '../components/shared/VirtualTable';
import { Spinner } from '../components/shared/Spinner';
import type { Position } from '../types';

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try { setPositions(await api.getPositions()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide">Open Positions</div>
        <button onClick={load} className="text-xs text-muted hover:text-text transition-colors">↻ Refresh</button>
      </div>
      <VirtualTable
        data={positions}
        emptyMessage="No open positions"
        onRowClick={(p) => navigate(`/stock/${p.symbol}`)}
        columns={[
          { header: 'Symbol', accessor: (p) => <span className="font-bold text-blue">{p.symbol}</span> },
          { header: 'Qty', accessor: (p) => p.qty },
          { header: 'Side', accessor: (p) => <span className={`font-semibold text-xs uppercase ${p.side === 'long' ? 'text-gain' : 'text-loss'}`}>{p.side}</span> },
          { header: 'Avg Entry', accessor: (p) => fmt(p.avg_entry_price) },
          { header: 'Current', accessor: (p) => fmt(p.current_price) },
          { header: 'Mkt Value', accessor: (p) => fmt(p.market_value) },
          { header: 'P&L', accessor: (p) => { const pl = parseFloat(p.unrealized_pl || '0'); return <span className={plClass(pl)}>{fmt(pl)}</span>; } },
          { header: 'P&L %', accessor: (p) => { const pct = parseFloat(p.unrealized_plpc || '0') * 100; return <span className={plClass(pct)}>{plSign(pct)}{pct.toFixed(2)}%</span>; } },
        ]}
      />
    </div>
  );
}
