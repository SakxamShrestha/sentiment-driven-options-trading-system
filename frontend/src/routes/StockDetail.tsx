import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmt, fmtDate, plClass, plSign } from '../lib/formatters';
import { TIMEFRAMES, TIMEFRAME_LABELS, type Timeframe } from '../lib/constants';
import { CandlestickChart } from '../components/charts/CandlestickChart';
import { PriceFlash } from '../components/shared/PriceFlash';
import { Badge } from '../components/shared/Badge';
import { OrderForm } from '../components/trading/OrderForm';
import { Spinner } from '../components/shared/Spinner';
import type { Snapshot, Position, Order } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

type Tab = 'position' | 'orders' | 'sentiment';

export default function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const sym = (symbol ?? '').toUpperCase();
  const navigate = useNavigate();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [tf, setTf] = useState<Timeframe>('5Min');
  const [tab, setTab] = useState<Tab>('position');
  const [position, setPosition] = useState<Position | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sentimentHtml, setSentimentHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);

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

  const loadSentiment = useCallback(async () => {
    setSentimentHtml('<div class="text-center py-4 text-muted text-sm"><span class="inline-block w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin mr-2"></span>Analyzing…</div>');
    try {
      const d = await api.getSentiment(sym, 8);
      if (!d.count) { setSentimentHtml(`<div class="text-center py-4 text-muted text-sm">No news found for ${sym}</div>`); return; }
      const avg = d.average_score;
      const chip = avg === null ? 'Neutral' : avg >= 0.2 ? 'Bullish' : avg <= -0.2 ? 'Bearish' : 'Neutral';
      const cls = avg === null ? 'text-muted' : avg >= 0 ? 'text-gain' : 'text-loss';
      setSentimentHtml(`<div class="flex items-baseline gap-3 mb-3"><span class="text-2xl font-bold ${cls}">${avg !== null ? avg.toFixed(3) : '–'}</span><span class="text-xs font-semibold px-2 py-0.5 rounded-full ${avg !== null && avg >= 0.2 ? 'bg-gain-soft text-gain' : avg !== null && avg <= -0.2 ? 'bg-loss-soft text-loss' : 'bg-hover text-muted'}">${chip}</span><span class="text-xs text-muted">${d.count} articles</span></div>`);
    } catch (e: any) {
      setSentimentHtml(`<div class="text-center py-4 text-muted text-sm">Error: ${e.message}</div>`);
    }
  }, [sym]);

  useEffect(() => {
    if (tab === 'orders') loadOrders();
    if (tab === 'sentiment') loadSentiment();
  }, [tab, loadOrders, loadSentiment]);

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner className="w-6 h-6" /></div>;

  const price = snapshot?.price;
  const change = snapshot?.change;
  const changePct = snapshot?.change_pct;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap mb-4">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg bg-card text-sm text-muted hover:border-accent hover:text-text transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5" /><path d="M12 5l-7 7 7 7" /></svg>
          Back
        </button>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-xl font-bold">{sym}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            {price ? <PriceFlash value={price} className="text-3xl" /> : <span className="text-3xl font-bold">$–</span>}
            {change !== null && change !== undefined && changePct !== null && changePct !== undefined && (
              <Badge variant={change >= 0 ? 'gain' : 'loss'} className="text-sm">
                {plSign(change)}{change.toFixed(2)} ({plSign(changePct)}{changePct.toFixed(2)}%)
              </Badge>
            )}
          </div>
          {snapshot?.timestamp && (
            <div className="text-[11px] text-muted mt-1">Updated {fmtDate(snapshot.timestamp)}</div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <div className="flex gap-1">
            {TIMEFRAMES.map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-3 py-1 rounded-md border text-xs transition-all ${
                  tf === t ? 'bg-text text-white border-text' : 'border-border text-muted hover:border-accent'
                }`}
              >
                {TIMEFRAME_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tf} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <CandlestickChart symbol={sym} timeframe={tf} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Order form */}
      <OrderForm symbol={sym} currentPrice={price ?? null} compact />

      {/* Tabs */}
      <div className="bg-card border border-border rounded-xl p-5 mt-4">
        <div className="flex border-b border-border mb-3">
          {(['position', 'orders', 'sentiment'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                tab === t ? 'text-text border-accent' : 'text-muted border-transparent hover:text-text'
              }`}
            >
              {t === 'orders' ? 'Orders' : t === 'position' ? 'Position' : 'Sentiment'}
            </button>
          ))}
        </div>

        {tab === 'position' && (
          <div>
            {position ? (
              <div className="grid grid-cols-3 gap-4">
                {[
                  ['Qty', position.qty],
                  ['Avg Entry', fmt(position.avg_entry_price)],
                  ['Current', fmt(position.current_price)],
                  ['Market Value', fmt(position.market_value)],
                  ['Unrealized P&L', fmt(position.unrealized_pl)],
                  ['P&L %', `${plSign(parseFloat(position.unrealized_plpc || '0') * 100)}${(parseFloat(position.unrealized_plpc || '0') * 100).toFixed(2)}%`],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div className="text-[11px] text-muted mb-1">{label}</div>
                    <div className={`text-base font-bold ${i >= 4 ? plClass(position.unrealized_pl) : ''}`}>{val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted text-sm">No open position in {sym}</div>
            )}
          </div>
        )}

        {tab === 'orders' && (
          <div>
            {!orders.length ? (
              <div className="text-center py-4 text-muted text-sm">No orders for {sym}</div>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-xs font-semibold text-muted uppercase border-b border-border">
                  <th className="text-left px-3 py-2">Side</th><th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Qty</th><th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Submitted</th>
                </tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-0 hover:bg-hover">
                      <td className={`px-3 py-2 font-semibold text-xs uppercase ${o.side === 'buy' ? 'text-gain' : 'text-loss'}`}>{o.side}</td>
                      <td className="px-3 py-2">{o.type}</td>
                      <td className="px-3 py-2">{o.filled_qty || 0}/{o.qty || '–'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${o.status === 'filled' ? 'bg-gain-soft text-gain' : o.status.includes('cancel') ? 'bg-hover text-muted' : 'bg-blue/10 text-blue'}`}>{o.status}</span>
                      </td>
                      <td className="px-3 py-2 text-xs">{fmtDate(o.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'sentiment' && (
          <div dangerouslySetInnerHTML={{ __html: sentimentHtml }} />
        )}
      </div>
    </div>
  );
}
