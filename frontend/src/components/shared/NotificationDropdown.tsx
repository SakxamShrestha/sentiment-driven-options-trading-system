import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore, type Notification } from '../../stores/useNotificationStore';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, setNotifications, setUnreadCount } = useNotificationStore();

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications?limit=4');
      const d = await r.json();
      setNotifications(d.notifications);
      setUnreadCount(d.unread_count);
    } catch { /* ignore */ }
  }, [setNotifications, setUnreadCount]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const markRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const toggle = () => {
    if (!open) { load(); markRead(); }
    setOpen(!open);
  };

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className={`flex items-center gap-1 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap ${
          open ? 'bg-active-bg text-text' : 'text-muted hover:bg-hover hover:text-text'
        }`}
      >
        Notifications
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-4.5 h-4.5 bg-loss text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none ml-0.5"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute top-[calc(100%+8px)] right-0 w-[340px] bg-card border border-border rounded-xl shadow-xl z-[400] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex justify-between items-center">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[11px] text-muted">{unreadCount} unread</span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted">
                No notifications yet. Place a trade to see activity here.
              </div>
            ) : (
              <div>
                {notifications.slice(0, 4).map((n: Notification) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-hover transition-colors cursor-pointer ${n.read === 0 ? 'bg-blue-50/40' : ''}`}
                    onClick={() => {
                      setOpen(false);
                      if (n.symbol) navigate(`/stock/${n.symbol}`);
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      n.side === 'buy' ? 'bg-gain-soft text-gain' : n.side === 'sell' ? 'bg-loss-soft text-loss' : 'bg-hover text-muted'
                    }`}>
                      {n.side === 'buy' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
                      ) : n.side === 'sell' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium leading-snug">{n.message}</div>
                      <div className="text-[11px] text-muted mt-0.5">{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="px-4 py-2.5 border-t border-border text-center cursor-pointer hover:bg-hover transition-colors"
              onClick={() => { setOpen(false); navigate('/notifications'); }}
            >
              <span className="text-xs font-semibold text-accent">View All Notifications</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
