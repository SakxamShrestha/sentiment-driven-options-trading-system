import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Spinner } from '../shared/Spinner';
import { NotificationDropdown } from '../shared/NotificationDropdown';
import { api } from '../../services/api';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap ${
    isActive
      ? 'bg-active-bg text-text'
      : 'text-muted hover:bg-hover hover:text-text'
  }`;

export function Navbar() {
  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAccountRoute = ['/positions', '/orders', '/activities', '/balances'].some((p) =>
    location.pathname.startsWith(p)
  );

  // Search
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{ symbol: string; price: number | null; change_pct: number | null } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLDivElement>(null);

  const doSearch = async (val: string) => {
    setSearchLoading(true);
    try {
      const d = await api.getSnapshot(val);
      if (d.price) {
        setSearchResult({ symbol: d.symbol, price: d.price, change_pct: d.change_pct });
        setSearchOpen(true);
      } else {
        setSearchResult(null);
        setSearchOpen(true);
      }
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
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <header className="h-[56px] bg-card border-b border-border flex items-center px-6 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center mr-6 shrink-0">
        <motion.svg
          whileHover={{ scale: 1.12, rotate: 8 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className="w-7 h-7 text-accent"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" />
          <path d="M15 6h1v4" />
          <path d="m6.134 14.768.866-.5 2 3.464" />
          <circle cx="16" cy="8" r="6" />
        </motion.svg>
      </Link>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-[540px] relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none w-4 h-4"
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          className="w-full h-10 pl-12 pr-3 border border-border rounded-full bg-bg text-sm outline-none focus:border-accent transition-colors"
          placeholder="Search"
          value={query}
          onChange={(e) => onSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = query.trim().toUpperCase();
              if (val) openStock(val);
            }
            if (e.key === 'Escape') setSearchOpen(false);
          }}
        />
        {searchOpen && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-card border border-border rounded-xl shadow-lg z-[200] overflow-hidden">
            {searchLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-muted text-sm">
                <Spinner /> Looking up {query.toUpperCase()}…
              </div>
            ) : searchResult ? (
              <>
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-hover transition-colors"
                  onClick={() => openStock(searchResult.symbol)}
                >
                  <div>
                    <span className="font-bold text-sm mr-2.5">{searchResult.symbol}</span>
                    {searchResult.change_pct !== null && (
                      <span className={`text-xs ${searchResult.change_pct >= 0 ? 'text-gain' : 'text-loss'}`}>
                        {searchResult.change_pct >= 0 ? '+' : ''}{searchResult.change_pct.toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-sm">
                    {searchResult.price ? `$${searchResult.price.toFixed(2)}` : '–'}
                  </span>
                </div>
                <div className="px-4 py-2 border-t border-border">
                  <span className="text-xs text-muted cursor-pointer hover:text-accent transition-colors"
                    onClick={() => openStock(searchResult.symbol)}>
                    Press Enter or click to open ↗
                  </span>
                </div>
              </>
            ) : (
              <div className="px-4 py-3 text-sm text-muted">
                No data found for "{query.toUpperCase()}"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1 min-w-[40px]" />

      {/* Nav Links (right side) */}
      <nav className="flex items-center gap-1 ml-4">
        <NavLink to="/" className={navClass} end>Home</NavLink>

        {/* Account dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className={`flex items-center gap-1 px-4 py-2 text-[13px] font-medium rounded-lg transition-colors whitespace-nowrap ${
              isAccountRoute || accountOpen
                ? 'bg-active-bg text-text'
                : 'text-muted hover:bg-hover hover:text-text'
            }`}
          >
            Account
            <svg
              className={`w-3 h-3 transition-transform ${accountOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {accountOpen && (
            <div className="absolute top-[calc(100%+4px)] right-0 bg-card border border-border rounded-xl shadow-lg z-[300] min-w-[150px] py-1 overflow-hidden">
              {[
                { to: '/positions', label: 'Positions' },
                { to: '/orders', label: 'Orders' },
                { to: '/activities', label: 'Activities' },
                { to: '/balances', label: 'Balances' },
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setAccountOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 text-[13px] font-medium transition-colors ${
                      isActive ? 'text-text bg-active-bg' : 'text-muted hover:bg-hover hover:text-text'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        <NavLink to="/sentiment" className={navClass}>Sentiment</NavLink>
        <NavLink to="/backtest" className={navClass}>Backtest</NavLink>
        <NavLink to="/learn" className={navClass}>Learn</NavLink>
        <NotificationDropdown />
        <NavLink to="/profile" className={navClass}>Profile</NavLink>
      </nav>
    </header>
  );
}
