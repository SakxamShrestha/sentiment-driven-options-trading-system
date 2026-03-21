import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Spinner } from '../shared/Spinner';
import { NotificationDropdown } from '../shared/NotificationDropdown';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

// ─── Icons ────────────────────────────────────────────────────────────────────
const NavIcon = {
  home: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  sentiment: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  backtest: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  learn: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  bell: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  positions: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  ),
  orders: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  activities: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  balances: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
};

const NAV_SECTIONS = [
  {
    items: [{ to: '/', label: 'Home', icon: NavIcon.home, end: true }],
  },
  {
    label: 'Account',
    items: [
      { to: '/positions', label: 'Positions', icon: NavIcon.positions },
      { to: '/orders', label: 'Orders', icon: NavIcon.orders },
      { to: '/activities', label: 'Activities', icon: NavIcon.activities },
      { to: '/balances', label: 'Balances', icon: NavIcon.balances },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/sentiment', label: 'Sentiment', icon: NavIcon.sentiment },
      { to: '/backtest', label: 'Backtest', icon: NavIcon.backtest },
      { to: '/learn', label: 'Learn', icon: NavIcon.learn },
    ],
  },
  {
    items: [{ to: '/notifications', label: 'Notifications', icon: NavIcon.bell }],
  },
];

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { user } = useAuthStore();
  const initials = user?.displayName
    ? user.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '?';
  const cls = size === 'md' ? 'w-8 h-8 text-[11px]' : 'w-6 h-6 text-[9px]';
  if (user?.photoURL) {
    return (
      <img src={user.photoURL} referrerPolicy="no-referrer"
        className={`${cls} rounded-full object-cover shrink-0`} alt="avatar" />
    );
  }
  return (
    <div className={`${cls} rounded-full flex items-center justify-center text-white font-bold shrink-0`} style={{ background: 'linear-gradient(135deg, #2755e8, #3861fb)' }}>
      {initials}
    </div>
  );
}

const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
    isActive ? 'bg-active-bg text-accent font-semibold' : 'text-muted hover:text-text hover:bg-hover'
  }`;

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{
    symbol: string; price: number | null; change_pct: number | null;
  } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

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
    setDrawerOpen(false);
    navigate(`/stock/${sym}`);
  };

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  // ⌘K / Ctrl+K focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const SearchDropdown = searchOpen && (
    <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-card border border-border rounded-lg shadow-2xl z-[200] overflow-hidden">
      {searchLoading ? (
        <div className="flex items-center gap-3 px-4 py-4 text-muted text-sm">
          <Spinner />
          <span>Looking up <span className="font-mono font-semibold text-text">{query.toUpperCase()}</span>…</span>
        </div>
      ) : searchResult ? (
        <button
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-hover transition-colors text-left group"
          onClick={() => openStock(searchResult.symbol)}
        >
          <div className="flex items-center gap-3">
            {/* Ticker icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,rgba(56,97,251,0.15),rgba(107,138,253,0.08))' }}>
              <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              </svg>
            </div>
            <div>
              <span className="font-semibold text-sm font-mono block leading-tight">{searchResult.symbol}</span>
              <span className="text-[11px] text-muted">View chart &amp; trade</span>
            </div>
            {searchResult.change_pct !== null && (
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded-lg font-semibold ${
                searchResult.change_pct >= 0 ? 'text-gain bg-gain-soft' : 'text-loss bg-loss-soft'
              }`}>
                {searchResult.change_pct >= 0 ? '+' : ''}{searchResult.change_pct.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold">
              {searchResult.price ? `$${searchResult.price.toFixed(2)}` : '–'}
            </span>
            <svg className="w-4 h-4 text-muted group-hover:text-text transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </button>
      ) : (
        <div className="px-4 py-4 text-sm text-muted text-center">
          No results for <span className="font-mono font-semibold text-text">"{query.toUpperCase()}"</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── Topbar ──────────────────────────────────────────────────────────── */}
      <header className="h-14 glass border-b border-border/50 flex items-center px-4 md:px-6 shrink-0 sticky top-0 z-50">

        {/* Logo — left */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-shadow" style={{ background: 'linear-gradient(135deg, #2755e8, #3861fb)', boxShadow: '0 2px 8px rgba(56,97,251,0.30)' }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight hidden sm:inline font-mono">
            TradeSent<span className="text-accent">.AI</span>
          </span>
        </Link>

        {/* Search — flex-1 center column (home only) */}
        <div className={`hidden sm:flex flex-1 justify-center px-6 ${!isHome ? 'invisible pointer-events-none' : ''}`}>
          <div ref={searchRef} className="relative w-full max-w-[480px]">
            {/* Search icon — transitions to accent when focused */}
            <svg
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200 ${
                searchFocused ? 'text-accent' : 'text-muted'
              }`}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>

            <input
              ref={inputRef}
              className="w-full h-10 pl-12 pr-24 rounded-xl text-sm text-text outline-none transition-all duration-200 placeholder:text-muted/70
                         bg-hover/50 border border-border/60
                         focus:bg-card focus:border-accent/50 focus:ring-2 focus:ring-accent/10"
              placeholder="Search ticker…"
              value={query}
              onChange={(e) => onSearchInput(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { const v = query.trim().toUpperCase(); if (v) openStock(v); }
                if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); inputRef.current?.blur(); }
              }}
            />

            {/* ⌘K badge — hides when typing */}
            {!query && !searchFocused && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
                <kbd className="h-5 min-w-[20px] px-1 text-[10px] font-mono text-muted/50 bg-border/30 border border-border/50 rounded flex items-center justify-center">⌘</kbd>
                <kbd className="h-5 min-w-[20px] px-1 text-[10px] font-mono text-muted/50 bg-border/30 border border-border/50 rounded flex items-center justify-center">K</kbd>
              </div>
            )}

            {/* Clear button — shows when query is present */}
            {query && (
              <button
                onMouseDown={(e) => { e.preventDefault(); setQuery(''); setSearchOpen(false); inputRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-border/60 hover:bg-border flex items-center justify-center transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-2.5 h-2.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {SearchDropdown}
          </div>
        </div>

        {/* Right cluster — bell, profile, hamburger */}
        <div className="ml-auto sm:ml-0 flex items-center gap-1">
          <div className="hidden sm:block">
            <NotificationDropdown />
          </div>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `hidden sm:flex p-1 rounded-full transition-all duration-200 ${
                isActive ? 'ring-2 ring-accent ring-offset-2' : 'hover:ring-2 hover:ring-border hover:ring-offset-1'
              }`
            }
          >
            <Avatar size="md" />
          </NavLink>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="p-2 rounded-lg text-muted hover:text-text hover:bg-hover transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Right-side drawer ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[598] bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Panel — slides in from the RIGHT */}
            <motion.aside
              key="drawer"
              initial={{ x: 288 }}
              animate={{ x: 0 }}
              exit={{ x: 288 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="fixed top-0 right-0 h-full w-72 z-[599] flex flex-col bg-card border-l border-border shadow-2xl"
            >
              {/* Drawer header */}
              <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
                {/* Close button on the left (nearest to content) */}
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close navigation"
                  className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-hover transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                {/* Brand — right side of drawer header */}
                <Link to="/" className="flex items-center gap-2 group" onClick={() => setDrawerOpen(false)}>
                  <span className="text-sm font-bold tracking-tight font-mono">
                    TradeSent<span className="text-accent">.AI</span>
                  </span>
                  <div className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg, #2755e8, #3861fb)' }}>
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                    </svg>
                  </div>
                </Link>
              </div>

              {/* Mobile-only search (sm+ uses header search) — home only */}
              <div className={`sm:hidden px-3 pt-3 ${!isHome ? 'hidden' : ''}`}>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
                    fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                  >
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    className="w-full h-10 pl-10 pr-4 border border-border rounded-xl bg-bg/60 text-sm text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-muted"
                    placeholder="Search symbol…"
                    value={query}
                    onChange={(e) => onSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { const v = query.trim().toUpperCase(); if (v) openStock(v); }
                    }}
                  />
                  {searchOpen && (
                    <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-[200] overflow-hidden">
                      {searchLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-muted text-sm"><Spinner /> Looking up…</div>
                      ) : searchResult ? (
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-hover transition-colors text-left"
                          onClick={() => openStock(searchResult.symbol)}
                        >
                          <span className="font-semibold text-sm font-mono">{searchResult.symbol}</span>
                          <span className="font-mono text-sm">{searchResult.price ? `$${searchResult.price.toFixed(2)}` : '–'}</span>
                        </button>
                      ) : (
                        <div className="px-4 py-3 text-sm text-muted">No data for "{query.toUpperCase()}"</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-5">
                {NAV_SECTIONS.map((section, i) => (
                  <div key={i}>
                    {section.label && (
                      <p className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted">
                        {section.label}
                      </p>
                    )}
                    <div className="flex flex-col gap-0.5">
                      {section.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={'end' in item ? item.end : undefined}
                          className={drawerLinkClass}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                          {item.to === '/notifications' && unreadCount > 0 && (
                            <span className="ml-auto min-w-[18px] h-[18px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>

              {/* Profile footer */}
              <div className="px-3 py-3 border-t border-border shrink-0">
                <NavLink to="/profile" className={drawerLinkClass}>
                  <Avatar size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">
                      {user?.displayName ?? user?.email ?? 'Profile'}
                    </p>
                    {user?.email && user?.displayName && (
                      <p className="text-[11px] text-muted truncate">{user.email}</p>
                    )}
                  </div>
                </NavLink>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
