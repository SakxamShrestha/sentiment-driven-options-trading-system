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

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-5 h-5" /></div>;

  return (
    <div className="max-w-[1100px]">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-lg font-bold">Orders</h1>
        <div className="flex gap-2 items-center">
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 border border-border rounded-sm bg-bg outline-none focus:border-accent transition-colors duration-150 font-mono">
            <option value="all">All</option><option value="open">Open</option><option value="closed">Closed</option>
          </select>
          <button onClick={load} className="text-xs text-accent hover:text-accent-muted transition-all duration-200 font-mono font-semibold">Refresh</button>
        </div>
      </div>
      <div className="terminal-card overflow-hidden pt-1">
        <VirtualTable
          data={orders}
          emptyMessage="No orders found"
          onRowClick={(o) => navigate(`/stock/${o.symbol}`)}
          columns={[
            { header: 'Symbol', accessor: (o) => <span className="font-semibold font-mono">{o.symbol}</span> },
            { header: 'Side', accessor: (o) => <span className={`font-medium text-xs uppercase ${o.side === 'buy' ? 'text-gain' : 'text-loss'}`}>{o.side}</span> },
            { header: 'Type', accessor: (o) => <span className="font-mono text-xs">{o.type}</span> },
            { header: 'Qty', accessor: (o) => <span className="font-mono">{o.filled_qty || 0}/{o.qty || o.notional || '–'}</span> },
            { header: 'Status', accessor: (o) => (
              <span className={`px-1.5 py-0.5 rounded-sm text-[11px] font-mono font-medium ${o.status === 'filled' ? 'bg-gain-soft text-gain' : o.status.includes('cancel') ? 'bg-hover text-muted' : 'bg-hover text-muted'}`}>{o.status}</span>
            )},
            { header: 'Submitted', accessor: (o) => <span className="text-xs text-muted font-mono">{fmtDate(o.submitted_at)}</span> },
            { header: 'Filled', accessor: (o) => <span className="text-xs text-muted font-mono">{o.filled_at ? fmtDate(o.filled_at) : '–'}</span> },
            { header: '', accessor: (o) => ['new', 'accepted', 'pending_new'].includes(o.status) ? (
              <button onClick={(e) => { e.stopPropagation(); cancel(o.id); }}
                className="text-[11px] border border-border px-2 py-0.5 rounded-sm font-mono text-loss hover:border-loss transition-colors duration-150">Cancel</button>
            ) : null },
          ]}
        />
      </div>
    </div>
  );
}
