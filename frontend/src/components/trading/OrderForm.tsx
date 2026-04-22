import { useState } from 'react';
import { api } from '../../services/api';
import { useAccountStore } from '../../stores/useAccountStore';
import { useToastStore } from '../../stores/useToastStore';
import { fmt } from '../../lib/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  symbol: string;
  currentPrice: number | null;
  compact?: boolean;
}

export function OrderForm({ symbol, currentPrice, compact = false }: Props) {
  const [side, setSide]           = useState<'buy' | 'sell'>('buy');
  const [qty, setQty]             = useState(1);
  const [orderType, setOrderType] = useState('market');
  const [tif, setTif]             = useState('day');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const buyingPower = useAccountStore((s) => s.account?.buying_power);
  const { setAccount, setPositions } = useAccountStore();
  const toast = useToastStore((s) => s.show);

  const estCost = currentPrice && qty > 0 ? qty * currentPrice : null;
  const isBuy = side === 'buy';
  const actionColor = isBuy ? 'var(--color-gain)' : 'var(--color-loss)';
  const actionBg    = isBuy ? 'var(--color-gain-soft)' : 'var(--color-loss-soft)';

  const submit = async () => {
    if (!symbol || qty < 1) return;
    setSubmitting(true);
    try {
      const d = await api.placeOrder({ symbol, qty, side, type: orderType, time_in_force: tif });
      toast(`${side.toUpperCase()} ${qty} ${symbol} submitted`, 'success');
      api.logTrade({ order_id: d.id, symbol, side, qty, price: d.filled_avg_price ? parseFloat(d.filled_avg_price) : null });
      setReviewing(false);
      setTimeout(async () => {
        try {
          const [a, p] = await Promise.all([api.getAccount(), api.getPositions()]);
          setAccount(a);
          setPositions(p);
        } catch { /* ignore */ }
      }, 1500);
    } catch (e: unknown) {
      toast(`Order failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
    setSubmitting(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 12px',
    border: '1px solid var(--color-border)',
    borderRadius: 8, background: 'var(--color-surface)',
    color: 'var(--color-text)', fontSize: 13,
    fontFamily: 'var(--font-mono)',
    outline: 'none', transition: 'border-color 0.12s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9, fontFamily: 'var(--font-mono)', fontWeight: 700,
    color: 'var(--color-muted)', textTransform: 'uppercase',
    letterSpacing: '0.14em', display: 'block', marginBottom: 6,
  };

  // ── Review screen ─────────────────────────────────────────────────────────
  if (compact && reviewing) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: 20 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setReviewing(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-muted)', display: 'flex', alignItems: 'center',
              padding: 0,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            Review order
          </span>
        </div>

        {/* Summary rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          {[
            ['Action',       `${isBuy ? 'Buy' : 'Sell'} ${symbol}`],
            ['Quantity',     `${qty} share${qty !== 1 ? 's' : ''}`],
            ['Order type',   orderType.charAt(0).toUpperCase() + orderType.slice(1)],
            ['Time in force', tif.toUpperCase()],
            ['Est. cost',    estCost ? fmt(estCost) : '$–'],
          ].map(([label, val]) => (
            <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{val}</span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'var(--color-border)', marginBottom: 16 }} />

        <button
          disabled={submitting}
          onClick={submit}
          style={{
            width: '100%', height: 44, borderRadius: 999,
            background: actionColor, color: '#fff',
            border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            opacity: submitting ? 0.5 : 1,
            transition: 'opacity 0.12s, transform 0.1s',
          }}
          onMouseEnter={(e) => !submitting && ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        >
          {submitting ? 'Submitting…' : `Confirm ${isBuy ? 'Buy' : 'Sell'}`}
        </button>
      </motion.div>
    );
  }

  // ── Compact order form ────────────────────────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        style={{ padding: 20 }}
      >
        {/* Buy / Sell pill toggle */}
        <div style={{
          display: 'flex', background: 'var(--color-surface)',
          borderRadius: 999, padding: 3, marginBottom: 20,
          border: '1px solid var(--color-border)',
        }}>
          {(['buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                flex: 1, padding: '8px 0',
                borderRadius: 999, border: 'none',
                fontSize: 12, fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: side === s
                  ? s === 'buy' ? 'var(--color-gain)' : 'var(--color-loss)'
                  : 'transparent',
                color: side === s ? '#fff' : 'var(--color-muted)',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Order type */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Order type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            style={inputStyle}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>

        {/* Quantity stepper */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Shares</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-hover)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)')}
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              style={{ ...inputStyle, textAlign: 'center', flex: 1 }}
            />
            <button
              onClick={() => setQty(q => q + 1)}
              style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-hover)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface)')}
            >
              +
            </button>
          </div>
        </div>

        {/* TIF */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Time in force</label>
          <select
            value={tif}
            onChange={(e) => setTif(e.target.value)}
            style={inputStyle}
          >
            <option value="day">Day</option>
            <option value="gtc">Good till cancelled</option>
          </select>
        </div>

        {/* Estimated cost row */}
        <AnimatePresence>
          {estCost && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 8,
                background: actionBg, marginBottom: 14,
              }}
            >
              <span style={{ fontSize: 11, color: actionColor, fontFamily: 'var(--font-mono)' }}>
                Est. {isBuy ? 'cost' : 'proceeds'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)', color: actionColor }}>
                {fmt(estCost)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review order CTA */}
        <button
          onClick={() => setReviewing(true)}
          disabled={qty < 1}
          style={{
            width: '100%', height: 44, borderRadius: 999,
            background: actionColor, color: '#fff',
            border: 'none', cursor: qty >= 1 ? 'pointer' : 'not-allowed',
            fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            opacity: qty < 1 ? 0.4 : 1,
            transition: 'opacity 0.12s, transform 0.1s',
          }}
          onMouseEnter={(e) => qty >= 1 && ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.01)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
        >
          Review order
        </button>

        {/* Buying power */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)',
        }}>
          <span>Buying power</span>
          <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{fmt(buyingPower)}</span>
        </div>
      </motion.div>
    );
  }

  // ── Non-compact (legacy/fallback) ─────────────────────────────────────────
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 12 }}>
        {(['buy', 'sell'] as const).map((s) => (
          <button key={s} onClick={() => setSide(s)} style={{
            flex: 1, padding: '8px 0', background: 'none', border: 'none',
            borderBottom: `2px solid ${side === s ? (s === 'buy' ? 'var(--color-gain)' : 'var(--color-loss)') : 'transparent'}`,
            color: side === s ? 'var(--color-text)' : 'var(--color-muted)',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.06em',
          }}>
            {s}
          </button>
        ))}
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Quantity</label>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} style={inputStyle} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>Order Type</label>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)} style={inputStyle}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
        </select>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted)', marginBottom: 4 }}>
        <span>Est. Cost</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text)' }}>{estCost ? fmt(estCost) : '$–'}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-muted)', marginBottom: 12 }}>
        <span>Buying Power</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text)' }}>{fmt(buyingPower)}</span>
      </div>
      <button disabled={submitting} onClick={submit} style={{
        width: '100%', height: 40, borderRadius: 999, border: 'none',
        background: isBuy ? 'var(--color-gain)' : 'var(--color-loss)',
        color: '#fff', fontSize: 12, fontWeight: 800, fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
        opacity: submitting ? 0.5 : 1,
      }}>
        {submitting ? 'Submitting…' : `${isBuy ? 'Buy' : 'Sell'} ${symbol}`}
      </button>
    </div>
  );
}
