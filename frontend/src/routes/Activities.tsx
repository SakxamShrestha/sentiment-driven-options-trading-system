import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmt, fmtDate, plClass, plSign } from '../lib/formatters';
import { VirtualTable } from '../components/shared/VirtualTable';
import { Spinner } from '../components/shared/Spinner';
import type { Activity } from '../types';

interface PnlRow {
  sym: string; qty: number; entry: number; exit: number;
  pnl: number; pnlPct: number; time?: string;
}

function computePnl(fills: Activity[]): { rows: PnlRow[]; total: number } {
  const bySymbol: Record<string, { buys: { qty: number; price: number }[]; sells: { qty: number; price: number; time?: string }[] }> = {};
  fills.forEach((f) => {
    if (!f.symbol || !f.side || !f.qty || !f.price) return;
    if (!bySymbol[f.symbol]) bySymbol[f.symbol] = { buys: [], sells: [] };
    const entry = { qty: Math.abs(parseFloat(f.qty)), price: parseFloat(f.price), time: f.transaction_time };
    if (f.side === 'buy') bySymbol[f.symbol].buys.push(entry);
    else if (f.side === 'sell') bySymbol[f.symbol].sells.push(entry as any);
  });

  const rows: PnlRow[] = [];
  let total = 0;
  Object.entries(bySymbol).forEach(([sym, data]) => {
    const queue = [...data.buys];
    data.sells.forEach((sell: any) => {
      let remaining = sell.qty;
      let costBasis = 0;
      let matched = 0;
      while (remaining > 0 && queue.length) {
        const b = queue[0];
        const taken = Math.min(b.qty, remaining);
        costBasis += taken * b.price;
        matched += taken;
        b.qty -= taken;
        if (b.qty <= 0) queue.shift();
        remaining -= taken;
      }
      if (matched > 0) {
        const avgEntry = costBasis / matched;
        const pnl = (sell.price - avgEntry) * matched;
        const pnlPct = ((sell.price - avgEntry) / avgEntry) * 100;
        total += pnl;
        rows.push({ sym, qty: matched, entry: avgEntry, exit: sell.price, pnl, pnlPct, time: sell.time });
      }
    });
  });
  rows.sort((a, b) => new Date(b.time ?? 0).getTime() - new Date(a.time ?? 0).getTime());
  return { rows, total };
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fills, setFills] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const [acts, fillData] = await Promise.all([
        api.getActivities('FILL'),
        api.getActivities('FILL'),
      ]);
      setActivities(acts);
      setFills(fillData);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const { rows: pnlRows, total: pnlTotal } = useMemo(() => computePnl(fills), [fills]);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-5 h-5" /></div>;

  return (
    <div className="max-w-[1100px]">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-lg font-bold">Activities</h1>
        <button onClick={load} className="text-xs text-accent hover:text-accent-muted transition-all duration-200 font-mono font-semibold">Refresh</button>
      </div>

      {/* Realized P&L */}
      <div className="terminal-card overflow-hidden mb-5">
        <div className="flex justify-between items-center px-4 py-3 border-b border-border">
          <div className="text-xs font-mono text-muted tracking-wider uppercase">Realized P&L</div>
          {pnlRows.length > 0 && (
            <span className={`text-sm font-semibold font-mono ${plClass(pnlTotal)}`}>
              {plSign(pnlTotal)}{fmt(pnlTotal)}
            </span>
          )}
        </div>
        <VirtualTable
          data={pnlRows}
          emptyMessage="No completed trades yet"
          onRowClick={(r) => navigate(`/stock/${r.sym}`)}
          columns={[
            { header: 'Symbol', accessor: (r) => <span className="font-semibold font-mono">{r.sym}</span> },
            { header: 'Qty', accessor: (r) => <span className="font-mono">{r.qty.toFixed(4)}</span> },
            { header: 'Avg Entry', accessor: (r) => <span className="font-mono">{fmt(r.entry)}</span> },
            { header: 'Exit', accessor: (r) => <span className="font-mono">{fmt(r.exit)}</span> },
            { header: 'P&L', accessor: (r) => <span className={`font-mono ${plClass(r.pnl)}`}>{plSign(r.pnl)}{fmt(r.pnl)}</span> },
            { header: 'P&L %', accessor: (r) => <span className={`font-mono ${plClass(r.pnlPct)}`}>{plSign(r.pnlPct)}{r.pnlPct.toFixed(2)}%</span> },
            { header: 'Closed', accessor: (r) => <span className="text-xs text-muted font-mono">{fmtDate(r.time)}</span> },
          ]}
        />
      </div>

      {/* All Activities */}
      <div className="terminal-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="text-xs font-mono text-muted tracking-wider uppercase">All Activities</div>
        </div>
        <VirtualTable
          data={activities}
          emptyMessage="No activities found"
          onRowClick={(a) => a.symbol && navigate(`/stock/${a.symbol}`)}
          columns={[
            { header: 'Date', accessor: (a) => <span className="text-xs text-muted font-mono">{fmtDate(a.transaction_time || a.date)}</span> },
            { header: 'Symbol', accessor: (a) => <span className="font-semibold font-mono">{a.symbol || '–'}</span> },
            { header: 'Type', accessor: (a) => <span className="text-xs font-mono">{a.activity_type || '–'}</span> },
            { header: 'Side', accessor: (a) => <span className={`font-medium text-xs uppercase ${a.side === 'buy' ? 'text-gain' : a.side === 'sell' ? 'text-loss' : ''}`}>{a.side || '–'}</span> },
            { header: 'Qty', accessor: (a) => <span className="font-mono">{a.qty || '–'}</span> },
            { header: 'Price', accessor: (a) => <span className="font-mono">{a.price ? fmt(a.price) : '–'}</span> },
            { header: 'Amount', accessor: (a) => <span className="font-mono">{a.net_amount ? fmt(a.net_amount) : '–'}</span> },
          ]}
        />
      </div>
    </div>
  );
}
