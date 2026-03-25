import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../shared/Spinner';
import { api } from '../../services/api';

export function TopSearchBar() {
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{
    symbol: string; price: number | null; change_pct: number | null;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const doSearch = async (val: string) => {
    setSearchLoading(true);
    try {
      const d = await api.getSnapshot(val);
      setSearchResult(d.price ? { symbol: d.symbol, price: d.price, change_pct: d.change_pct } : null);
      setSearchOpen(true);
    } catch {
      setSearchResult(null);
      setSearchOpen(true);
    }
    setSearchLoading(false);
  };

  const onSearchInput = (val: string) => {
    setQuery(val);
    clearTimeout(searchTimer.current);
    const upper = val.trim().toUpperCase();
    if (upper.length < 2) { setSearchOpen(false); return; }
    setSearchLoading(true);
    setSearchOpen(true);
    searchTimer.current = setTimeout(() => doSearch(upper), 400);
  };

  const openStock = (sym: string) => {
    setSearchOpen(false);
    setQuery('');
    navigate(`/stock/${sym}`);
  };

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  return (
    <div className="flex items-center h-11 px-4 border-b border-border bg-card shrink-0">
      <div ref={searchRef} className="relative w-72">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          className="terminal-input w-full h-8 pl-10 pr-7 text-xs uppercase tracking-widest"
          placeholder=""
          value={query}
          onChange={(e) => onSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { const v = query.trim().toUpperCase(); if (v) openStock(v); }
            if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); inputRef.current?.blur(); }
          }}
          spellCheck={false}
          autoComplete="off"
        />
        {query && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setQuery(''); setSearchOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted hover:text-text"
            aria-label="Clear search"
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {searchOpen && (
          <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border rounded-sm shadow-2xl z-[200] overflow-hidden">
            {searchLoading ? (
              <div className="flex items-center gap-3 px-4 py-4 text-muted text-sm">
                <Spinner />
                <span className="font-mono text-xs">Looking up <span className="font-semibold text-text">{query.toUpperCase()}</span>…</span>
              </div>
            ) : searchResult ? (
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-hover transition-colors text-left group"
                onClick={() => openStock(searchResult.symbol)}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm font-mono">{searchResult.symbol}</span>
                  {searchResult.change_pct !== null && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded-sm font-semibold ${
                      searchResult.change_pct >= 0 ? 'text-gain bg-gain-soft' : 'text-loss bg-loss-soft'
                    }`}>
                      {searchResult.change_pct >= 0 ? '+' : ''}{searchResult.change_pct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <span className="font-mono text-sm font-bold">
                  {searchResult.price ? `$${searchResult.price.toFixed(2)}` : '–'}
                </span>
              </button>
            ) : (
              <div className="px-4 py-4 text-sm text-muted font-mono text-center">
                No results for "{query.toUpperCase()}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
