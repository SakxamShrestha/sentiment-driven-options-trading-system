import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../services/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { Spinner } from '../components/shared/Spinner';
import { motion } from 'framer-motion';

const TERMINAL_LINES = [
  { text: 'TradeSent.AI v1.0 — Paper Trading Terminal', type: 'header' },
  { text: '─────────────────────────────────────────', type: 'divider' },
  { text: '> system: connecting to Alpaca Markets...', type: 'cmd', status: '[OK]' },
  { text: '> system: FinBERT model loaded             ', type: 'cmd', status: '[OK]' },
  { text: '> system: Redis cache initialized          ', type: 'cmd', status: '[OK]' },
  { text: '> stream: Alpaca news feed active         ', type: 'cmd', status: '[OK]' },
  { text: '> portfolio: $100,000 virtual USD loaded   ', type: 'cmd', status: '[OK]' },
  { text: '', type: 'blank' },
  { text: '> signal: AAPL sentiment +0.382', type: 'signal', label: 'BULLISH' },
  { text: '> signal: TSLA sentiment -0.214', type: 'signal', label: 'BEARISH' },
  { text: '> signal: NVDA sentiment +0.561', type: 'signal', label: 'BULLISH' },
  { text: '> signal: MSFT sentiment +0.147', type: 'signal', label: 'NEUTRAL' },
  { text: '', type: 'blank' },
  { text: '> awaiting authentication...', type: 'await' },
];

export default function Landing() {
  const { user, loading } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
    } catch (err: any) {
      const msg: Record<string, string> = {
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'An account already exists with this email.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Please enter a valid email address.',
      };
      setError(msg[err.code] ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign-in failed. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-bg">

      {/* ── Left panel — terminal output ─────────────────────────────── */}
      <div className="hidden lg:flex flex-col flex-1 bg-card border-r border-border p-10 overflow-hidden">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-7 h-7 rounded-sm flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <svg className="w-3.5 h-3.5" style={{ color: '#09090b' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight font-mono">TradeSent<span className="text-accent">.AI</span></span>
        </div>

        {/* Terminal window */}
        <div className="flex-1 font-mono text-sm space-y-1.5 overflow-hidden">
          {TERMINAL_LINES.map((line, i) => {
            if (line.type === 'blank') return <div key={i} className="h-3" />;
            if (line.type === 'divider') return (
              <div key={i} className="text-border text-xs overflow-hidden">{line.text}</div>
            );
            if (line.type === 'header') return (
              <div key={i} className="text-text font-bold text-base mb-1">{line.text}</div>
            );
            if (line.type === 'cmd') return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted">{line.text}</span>
                <span className="text-gain font-semibold">{line.status}</span>
              </div>
            );
            if (line.type === 'signal') return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-accent">{line.text}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-semibold ${
                  line.label === 'BULLISH' ? 'bg-gain-soft text-gain' :
                  line.label === 'BEARISH' ? 'bg-loss-soft text-loss' :
                  'bg-hover text-muted'
                }`}>{line.label}</span>
              </div>
            );
            if (line.type === 'await') return (
              <div key={i} className="flex items-center gap-1 text-muted mt-2">
                <span>{line.text}</span>
                <span className="animate-blink text-accent">_</span>
              </div>
            );
            return null;
          })}
        </div>

        {/* Footer */}
        <div className="text-[11px] font-mono text-muted mt-8">
          Paper trading only — No real money — CSCI 411/412
        </div>
      </div>

      {/* ── Right panel — auth ───────────────────────────────────────── */}
      <div className="flex-1 lg:max-w-[460px] flex flex-col">
        {/* Mobile logo bar */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 h-14 border-b border-border">
          <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <svg className="w-3 h-3" style={{ color: '#09090b' }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            </svg>
          </div>
          <span className="text-sm font-bold font-mono">TradeSent<span className="text-accent">.AI</span></span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-[360px]"
          >
            <div className="terminal-card p-8">
              <h2 className="text-xl font-bold font-mono mb-1">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
              </h2>
              <p className="text-sm text-muted mb-6">
                {mode === 'signin'
                  ? 'Access your trading dashboard.'
                  : 'Start with $100k virtual USD.'}
              </p>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 h-11 rounded-sm border border-border bg-card text-sm font-medium hover:border-accent transition-colors duration-150 mb-5"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-mono text-muted">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="terminal-input w-full h-11 px-3.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="terminal-input w-full h-11 px-3.5"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-loss bg-loss-soft border border-loss/20 rounded-sm px-3.5 py-2.5 font-mono"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="terminal-btn w-full h-11 flex items-center justify-center gap-2"
                >
                  {submitting && <Spinner className="w-3.5 h-3.5" />}
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              </form>

              <p className="text-center text-sm text-muted mt-6">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                  className="text-accent font-semibold hover:underline underline-offset-2"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
