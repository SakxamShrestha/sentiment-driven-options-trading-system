import { useState } from 'react';
import { OrderForm } from '../trading/OrderForm';

export function RightPanel() {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState<number | null>(null);

  const onKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const sym = (e.target as HTMLInputElement).value.trim().toUpperCase();
    if (!sym) return;
    setSymbol(sym);
    try {
      const r = await fetch(`/api/alpaca/quote/${sym}`);
      const d = await r.json();
      setPrice(d.ask || d.bid || null);
    } catch { setPrice(null); }
  };

  return (
    <div className="w-[280px] shrink-0 bg-card border-l border-border flex flex-col overflow-y-auto">
      <div className="p-4 pb-0">
        <div className="relative mb-3">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none w-3 h-3"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="w-full h-[34px] pl-8 pr-2.5 border border-border rounded-lg bg-bg text-xs outline-none focus:border-accent"
            placeholder="Search by symbol…"
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
      <OrderForm symbol={symbol} currentPrice={price} />
    </div>
  );
}
