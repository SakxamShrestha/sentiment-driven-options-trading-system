import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmtDate } from '../lib/formatters';
import { useToastStore } from '../stores/useToastStore';
import { VirtualTable } from '../components/shared/VirtualTable';
import { Spinner } from '../components/shared/Spinner';
import type { Order } from '../types';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const toast = useToastStore((s) => s.show);

  const load = async () => {
    setLoading(true);
    try { setOrders(await api.getOrders(status)); } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [status]);

  const cancel = async (id: string) => {
    try {
      await api.cancelOrder(id);
      toast('Order cancelled', 'success');
      load();
    } catch { toast('Cancel failed', 'error'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide">Orders</div>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="text-xs px-2 py-1 border border-border rounded-md bg-bg outline-none">
            <option value="all">All</option><option value="open">Open</option><option value="closed">Closed</option>
          </select>
          <button onClick={load} className="text-xs text-muted hover:text-text transition-colors">↻ Refresh</button>
        </div>
      </div>
      <VirtualTable
        data={orders}
        emptyMessage="No orders found"
        onRowClick={(o) => navigate(`/stock/${o.symbol}`)}
        columns={[
          { header: 'Symbol', accessor: (o) => <span className="font-bold text-blue">{o.symbol}</span> },
          { header: 'Side', accessor: (o) => <span className={`font-semibold text-xs uppercase ${o.side === 'buy' ? 'text-gain' : 'text-loss'}`}>{o.side}</span> },
          { header: 'Type', accessor: (o) => o.type },
          { header: 'Qty', accessor: (o) => `${o.filled_qty || 0}/${o.qty || o.notional || '–'}` },
          { header: 'Status', accessor: (o) => (
            <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${o.status === 'filled' ? 'bg-gain-soft text-gain' : o.status.includes('cancel') ? 'bg-hover text-muted' : 'bg-blue/10 text-blue'}`}>{o.status}</span>
          )},
          { header: 'Submitted', accessor: (o) => <span className="text-xs">{fmtDate(o.submitted_at)}</span> },
          { header: 'Filled At', accessor: (o) => <span className="text-xs">{o.filled_at ? fmtDate(o.filled_at) : '–'}</span> },
          { header: '', accessor: (o) => ['new', 'accepted', 'pending_new'].includes(o.status) ? (
            <button onClick={(e) => { e.stopPropagation(); cancel(o.id); }}
              className="text-[11px] border border-border px-2 py-0.5 rounded-md text-loss hover:border-loss transition-colors">Cancel</button>
          ) : null },
        ]}
      />
    </div>
  );
}
