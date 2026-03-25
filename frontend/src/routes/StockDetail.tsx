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
import { AnimatePresence, motion } from 'framer-motion';

type Tab = 'position' | 'orders';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = (symbol ?? '').toUpperCase();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tf, setTf] = useState<Timeframe>('5Min');
  const [tab, setTab] = useState<Tab>('position');
  const [position, setPosition] = useState<Position | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const account = useAccountStore((s) => s.account);

  const loadSnapshot = useCallback(async () => {
    try {
      const d = await api.getSnapshot(sym);
      setSnapshot(d);
    } catch { /* ignore */ }
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

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  const price = snapshot?.price;
  const change = snapshot?.change;
  const changePct = snapshot?.change_pct;
  const isPositive = (change ?? 0) >= 0;

  // Position stats
  const posMarketVal = position ? parseFloat(position.market_value || '0') : null;
  const posUnrealizedPl = position ? parseFloat(position.unrealized_pl || '0') : null;
  const posUnrealizedPlPct = position ? parseFloat(position.unrealized_plpc || '0') * 100 : null;
  const posAvgCost = position ? parseFloat(position.avg_entry_price || '0') : null;
  const posQty = position ? parseFloat(position.qty || '0') : null;
  const equity = account?.equity ? parseFloat(account.equity) : null;
  const portfolioPct = posMarketVal && equity ? (posMarketVal / equity) * 100 : null;

  return (
    <div className="flex gap-6 max-w-[1240px] pb-10">

      {/* ── Left column ── */}
      <div className="flex-1 min-w-0">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mb-5 text-xs text-muted hover:text-text transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>

        {/* Stock header */}
        <div className="mb-5">
          <h1 className="text-[15px] font-semibold text-muted mb-1">{sym}</h1>
          <div className="flex items-baseline gap-3 flex-wrap">
            {price
              ? <PriceFlash value={price} className="text-4xl font-bold" />
              : <span className="text-4xl font-bold">$–</span>
            }
            {change !== null && change !== undefined && changePct !== null && changePct !== undefined && (
              <span className={`text-base font-semibold ${isPositive ? 'text-gain' : 'text-loss'}`}>
                {plSign(change)}${Math.abs(change).toFixed(2)} ({plSign(changePct)}{Math.abs(changePct).toFixed(2)}%) Today
              </span>
            )}
          </div>
          {snapshot?.timestamp && (
            <p className="text-[11px] text-muted mt-1 font-mono">
              Updated {fmtDate(snapshot.timestamp)}
            </p>
          )}
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={tf}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <CandlestickChart symbol={sym} timeframe={tf} />
            </motion.div>
          </AnimatePresence>

          {/* Timeframe selector — underline style */}
          <div className="flex items-center border-t border-border px-4">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-3 py-2.5 text-xs font-semibold font-mono transition-all duration-150 border-b-2 ${
                  tf === t
                    ? 'text-text border-gain'
                    : 'text-muted border-transparent hover:text-text'
                }`}
              >
                {TIMEFRAME_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Stats cards — only if position exists */}
        {position && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Market Value card */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-[11px] text-muted font-mono uppercase tracking-widest mb-3">Your market value</p>
              <p className="text-2xl font-bold mb-4">{fmt(posMarketVal)}</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Today's return</span>
                  <span className={`font-semibold font-mono ${posUnrealizedPl !== null && posUnrealizedPl >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {posUnrealizedPl !== null ? `${plSign(posUnrealizedPl)}${fmt(Math.abs(posUnrealizedPl))}` : '–'}
                    {posUnrealizedPlPct !== null && (
                      <span className="text-xs ml-1 opacity-70">({plSign(posUnrealizedPlPct)}{Math.abs(posUnrealizedPlPct).toFixed(2)}%)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Total return</span>
                  <span className={`font-semibold font-mono ${posUnrealizedPl !== null && posUnrealizedPl >= 0 ? 'text-gain' : 'text-loss'}`}>
                    {posUnrealizedPl !== null ? `${plSign(posUnrealizedPl)}${fmt(Math.abs(posUnrealizedPl))}` : '–'}
                  </span>
                </div>
              </div>
            </div>

            {/* Average Cost card */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-[11px] text-muted font-mono uppercase tracking-widest mb-3">Your average cost</p>
              <p className="text-2xl font-bold mb-4">{posAvgCost ? `$${posAvgCost.toFixed(2)}` : '–'}</p>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Shares</span>
                  <span className="font-semibold font-mono">
                    {posQty !== null ? (posQty % 1 === 0 ? posQty.toFixed(0) : posQty.toFixed(6)) : '–'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Portfolio diversity</span>
                  <span className="font-semibold font-mono">
                    {portfolioPct !== null ? `${portfolioPct.toFixed(2)}%` : '–'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Position / Orders / Sentiment */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex border-b border-border">
            {(['position', 'orders'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-all duration-150 capitalize ${
                  tab === t ? 'text-text border-gain' : 'text-muted border-transparent hover:text-text'
                }`}
              >
                {t === 'orders' ? 'Orders' : 'Position'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'position' && (
              <div>
                {position ? (
                  <div className="grid grid-cols-3 gap-5">
                    {[
                      ['Quantity', position.qty],
                      ['Avg Entry', `$${parseFloat(position.avg_entry_price || '0').toFixed(2)}`],
                      ['Current Price', `$${parseFloat(position.current_price || '0').toFixed(2)}`],
                      ['Market Value', fmt(position.market_value)],
                      ['Unrealized P&L', fmt(position.unrealized_pl)],
                      ['P&L %', `${plSign(posUnrealizedPlPct ?? 0)}${Math.abs(posUnrealizedPlPct ?? 0).toFixed(2)}%`],
                    ].map(([label, val], i) => (
                      <div key={i}>
                        <div className="text-[11px] text-muted font-mono uppercase tracking-widest mb-1">{label}</div>
                        <div className={`text-base font-bold ${i >= 4 ? plClass(position.unrealized_pl) : ''}`}>{val}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted text-sm">
                    No open position in {sym}.<br />
                    <span className="text-xs mt-1 block">Use the order form to start trading.</span>
                  </div>
                )}
              </div>
            )}

            {tab === 'orders' && (
              <div>
                {!orders.length ? (
                  <div className="text-center py-6 text-muted text-sm">No orders for {sym}</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[11px] font-semibold text-muted uppercase tracking-widest border-b border-border">
                        <th className="text-left pb-2">Side</th>
                        <th className="text-left pb-2">Type</th>
                        <th className="text-left pb-2">Qty</th>
                        <th className="text-left pb-2">Status</th>
                        <th className="text-left pb-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                          <td className={`py-3 font-semibold text-xs uppercase ${o.side === 'buy' ? 'text-gain' : 'text-loss'}`}>{o.side}</td>
                          <td className="py-3 text-xs">{o.type}</td>
                          <td className="py-3 text-xs font-mono">{o.filled_qty || 0}/{o.qty || '–'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.status === 'filled' ? 'bg-gain-soft text-gain' :
                              o.status.includes('cancel') ? 'bg-hover text-muted' : 'bg-hover text-muted'
                            }`}>{o.status}</span>
                          </td>
                          <td className="py-3 text-xs text-muted">{fmtDate(o.submitted_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ── Right column: sticky order card ── */}
      <div className="w-[280px] shrink-0 hidden lg:block">
        <div className="sticky top-4 space-y-3">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <OrderForm symbol={sym} currentPrice={price ?? null} compact />
          </div>

          {/* Secondary actions */}
          <button className="w-full py-2.5 border border-border rounded-2xl text-sm text-muted hover:border-accent hover:text-accent transition-colors">
            Trade {sym} Options
          </button>
          <button className="w-full py-2.5 border border-border rounded-2xl text-sm text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
            Add to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
}
