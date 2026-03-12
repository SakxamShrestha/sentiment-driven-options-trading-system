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

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  return (
    <div>
      {/* Realized P&L */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">Realized P&L — Trade History</div>
          {pnlRows.length > 0 && (
            <span className={`text-sm font-bold ${plClass(pnlTotal)}`}>
              {plSign(pnlTotal)}{fmt(pnlTotal)} total realized
            </span>
          )}
        </div>
        <VirtualTable
          data={pnlRows}
          emptyMessage="No completed (matched buy+sell) trades yet"
          onRowClick={(r) => navigate(`/stock/${r.sym}`)}
          columns={[
            { header: 'Symbol', accessor: (r) => <span className="font-bold text-blue">{r.sym}</span> },
            { header: 'Qty', accessor: (r) => r.qty.toFixed(4) },
            { header: 'Avg Entry', accessor: (r) => fmt(r.entry) },
            { header: 'Exit Price', accessor: (r) => fmt(r.exit) },
            { header: 'P&L', accessor: (r) => <span className={plClass(r.pnl)}>{plSign(r.pnl)}{fmt(r.pnl)}</span> },
            { header: 'P&L %', accessor: (r) => <span className={plClass(r.pnlPct)}>{plSign(r.pnlPct)}{r.pnlPct.toFixed(2)}%</span> },
            { header: 'Closed At', accessor: (r) => <span className="text-xs">{fmtDate(r.time)}</span> },
          ]}
        />
      </div>

      {/* All Activities */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">All Activities</div>
          <button onClick={load} className="text-xs text-muted hover:text-text transition-colors">↻ Refresh</button>
        </div>
        <VirtualTable
          data={activities}
          emptyMessage="No activities found"
          onRowClick={(a) => a.symbol && navigate(`/stock/${a.symbol}`)}
          columns={[
            { header: 'Date', accessor: (a) => <span className="text-xs">{fmtDate(a.transaction_time || a.date)}</span> },
            { header: 'Symbol', accessor: (a) => <span className="font-bold text-blue">{a.symbol || '–'}</span> },
            { header: 'Type', accessor: (a) => a.activity_type || '–' },
            { header: 'Side', accessor: (a) => <span className={`font-semibold text-xs uppercase ${a.side === 'buy' ? 'text-gain' : a.side === 'sell' ? 'text-loss' : ''}`}>{a.side || '–'}</span> },
            { header: 'Qty', accessor: (a) => a.qty || '–' },
            { header: 'Price', accessor: (a) => a.price ? fmt(a.price) : '–' },
            { header: 'Amount', accessor: (a) => a.net_amount ? fmt(a.net_amount) : '–' },
          ]}
        />
      </div>
    </div>
  );
}
