import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt, fmtDate } from '../lib/formatters';
import { VirtualTable } from '../components/shared/VirtualTable';
import { Spinner } from '../components/shared/Spinner';
import type { Notification } from '../stores/useNotificationStore';

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=200');
      const d = await r.json();
      setNotifications(d.notifications);
      await fetch('/api/notifications/read', { method: 'POST' });
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  return (
    <div className="max-w-[800px]">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-lg font-bold">Notifications</h1>
          <div className="text-xs text-muted mt-0.5">{notifications.length} total</div>
        </div>
        <button onClick={load} className="text-xs text-accent hover:text-accent-muted transition-colors font-mono font-semibold">Refresh</button>
      </div>
      <div className="terminal-card p-5">
        <VirtualTable
          data={notifications}
          emptyMessage="No notifications yet. Place a trade to see activity here."
          maxHeight={600}
          onRowClick={(n) => n.symbol && navigate(`/stock/${n.symbol}`)}
          columns={[
            {
              header: '',
              accessor: (n) => (
                <div className={`w-7 h-7 rounded-sm flex items-center justify-center ${
                  n.side === 'buy' ? 'bg-gain-soft text-gain' : n.side === 'sell' ? 'bg-loss-soft text-loss' : 'bg-hover text-muted'
                }`}>
                  {n.side === 'buy' ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg>
                  )}
                </div>
              ),
              className: 'w-10',
            },
            { header: 'Activity', accessor: (n) => <span className="text-[13px] font-medium">{n.message}</span> },
            { header: 'Symbol', accessor: (n) => <span className="font-bold font-mono text-accent">{n.symbol || '–'}</span> },
            { header: 'Side', accessor: (n) => (
              <span className={`font-semibold text-xs uppercase ${n.side === 'buy' ? 'text-gain' : 'text-loss'}`}>
                {n.side || '–'}
              </span>
            )},
            { header: 'Qty', accessor: (n) => n.qty ? n.qty.toFixed(4) : '–' },
            { header: 'Price', accessor: (n) => n.price ? fmt(n.price) : '–' },
            { header: 'Time', accessor: (n) => <span className="text-xs">{fmtDate(n.created_at)}</span> },
          ]}
        />
      </div>
    </div>
  );
}
