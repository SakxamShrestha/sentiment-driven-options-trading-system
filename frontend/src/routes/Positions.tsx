import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmt, plClass, plSign } from '../lib/formatters';
import { VirtualTable } from '../components/shared/VirtualTable';
import { Spinner } from '../components/shared/Spinner';
import type { Position } from '../types';
import { motion } from 'framer-motion';

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try { setPositions(await api.getPositions()); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-5 h-5" /></div>;

  return (
    <motion.div className="max-w-[1100px]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-lg font-bold">Positions</h1>
        <button onClick={load} className="text-xs text-accent hover:text-accent-muted transition-colors font-mono font-semibold">Refresh</button>
      </div>
      <div className="card-elevated overflow-hidden pt-1">
        <VirtualTable
          data={positions}
          emptyMessage="No open positions"
          onRowClick={(p) => navigate(`/stock/${p.symbol}`)}
          columns={[
            { header: 'Symbol', accessor: (p) => <span className="font-bold font-mono text-accent">{p.symbol}</span> },
            { header: 'Qty', accessor: (p) => <span className="font-mono">{p.qty}</span> },
            { header: 'Side', accessor: (p) => <span className={`font-semibold text-xs uppercase px-1.5 py-0.5 rounded-md ${p.side === 'long' ? 'text-gain bg-gain-soft' : 'text-loss bg-loss-soft'}`}>{p.side}</span> },
            { header: 'Avg Entry', accessor: (p) => <span className="font-mono">{fmt(p.avg_entry_price)}</span> },
            { header: 'Current', accessor: (p) => <span className="font-mono">{fmt(p.current_price)}</span> },
            { header: 'Mkt Value', accessor: (p) => <span className="font-mono">{fmt(p.market_value)}</span> },
            { header: 'P&L', accessor: (p) => { const pl = parseFloat(p.unrealized_pl || '0'); return <span className={`font-mono font-semibold ${plClass(pl)}`}>{fmt(pl)}</span>; } },
            { header: 'P&L %', accessor: (p) => { const pct = parseFloat(p.unrealized_plpc || '0') * 100; return <span className={`font-mono font-semibold ${plClass(pct)}`}>{plSign(pct)}{pct.toFixed(2)}%</span>; } },
          ]}
        />
      </div>
    </motion.div>
  );
}
