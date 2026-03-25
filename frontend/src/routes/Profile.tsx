import { useAuthStore } from '../stores/useAuthStore';
import { loginWithGoogle, logout } from '../services/firebase';
import { useAccountStore } from '../stores/useAccountStore';
import { useThemeStore } from '../stores/useThemeStore';
import { fmt } from '../lib/formatters';
import { Spinner } from '../components/shared/Spinner';
import { STARTING_EQUITY } from '../lib/constants';
import { motion } from 'framer-motion';

export default function Profile() {
  const { user, loading } = useAuthStore();
  const account = useAccountStore((s) => s.account);
  const positions = useAccountStore((s) => s.positions);
  const { theme, toggle: toggleTheme } = useThemeStore();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
        <div className="w-full max-w-[380px] flex flex-col gap-3">
          <div className="terminal-card p-8 text-center">
            <div className="w-14 h-14 rounded-sm bg-accent/15 flex items-center justify-center mx-auto mb-5">
              <svg className="w-6 h-6 text-accent" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold mb-2">Sign in to continue</h2>
            <p className="text-muted text-sm mb-6">
              Access your trading dashboard and saved preferences.
            </p>
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-sm border border-border bg-card text-sm font-medium hover:border-accent transition-colors duration-150"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="terminal-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Dark mode</div>
                <div className="text-xs text-muted mt-0.5">Switch between themes</div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                  theme === 'dark' ? 'bg-accent' : 'bg-border'
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const equity = parseFloat(account?.equity ?? '0');
  const totalPl = equity - STARTING_EQUITY;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full self-stretch flex flex-col gap-4"
    >
      {/* Hero — user info banner */}
      <div className="terminal-card p-6 flex items-center gap-5">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" className="w-16 h-16 rounded-sm ring-1 ring-border shrink-0" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-16 h-16 rounded-sm flex items-center justify-center text-bg text-2xl font-bold shrink-0"
            style={{ background: 'var(--color-accent)' }}>
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold font-mono truncate">{user.displayName || 'Trader'}</h1>
          <div className="text-sm text-muted truncate">{user.email}</div>
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-mono text-accent bg-accent/10 rounded-sm px-2.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
            Paper Trading Active
          </div>
        </div>
        <button
          onClick={logout}
          className="shrink-0 px-4 py-2 rounded-sm border border-border text-sm text-muted hover:text-loss hover:border-loss hover:bg-loss-soft transition-colors duration-150"
        >
          Sign out
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Portfolio', value: fmt(account?.equity), cls: '' },
          { label: 'Buying Power', value: fmt(account?.buying_power), cls: '' },
          { label: 'Total P&L', value: fmt(totalPl), cls: totalPl >= 0 ? 'text-gain' : 'text-loss' },
          { label: 'Positions', value: String(positions.length), cls: '' },
        ].map(({ label, value, cls }, i) => (
          <div key={i} className="terminal-card p-5 flex flex-col gap-1">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">{label}</div>
            <div className={`text-2xl font-bold font-mono ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid — account details + appearance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Account details */}
        <div className="terminal-card p-5">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">Account</div>
          <div className="flex flex-col gap-2.5">
            {[
              ['Account #', account?.account_number ?? '–'],
              ['Status', account?.status ?? '–'],
              ['Type', 'Paper Trading'],
              ['Starting Capital', fmt(STARTING_EQUITY)],
              ['Auth Provider', 'Firebase'],
            ].map(([label, val], i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted">{label}</span>
                <span className="text-sm font-mono font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div className="terminal-card p-5">
          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-4">Appearance</div>
          <div className="flex items-center justify-between p-4 border border-border rounded-sm hover:border-accent transition-colors duration-150">
            <div>
              <div className="text-sm font-semibold">Dark mode</div>
              <div className="text-xs text-muted mt-0.5">Switch between light and dark</div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                theme === 'dark' ? 'bg-accent' : 'bg-border'
              }`}
              aria-label="Toggle dark mode"
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
                style={{ transform: theme === 'dark' ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
