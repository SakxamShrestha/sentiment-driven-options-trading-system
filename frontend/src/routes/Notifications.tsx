import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fmt } from '../lib/formatters';
import { Spinner } from '../components/shared/Spinner';
import type { Notification } from '../stores/useNotificationStore';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#b45309', '#7c3aed', '#0891b2', '#16a34a',
  '#dc2626', '#9333ea', '#0d9488', '#d97706',
];

function avatarColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = key.charCodeAt(i) + h * 31;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(dateStr);
  return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
}

function fullTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotifGroup {
  key: string;
  label: string;
  color: string;
  latest: Notification;
  items: Notification[];
  unread: number;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ label, color, size = 36 }: { label: string; color: string; size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color + '22',
        border: `1.5px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: size <= 28 ? 9 : 11,
        fontWeight: 700,
        color: color,
        letterSpacing: '-0.03em',
      }}>
        {label.slice(0, 4)}
      </span>
    </div>
  );
}

function SideIcon({ side }: { side: string | null }) {
  const isUp = side === 'buy';
  const color = isUp ? 'var(--color-gain)' : side === 'sell' ? 'var(--color-loss)' : 'var(--color-muted)';
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 4,
      background: isUp ? 'var(--color-gain-soft)' : side === 'sell' ? 'var(--color-loss-soft)' : 'var(--color-hover)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {side === 'buy' ? (
        <svg width="10" height="10" fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
        </svg>
      ) : side === 'sell' ? (
        <svg width="10" height="10" fill="none" stroke={color} strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M12 5v14" /><path d="M19 12l-7 7-7-7" />
        </svg>
      ) : (
        <svg width="10" height="10" fill="none" stroke={color} strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )}
    </div>
  );
}

// ── Left panel list item ──────────────────────────────────────────────────────

function GroupItem({
  group, active, onClick,
}: {
  group: NotifGroup;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: active ? 0 : 2 }}
      transition={{ duration: 0.12 }}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '10px 14px 10px 0',
        background: active ? 'var(--color-hover)' : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${active ? group.color : 'transparent'}`,
        borderRadius: '0 6px 6px 0',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.12s',
        paddingLeft: 12,
        position: 'relative',
      }}
    >
      {/* Unread dot */}
      {group.unread > 0 && !active && (
        <span style={{
          position: 'absolute',
          top: 10,
          left: 35,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: group.color,
          border: '1.5px solid var(--color-bg)',
        }} />
      )}

      <Avatar label={group.label} color={group.color} size={36} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            color: active ? group.color : 'var(--color-text)',
            letterSpacing: '-0.02em',
          }}>
            {group.label}
          </span>
          <span style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {timeAgo(group.latest.created_at)}
          </span>
        </div>
        <p style={{
          fontSize: 11,
          color: 'var(--color-muted)',
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 155,
        }}>
          {group.latest.message}
        </p>
      </div>
    </motion.button>
  );
}

// ── Notification bubble (detail view) ────────────────────────────────────────

function NotifBubble({ notif, color }: { notif: Notification; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      {/* Timestamp */}
      <div style={{
        textAlign: 'center',
        fontSize: 10,
        color: 'var(--color-muted)',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.05em',
      }}>
        {fullTime(notif.created_at)}
      </div>

      {/* Bubble row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <Avatar label={notif.symbol || '·'} color={color} size={28} />

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px 12px 12px 12px',
          padding: '10px 14px',
          maxWidth: 440,
          flex: 1,
        }}>
          {/* Top row: side icon + trade summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <SideIcon side={notif.side} />
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: notif.side === 'buy' ? 'var(--color-gain)' : notif.side === 'sell' ? 'var(--color-loss)' : 'var(--color-muted)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {notif.side || 'event'}
            </span>
            {notif.qty && (
              <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                {notif.qty.toFixed(4)} shares
              </span>
            )}
            {notif.price && (
              <>
                <span style={{ fontSize: 10, color: 'var(--color-border)' }}>·</span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', fontWeight: 600 }}>
                  {fmt(notif.price)}
                </span>
              </>
            )}
          </div>

          {/* Message */}
          <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
            {notif.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ── Action pills ─────────────────────────────────────────────────────────────

function ActionPills({ symbol, side }: { symbol: string | null; side: string | null }) {
  const navigate = useNavigate();
  const pills = [
    symbol && { label: 'View Chart →', action: () => navigate(`/stock/${symbol}`) },
    { label: 'Place Order', action: () => symbol && navigate(`/stock/${symbol}`) },
    { label: 'View Positions', action: () => navigate('/positions') },
    side === 'buy' && { label: 'See P&L', action: () => navigate('/activities') },
  ].filter(Boolean) as { label: string; action: () => void }[];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: 16 }}>
      {pills.map((p) => (
        <button
          key={p.label}
          onClick={p.action}
          style={{
            padding: '7px 16px',
            borderRadius: 999,
            border: '1.5px solid var(--color-border)',
            background: 'transparent',
            fontSize: 12,
            color: 'var(--color-text)',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.4,
    }}>
      <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ color: 'var(--color-muted)' }}>
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        No notifications yet
      </p>
      <p style={{ fontSize: 11, color: 'var(--color-muted)', opacity: 0.6 }}>
        Place a trade to see activity here
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedKey, setSelectedKey]     = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=200');
      const d = await r.json();
      setNotifications(d.notifications ?? []);
      await fetch('/api/notifications/read', { method: 'POST' });
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Group notifications by symbol (fallback to type)
  const groups = useMemo<NotifGroup[]>(() => {
    const map = new Map<string, Notification[]>();
    for (const n of notifications) {
      const key = n.symbol ?? n.type ?? 'general';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(n);
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: key.toUpperCase(),
      color: avatarColor(key),
      latest: items[0],
      items,
      unread: items.filter(n => !n.read).length,
    }));
  }, [notifications]);

  // Auto-select first group
  useEffect(() => {
    if (groups.length > 0 && !selectedKey) setSelectedKey(groups[0].key);
  }, [groups, selectedKey]);

  const selected = groups.find(g => g.key === selectedKey) ?? null;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 48px)',
      maxHeight: 820,
      overflow: 'hidden',
      border: '1px solid var(--color-border)',
      borderRadius: 6,
      background: 'var(--color-card)',
    }}>

      {/* ── Left: group list ─────────────────────────────────────────────── */}
      <div style={{
        width: 260,
        borderRight: '1px solid var(--color-border)',
        display: mobileShowDetail ? 'none' : 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}
        className="md:flex"
      >
        {/* Header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
            Notifications
          </h2>
          <button
            onClick={load}
            style={{
              fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-accent)',
              background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Refresh
          </button>
        </div>

        {/* Group list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {groups.length === 0 ? (
            <p style={{ fontSize: 11, color: 'var(--color-muted)', textAlign: 'center', padding: '40px 16px', fontFamily: 'var(--font-mono)' }}>
              No activity yet
            </p>
          ) : (
            groups.map(g => (
              <GroupItem
                key={g.key}
                group={g}
                active={selectedKey === g.key}
                onClick={() => {
                  setSelectedKey(g.key);
                  setMobileShowDetail(true);
                }}
              />
            ))
          )}
        </div>

        {/* Footer count */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--color-border)',
          fontSize: 10,
          color: 'var(--color-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.05em',
        }}>
          {notifications.length} TOTAL · {groups.length} ASSETS
        </div>
      </div>

      {/* ── Right: detail timeline ───────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: 'var(--color-bg)',
      }}>
        {selected ? (
          <>
            {/* Detail header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--color-card)',
            }}>
              {/* Mobile back */}
              {mobileShowDetail && (
                <button
                  onClick={() => setMobileShowDetail(false)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontFamily: 'var(--font-mono)',
                  }}
                  className="md:hidden"
                >
                  ← Back
                </button>
              )}
              <Avatar label={selected.label} color={selected.color} size={32} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em' }}>
                  {selected.label}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                  {selected.items.length} event{selected.items.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Live indicator */}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: selected.color, animation: 'blink 2s infinite',
                }} />
                <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Live
                </span>
              </div>
            </div>

            {/* Bubbles */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 20px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              <AnimatePresence>
                {[...selected.items].reverse().map(n => (
                  <NotifBubble key={n.id} notif={n} color={selected.color} />
                ))}
              </AnimatePresence>
            </div>

            {/* Action pills */}
            <div style={{
              padding: '12px 20px 16px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-card)',
            }}>
              <ActionPills symbol={selected.latest.symbol} side={selected.latest.side} />
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
