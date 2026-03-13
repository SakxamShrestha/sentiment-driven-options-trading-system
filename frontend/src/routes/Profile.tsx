import { useAuthStore } from '../stores/useAuthStore';
import { loginWithGoogle, logout } from '../services/firebase';
import { useAccountStore } from '../stores/useAccountStore';
import { useThemeStore } from '../stores/useThemeStore';
import { fmt } from '../lib/formatters';
import { Spinner } from '../components/shared/Spinner';
import { STARTING_EQUITY } from '../lib/constants';

export default function Profile() {
  const { user, loading } = useAuthStore();
  const account = useAccountStore((s) => s.account);
  const positions = useAccountStore((s) => s.positions);
  const { theme, toggle: toggleTheme } = useThemeStore();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-[420px] mx-auto mt-16">
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <svg className="w-16 h-16 mx-auto text-accent mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <h2 className="text-xl font-bold mb-2">Welcome to TradeSent.AI</h2>
          <p className="text-muted text-sm mb-6">Sign in with your Google account to personalize your experience and save your preferences.</p>
          <button
            onClick={loginWithGoogle}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-border bg-card text-sm font-semibold hover:border-accent hover:bg-hover transition-all shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Dark Mode</div>
              <div className="text-[11px] text-muted">Switch between light and dark themes</div>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ backgroundColor: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-border)' }}
              aria-label="Toggle dark mode"
            >
              <span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center"
                style={{ transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }}
              >
                {theme === 'dark' ? (
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const equity = parseFloat(account?.equity ?? '0');
  const totalPl = equity - STARTING_EQUITY;

  return (
    <div className="max-w-[560px]">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-16 h-16 rounded-full border-2 border-accent" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
              {(user.displayName || user.email || '?')[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">{user.displayName || 'Trader'}</h2>
            <div className="text-sm text-muted truncate">{user.email}</div>
            <div className="text-[11px] text-muted mt-1">UID: {user.uid.slice(0, 12)}…</div>
          </div>
          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted hover:border-loss hover:text-loss transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Trading Stats */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Trading Overview</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-border rounded-xl p-3.5">
            <div className="text-[11px] text-muted mb-1">Portfolio Value</div>
            <div className="text-lg font-bold">{fmt(account?.equity)}</div>
          </div>
          <div className="border border-border rounded-xl p-3.5">
            <div className="text-[11px] text-muted mb-1">Buying Power</div>
            <div className="text-lg font-bold">{fmt(account?.buying_power)}</div>
          </div>
          <div className="border border-border rounded-xl p-3.5">
            <div className="text-[11px] text-muted mb-1">Total P&L</div>
            <div className={`text-lg font-bold ${totalPl >= 0 ? 'text-gain' : 'text-loss'}`}>
              {totalPl >= 0 ? '+' : ''}{fmt(totalPl)}
            </div>
          </div>
          <div className="border border-border rounded-xl p-3.5">
            <div className="text-[11px] text-muted mb-1">Open Positions</div>
            <div className="text-lg font-bold">{positions.length}</div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Appearance</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Dark Mode</div>
            <div className="text-[11px] text-muted">Switch between light and dark themes</div>
          </div>
          <button
            onClick={toggleTheme}
            className="relative w-12 h-7 rounded-full transition-colors duration-200 focus:outline-none"
            style={{ backgroundColor: theme === 'dark' ? 'var(--color-accent)' : 'var(--color-border)' }}
            aria-label="Toggle dark mode"
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center"
              style={{ transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }}
            >
              {theme === 'dark' ? (
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-4">Account Details</div>
        <div className="flex flex-col gap-3">
          {[
            ['Account Number', account?.account_number ?? '–'],
            ['Account Status', account?.status ?? '–'],
            ['Account Type', 'Paper Trading'],
            ['Starting Capital', fmt(STARTING_EQUITY)],
            ['Provider', 'Google (Firebase Auth)'],
          ].map(([label, val], i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
              <span className="text-sm text-muted">{label}</span>
              <span className="text-sm font-medium">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
