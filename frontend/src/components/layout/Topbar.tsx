import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Spinner } from '../shared/Spinner';

export function Topbar() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ symbol: string; price: number | null; change_pct: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const doSearch = useCallback(async (val: string) => {
    setLoading(true);
    try {
      const d = await api.getSnapshot(val);
      if (d.price) {
        setResult({ symbol: d.symbol, price: d.price, change_pct: d.change_pct });
        setOpen(true);
      } else {
        setResult(null);
        setOpen(true);
      }
    } catch {
      setResult(null);
      setOpen(true);
    }
    setLoading(false);
  }, []);

  const onInput = (val: string) => {
    setQuery(val);
    clearTimeout(timer.current);
    const upper = val.trim().toUpperCase();
    if (upper.length < 2) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setOpen(true);
    timer.current = setTimeout(() => doSearch(upper), 400);
  };

  const openStock = (sym: string) => {
    setOpen(false);
    setQuery('');
    navigate(`/stock/${sym}`);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="h-[52px] bg-card border-b border-border flex items-center px-5 gap-3 shrink-0">
      <div ref={wrapRef} className="flex-1 max-w-[520px] relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none w-3.5 h-3.5"
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="w-full h-9 pl-8 pr-3 border border-border rounded-lg bg-bg text-sm outline-none focus:border-accent transition-colors"
          placeholder="Search by symbol (e.g. TSLA, AAPL)…"
          value={query}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = query.trim().toUpperCase();
              if (val) openStock(val);
            }
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        {open && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-[200] overflow-hidden">
            {loading ? (
              <div className="flex items-center gap-2 px-3.5 py-3 text-muted text-sm">
                <Spinner /> Looking up {query.toUpperCase()}…
              </div>
            ) : result ? (
              <>
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 cursor-pointer hover:bg-hover transition-colors"
                  onClick={() => openStock(result.symbol)}
                >
                  <div>
                    <span className="font-bold text-sm mr-2.5">{result.symbol}</span>
                    {result.change_pct !== null && (
                      <span className={`text-xs ${result.change_pct >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {result.change_pct >= 0 ? '+' : ''}{result.change_pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-sm">
                    {result.price ? `$${result.price.toFixed(2)}` : '–'}
                  </span>
                </div>
                <div className="px-3.5 py-2 border-t border-border">
                  <span
                    className="text-xs text-muted cursor-pointer hover:text-accent transition-colors"
                    onClick={() => openStock(result.symbol)}
                  >
                    Press Enter or click to open stock detail ↗
                  </span>
                </div>
              </>
            ) : (
              <div className="px-3.5 py-3 text-sm text-muted">
                No data found for "{query.toUpperCase()}" (check symbol or market hours)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
