import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmt, fmtDate, plClass, plSign } from '../lib/formatters';
import { TIMEFRAMES, TIMEFRAME_LABELS, type Timeframe } from '../lib/constants';
import { CandlestickChart } from '../components/charts/CandlestickChart';
import { PriceFlash } from '../components/shared/PriceFlash';
import { OrderForm } from '../components/trading/OrderForm';
import { Spinner } from '../components/shared/Spinner';
import { useAccountStore } from '../stores/useAccountStore';
import type { Snapshot, Position, Order } from '../types';
import { motion } from 'framer-motion';

type Tab = 'position' | 'orders';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
});

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = (symbol ?? '').toUpperCase();
  const navigate = useNavigate();

  const [snapshot, setSnapshot]   = useState<Snapshot | null>(null);
  const [tf, setTf]               = useState<Timeframe>('5Min');
  const [tab, setTab]             = useState<Tab>('position');
  const [position, setPosition]   = useState<Position | null>(null);
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const account = useAccountStore((s) => s.account);

  const loadSnapshot = useCallback(async () => {
    try { setSnapshot(await api.getSnapshot(sym)); } catch { /* ignore */ }
    setLoading(false);
  }, [sym]);

  const loadPosition = useCallback(async () => {
    try {
      const positions = await api.getPositions();
      setPosition(positions.find((p) => p.symbol === sym) ?? null);
    } catch { /* ignore */ }
  }, [sym]);

  useEffect(() => {
    loadSnapshot();
    loadPosition();
    const id = setInterval(loadSnapshot, 15_000);
    return () => clearInterval(id);
  }, [loadSnapshot, loadPosition]);

  const loadOrders = useCallback(async () => {
    try {
      const all = await api.getOrders('all', 100);
      setOrders(all.filter((o) => o.symbol === sym));
    } catch { /* ignore */ }
  }, [sym]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
  }, [tab, loadOrders]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320 }}>
      <Spinner className="w-6 h-6" />
    </div>
  );

  const price      = snapshot?.price;
  const change     = snapshot?.change;
  const changePct  = snapshot?.change_pct;
  const isPositive = (change ?? 0) >= 0;

  const posMarketVal       = position ? parseFloat(position.market_value    || '0') : null;
  const posUnrealizedPl    = position ? parseFloat(position.unrealized_pl   || '0') : null;
  const posUnrealizedPlPct = position ? parseFloat(position.unrealized_plpc || '0') * 100 : null;
  const posAvgCost         = position ? parseFloat(position.avg_entry_price || '0') : null;
  const posQty             = position ? parseFloat(position.qty             || '0') : null;
  const equity             = account?.equity ? parseFloat(account.equity) : null;
  const portfolioPct       = posMarketVal && equity ? (posMarketVal / equity) * 100 : null;

  const gainColor  = 'var(--color-gain)';
  const lossColor  = 'var(--color-loss)';
  const priceColor = isPositive ? gainColor : lossColor;

  return (
    <div style={{ maxWidth: 1280, paddingBottom: 48 }}>

      {/* ── Back ── */}
      <motion.button
        {...fade(0)}
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-muted)', fontSize: 12, fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
        }}
        whileHover={{ x: -2 }}
        transition={{ duration: 0.1 }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
        </svg>
        Back
      </motion.button>

      {/* ── Stock header ── */}
      <motion.div {...fade(0.04)} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
            color: 'var(--color-muted)', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            {sym}
          </span>
          <span style={{ color: 'var(--color-border)', fontSize: 11 }}>·</span>
          <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
            NASDAQ · Paper Trading
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
          {/* Price */}
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
            {price
              ? <PriceFlash value={price} className="" />
              : <span style={{ color: 'var(--color-muted)' }}>$–</span>
            }
          </div>

          {/* Change badge */}
          {change != null && changePct != null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 4,
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 999,
                background: isPositive ? 'var(--color-gain-soft)' : 'var(--color-loss-soft)',
                color: priceColor,
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
              }}>
                {isPositive ? '▲' : '▼'}
                {plSign(change)}${Math.abs(change).toFixed(2)}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600, color: priceColor, fontFamily: 'var(--font-mono)',
              }}>
                {plSign(changePct)}{Math.abs(changePct).toFixed(2)}%
              </span>
              <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>today</span>
            </div>
          )}
        </div>

        {snapshot?.timestamp && (
          <p style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', marginTop: 6, letterSpacing: '0.03em' }}>
            Updated {fmtDate(snapshot.timestamp)}
          </p>
        )}
      </motion.div>

      {/* ── Two-column body ── */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* ── Left: chart + stats + tabs ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Chart card */}
          <motion.div {...fade(0.08)} style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 16,
          }}>
            <CandlestickChart symbol={sym} timeframe={tf} />

            {/* Timeframe row */}
            <div style={{
              display: 'flex', alignItems: 'center',
              borderTop: '1px solid var(--color-border)',
              padding: '0 16px',
            }}>
              {TIMEFRAMES.map((t: Timeframe) => (
                <button
                  key={t}
                  onClick={() => setTf(t)}
                  style={{
                    padding: '10px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                    background: 'none',
                    border: 'none',
                    borderBottom: `2px solid ${tf === t ? gainColor : 'transparent'}`,
                    color: tf === t ? 'var(--color-text)' : 'var(--color-muted)',
                    cursor: 'pointer',
                    transition: 'color 0.12s, border-color 0.12s',
                  }}
                >
                  {TIMEFRAME_LABELS[t]}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Position stats grid */}
          {position && (
            <motion.div {...fade(0.14)} style={{ marginBottom: 16 }}>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1, background: 'var(--color-border)',
                border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden',
              }}>
                {[
                  { label: 'Market Value',  value: fmt(posMarketVal),   color: undefined },
                  { label: 'Avg Cost',      value: posAvgCost ? `$${posAvgCost.toFixed(2)}` : '–', color: undefined },
                  {
                    label: 'Unrealized P&L',
                    value: posUnrealizedPl != null
                      ? `${plSign(posUnrealizedPl)}${fmt(Math.abs(posUnrealizedPl))}`
                      : '–',
                    color: posUnrealizedPl != null
                      ? posUnrealizedPl >= 0 ? gainColor : lossColor
                      : undefined,
                  },
                  { label: 'Shares',        value: posQty != null ? (posQty % 1 === 0 ? posQty.toFixed(0) : posQty.toFixed(4)) : '–', color: undefined },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--color-card)', padding: '18px 20px' }}>
                    <div style={{
                      fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)',
                      textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8,
                    }}>
                      {label}
                    </div>
                    <div style={{
                      fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)',
                      letterSpacing: '-0.02em', color: color ?? 'var(--color-text)',
                    }}>
                      {value}
                    </div>
                    {label === 'Unrealized P&L' && posUnrealizedPlPct != null && (
                      <div style={{ fontSize: 10, color: color ?? 'var(--color-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        {plSign(posUnrealizedPlPct)}{Math.abs(posUnrealizedPlPct).toFixed(2)}%
                      </div>
                    )}
                    {label === 'Market Value' && portfolioPct != null && (
                      <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                        {portfolioPct.toFixed(1)}% of portfolio
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Position / Orders tabs */}
          <motion.div {...fade(0.18)} style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
              {(['position', 'orders'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '12px 20px',
                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    background: 'none', border: 'none',
                    borderBottom: `2px solid ${tab === t ? gainColor : 'transparent'}`,
                    color: tab === t ? 'var(--color-text)' : 'var(--color-muted)',
                    cursor: 'pointer', transition: 'color 0.12s, border-color 0.12s',
                    marginBottom: -1,
                  }}
                >
                  {t === 'orders' ? 'Orders' : 'Position'}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 20px' }}>
              {tab === 'position' && (
                position ? (
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px 24px',
                  }}>
                    {([
                      ['Quantity',      position.qty],
                      ['Avg Entry',     `$${parseFloat(position.avg_entry_price || '0').toFixed(2)}`],
                      ['Current Price', `$${parseFloat(position.current_price   || '0').toFixed(2)}`],
                      ['Market Value',  fmt(position.market_value)],
                      ['Unrealized P&L', fmt(position.unrealized_pl)],
                      ['P&L %',         `${plSign(posUnrealizedPlPct ?? 0)}${Math.abs(posUnrealizedPlPct ?? 0).toFixed(2)}%`],
                    ] as [string, string][]).map(([label, val], i) => (
                      <div key={i}>
                        <div style={{
                          fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)',
                          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4,
                        }}>
                          {label}
                        </div>
                        <div className={i >= 4 ? plClass(position.unrealized_pl) : ''} style={{
                          fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        }}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)', fontSize: 13 }}>
                    No open position in {sym}
                    <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Use the order form to start trading.</div>
                  </div>
                )
              )}

              {tab === 'orders' && (
                !orders.length ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-muted)', fontSize: 13 }}>
                    No orders for {sym}
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Side', 'Type', 'Qty', 'Status', 'Submitted'].map((h) => (
                          <th key={h} style={{
                            textAlign: 'left', paddingBottom: 10,
                            fontFamily: 'var(--font-mono)', fontSize: 9,
                            color: 'var(--color-muted)', letterSpacing: '0.12em',
                            textTransform: 'uppercase', fontWeight: 700,
                            borderBottom: '1px solid var(--color-border)',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{
                            padding: '11px 0', fontWeight: 700, fontSize: 11, fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: o.side === 'buy' ? gainColor : lossColor,
                          }}>
                            {o.side}
                          </td>
                          <td style={{ padding: '11px 8px 11px 0', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)' }}>
                            {o.type}
                          </td>
                          <td style={{ padding: '11px 8px 11px 0', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
                            {o.filled_qty || 0}/{o.qty || '–'}
                          </td>
                          <td style={{ padding: '11px 8px 11px 0' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700,
                              fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase',
                              background: o.status === 'filled' ? 'var(--color-gain-soft)' : 'var(--color-hover)',
                              color: o.status === 'filled' ? gainColor : 'var(--color-muted)',
                            }}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ padding: '11px 0', fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                            {fmtDate(o.submitted_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>
          </motion.div>
        </div>

        {/* ── Right: sticky order panel ── */}
        <motion.div {...fade(0.1)} style={{ width: 300, flexShrink: 0 }} className="hidden lg:block">
          <div style={{ position: 'sticky', top: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Order form card */}
            <div style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <OrderForm symbol={sym} currentPrice={price ?? null} compact />
            </div>

            {/* Secondary actions */}
            <button style={{
              width: '100%', padding: '10px 0', borderRadius: 999,
              border: '1px solid var(--color-border)', background: 'transparent',
              fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)',
              cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.12s',
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
              }}
            >
              Trade {sym} Options
            </button>

            <button style={{
              width: '100%', padding: '10px 0', borderRadius: 999,
              border: '1px solid var(--color-border)', background: 'transparent',
              fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)',
              cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.12s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add to Watchlist
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
