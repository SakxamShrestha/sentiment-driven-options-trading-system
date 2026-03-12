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
  const [submitting, setSubmitting] = useState(false);
  const buyingPower = useAccountStore((s) => s.account?.buying_power);
  const toast = useToastStore((s) => s.show);

  const estCost = currentPrice && qty > 0 ? qty * currentPrice : null;

  const submit = async (orderSide: 'buy' | 'sell') => {
    if (!symbol || qty < 1) return;
    setSubmitting(true);
    try {
      const d = await api.placeOrder({ symbol, qty, side: orderSide, type: orderType, time_in_force: tif });
      toast(`${orderSide.toUpperCase()} ${qty} ${symbol} submitted`, 'success');
      api.logTrade({ order_id: d.id, symbol, side: orderSide, qty, price: d.filled_avg_price ? parseFloat(d.filled_avg_price) : null });
    } catch (e: unknown) {
      toast(`Order failed: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error');
    }
    setSubmitting(false);
  };

  const inputClass = 'w-full h-[34px] px-2.5 border border-border rounded-lg bg-bg text-sm outline-none focus:border-accent';

  if (compact) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex border-b border-border mb-3">
          <button onClick={() => setSide('buy')}
            className={`flex-1 py-1.5 text-center text-sm font-semibold border-b-2 transition-colors ${side === 'buy' ? 'text-gain border-gain' : 'text-muted border-transparent'}`}>Buy</button>
          <button onClick={() => setSide('sell')}
            className={`flex-1 py-1.5 text-center text-sm font-semibold border-b-2 transition-colors ${side === 'sell' ? 'text-loss border-loss' : 'text-muted border-transparent'}`}>Sell</button>
        </div>
        <div className="grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Qty</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Type</label>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={inputClass}><option value="market">Market</option><option value="limit">Limit</option></select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">TIF</label>
            <select value={tif} onChange={(e) => setTif(e.target.value)} className={inputClass}><option value="day">DAY</option><option value="gtc">GTC</option></select>
          </div>
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted"><span>Est. Cost</span><span className="text-text font-semibold">{estCost ? fmt(estCost) : '$–'}</span></div>
        <div className="flex justify-between text-xs text-muted mb-3"><span>Buying Power</span><span className="text-text font-semibold">{fmt(buyingPower)}</span></div>
        <div className="flex gap-2">
          <button disabled={submitting} onClick={() => submit('buy')} className="flex-1 h-9 rounded-lg bg-gain text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">Buy</button>
          <button disabled={submitting} onClick={() => submit('sell')} className="flex-1 h-9 rounded-lg bg-loss text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">Sell</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex border-b border-border mb-3">
        <button onClick={() => setSide('buy')}
          className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${side === 'buy' ? 'text-gain border-gain' : 'text-muted border-transparent'}`}>Buy</button>
        <button onClick={() => setSide('sell')}
          className={`flex-1 py-2 text-center text-sm font-semibold border-b-2 transition-colors ${side === 'sell' ? 'text-loss border-loss' : 'text-muted border-transparent'}`}>Sell</button>
      </div>
      <div className="mb-3">
        <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Quantity</label>
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className={inputClass} />
      </div>
      <div className="mb-3">
        <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Order Type</label>
        <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={inputClass}><option value="market">Market</option><option value="limit">Limit</option></select>
      </div>
      <div className="mb-3">
        <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Time in Force</label>
        <select value={tif} onChange={(e) => setTif(e.target.value)} className={inputClass}><option value="day">DAY</option><option value="gtc">GTC</option></select>
      </div>
      <div className="flex justify-between text-xs text-muted mb-1"><span>Estimated Cost</span><span className="text-text font-semibold">{estCost ? fmt(estCost) : '$–'}</span></div>
      <div className="flex justify-between text-xs text-muted mb-3"><span>Buying Power</span><span className="text-text font-semibold">{fmt(buyingPower)}</span></div>
      <div className="flex gap-2">
        <button disabled={submitting} onClick={() => submit('buy')} className="flex-1 h-9 rounded-lg bg-gain text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">Buy</button>
        <button disabled={submitting} onClick={() => submit('sell')} className="flex-1 h-9 rounded-lg bg-loss text-white text-sm font-bold disabled:opacity-40 hover:opacity-90 transition-opacity">Sell</button>
      </div>
    </div>
  );
}
