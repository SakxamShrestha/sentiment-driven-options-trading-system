import { useState } from 'react';
import { api } from '../../services/api';
import { useAccountStore } from '../../stores/useAccountStore';
import { useToastStore } from '../../stores/useToastStore';
import { fmt } from '../../lib/formatters';

interface Props {
  symbol: string;
  currentPrice: number | null;
  compact?: boolean;
}

export function OrderForm({ symbol, currentPrice, compact = false }: Props) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState(1);
  const [orderType, setOrderType] = useState('market');
  const [tif, setTif] = useState('day');
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const buyingPower = useAccountStore((s) => s.account?.buying_power);
  const { setAccount, setPositions } = useAccountStore();
  const toast = useToastStore((s) => s.show);

  const estCost = currentPrice && qty > 0 ? qty * currentPrice : null;

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

  const selectClass = 'w-full h-9 px-3 terminal-input text-sm focus:border-accent rounded-lg';
  const isBuy = side === 'buy';

  if (compact) {
    /* ── Review screen ── */
    if (reviewing) {
      return (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => setReviewing(false)} className="text-muted hover:text-text transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
              </svg>
            </button>
            <span className="text-sm font-semibold">Review order</span>
          </div>

          <div className="space-y-3 mb-5">
            {[
              ['Action', `${isBuy ? 'Buy' : 'Sell'} ${symbol}`],
              ['Quantity', `${qty} share${qty !== 1 ? 's' : ''}`],
              ['Order type', orderType.charAt(0).toUpperCase() + orderType.slice(1)],
              ['Time in force', tif.toUpperCase()],
              ['Est. cost', estCost ? fmt(estCost) : '$–'],
            ].map(([label, val]) => (
              <div key={label as string} className="flex items-center justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-semibold font-mono">{val}</span>
              </div>
            ))}
          </div>

          <div className="h-px bg-border mb-4" />

          <button
            disabled={submitting}
            onClick={submit}
            className={`w-full h-11 rounded-xl text-white text-sm font-bold transition-opacity disabled:opacity-40 ${
              isBuy ? 'bg-gain hover:opacity-90' : 'bg-loss hover:opacity-90'
            }`}
          >
            {submitting ? 'Submitting…' : `Confirm ${isBuy ? 'buy' : 'sell'}`}
          </button>
        </div>
      );
    }

    /* ── Order form ── */
    return (
      <div className="p-5">
        {/* Buy / Sell tabs */}
        <div className="flex border-b border-border mb-5">
          <button
            onClick={() => setSide('buy')}
            className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-all duration-150 ${
              isBuy ? 'text-gain border-gain' : 'text-muted border-transparent'
            }`}
          >
            Buy {symbol}
          </button>
          <button
            onClick={() => setSide('sell')}
            className={`flex-1 pb-2.5 text-sm font-semibold border-b-2 transition-all duration-150 ${
              !isBuy ? 'text-loss border-loss' : 'text-muted border-transparent'
            }`}
          >
            Sell {symbol}
          </button>
        </div>

        {/* Order type */}
        <div className="mb-3">
          <label className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1.5 block">Order type</label>
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={selectClass}>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </div>

        {/* Quantity */}
        <div className="mb-3">
          <label className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1.5 block">Shares</label>
          <div className="relative">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="w-full h-9 pl-3 pr-16 terminal-input text-sm focus:border-accent rounded-lg font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">shares</span>
          </div>
        </div>

        {/* TIF */}
        <div className="mb-4">
          <label className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1.5 block">Time in force</label>
          <select value={tif} onChange={(e) => setTif(e.target.value)} className={selectClass}>
            <option value="day">Day</option>
            <option value="gtc">Good till cancelled</option>
          </select>
        </div>

        {/* Summary row */}
        <div className="flex items-center justify-between text-xs text-muted mb-1">
          <span>Estimated cost</span>
          <span className="font-semibold font-mono text-text">{estCost ? fmt(estCost) : '$–'}</span>
        </div>

        {/* Review order button */}
        <button
          onClick={() => setReviewing(true)}
          disabled={qty < 1}
          className={`w-full h-11 mt-4 rounded-xl text-white text-sm font-bold transition-opacity disabled:opacity-40 ${
            isBuy ? 'bg-gain hover:opacity-90' : 'bg-loss hover:opacity-90'
          }`}
        >
          Review order
        </button>

        {/* Buying power */}
        <div className="flex items-center justify-between text-[11px] text-muted mt-3">
          <span>Buying power available</span>
          <span className="font-mono font-semibold text-text">{fmt(buyingPower)}</span>
        </div>
      </div>
    );
  }

  /* ── Non-compact (legacy) ── */
  return (
    <div className="p-4">
      <div className="flex border-b border-border mb-3">
        <button onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-all duration-200 ${side === 'buy' ? 'text-gain border-gain' : 'text-muted border-transparent'}`}>Buy</button>
        <button onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-all duration-200 ${side === 'sell' ? 'text-loss border-loss' : 'text-muted border-transparent'}`}>Sell</button>
      </div>
      <div className="mb-3">
        <label className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1 block">Quantity</label>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="w-full h-[34px] px-3 terminal-input text-sm focus:border-accent" />
      </div>
      <div className="mb-3">
        <label className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1 block">Order Type</label>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className="w-full h-[34px] px-3 terminal-input text-sm focus:border-accent"><option value="market">Market</option><option value="limit">Limit</option></select>
      </div>
      <div className="mb-3">
        <label className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1 block">Time in Force</label>
        <select value={tif} onChange={(e) => setTif(e.target.value)} className="w-full h-[34px] px-3 terminal-input text-sm focus:border-accent"><option value="day">DAY</option><option value="gtc">GTC</option></select>
      </div>
      <div className="flex justify-between text-xs text-muted mb-1"><span>Estimated Cost</span><span className="text-text font-semibold font-mono">{estCost ? fmt(estCost) : '$–'}</span></div>
      <div className="flex justify-between text-xs text-muted mb-3"><span>Buying Power</span><span className="text-text font-semibold font-mono">{fmt(buyingPower)}</span></div>
      <button disabled={submitting} onClick={submit} className={`w-full h-10 rounded-sm text-white text-sm font-bold font-mono disabled:opacity-40 hover:opacity-90 transition-opacity ${isBuy ? 'bg-gain' : 'bg-loss'}`}>
        {submitting ? 'Submitting…' : `${isBuy ? 'Buy' : 'Sell'} ${symbol}`}
      </button>
    </div>
  );
}
