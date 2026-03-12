import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAccountStore } from '../../stores/useAccountStore';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium border-l-3 transition-colors ${
    isActive
      ? 'bg-active-bg border-active-border text-text'
      : 'border-transparent text-muted hover:bg-hover hover:text-text'
  }`;

export function Sidebar() {
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const acctNumber = useAccountStore((s) => s.account?.account_number);

  const isAccountRoute = ['/positions', '/orders', '/activities', '/balances'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <aside className="w-[200px] bg-card border-r border-border flex flex-col shrink-0 h-screen overflow-y-auto">
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
        <img
          src="/static/images/FInal_Logo.png"
          alt="TradeSent.AI"
          className="w-8 h-8 rounded-lg object-contain shrink-0"
        />
        <div className="min-w-0">
          <div className="text-[13px] font-semibold truncate">Paper Trading</div>
          <div className="text-[10px] text-muted truncate mt-px">{acctNumber ?? 'Loading…'}</div>
        </div>
      </div>

      <nav className="py-2.5 flex-1">
        <NavLink to="/" className={navLinkClass} end>
          <HomeIcon /> Home
        </NavLink>

        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className={`flex items-center gap-2.5 px-4 py-2 text-[13px] font-medium border-l-3 w-full transition-colors ${
            isAccountRoute
              ? 'bg-active-bg border-active-border text-text'
              : 'border-transparent text-muted hover:bg-hover hover:text-text'
          }`}
        >
          <UserIcon /> Account
          <svg
            className={`ml-auto w-3 h-3 transition-transform ${accountOpen ? 'rotate-90' : ''}`}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        {accountOpen && (
          <div>
            {[
              { to: '/positions', label: 'Positions' },
              { to: '/orders', label: 'Orders' },
              { to: '/activities', label: 'Activities' },
              { to: '/balances', label: 'Balances' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 pl-9 pr-4 py-1.5 text-xs font-medium border-l-3 transition-colors ${
                    isActive
                      ? 'text-text border-active-border bg-active-bg'
                      : 'border-transparent text-muted hover:bg-hover hover:text-text'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}

        <NavLink to="/sentiment" className={navLinkClass}>
          <SentimentIcon /> Sentiment
        </NavLink>
        <NavLink to="/backtest" className={navLinkClass}>
          <BacktestIcon /> Backtest
        </NavLink>
        <NavLink to="/learn" className={navLinkClass}>
          <LearnIcon /> Learn
        </NavLink>
      </nav>

      <div className="px-4 py-3.5 border-t border-border text-[11px] text-muted">
        TradeSent.AI v2.0
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 12L12 3l9 9" /><path d="M9 21V12h6v9" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function SentimentIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function BacktestIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function LearnIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}
