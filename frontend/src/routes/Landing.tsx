import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { loginWithGoogle, loginWithEmail, registerWithEmail } from '../services/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { Spinner } from '../components/shared/Spinner';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 animate-gradient" style={{ background: 'linear-gradient(135deg, rgba(56,97,251,0.06) 0%, rgba(107,138,253,0.03) 50%, rgba(184,195,255,0.05) 100%)' }} />
      <div className="absolute inset-0 bg-bg/80" />

      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-3xl animate-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(56,97,251,0.14) 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full blur-3xl animate-pulse-glow" style={{ background: 'radial-gradient(circle, rgba(107,138,253,0.10) 0%, transparent 70%)', animationDelay: '1.5s' }} />

      {/* Dot grid overlay */}
      <div className="absolute inset-0 dot-grid opacity-30" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Top bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between px-6 md:px-10 h-16 shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2755e8, #3861fb)', boxShadow: '0 4px 12px rgba(56,97,251,0.30)' }}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight font-mono">TradeSent<span className="text-accent">.AI</span></span>
          </div>
        </motion.div>

        {/* Main */}
        <div className="flex-1 flex flex-col lg:flex-row items-center">

          {/* Left — copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1 flex flex-col justify-center px-6 md:px-10 lg:px-16 py-12 lg:py-0"
          >
            <div className="max-w-[520px]">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                Paper Trading Simulator
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight mb-6">
                Sentiment-driven<br />
                <span className="gradient-text">trading intelligence.</span>
              </h1>
              <p className="text-muted text-base md:text-lg leading-relaxed mb-10 max-w-[440px]">
                Real-time news analysis with FinBERT and Llama 3. Simulate trades
                with a $100k virtual portfolio via Alpaca.
              </p>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: '5 sources', sub: 'Real-time ingestion', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                  { title: 'AI scoring', sub: 'FinBERT + Llama 3', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
                  { title: 'Paper trading', sub: '$100k virtual USD', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { title: 'Risk controls', sub: 'Circuit breaker', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                ].map(({ title, sub, icon }) => (
                  <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                      </svg>
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{title}</div>
                      <div className="text-muted text-xs mt-0.5">{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right — auth card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex items-center justify-center px-6 md:px-10 lg:px-16 py-12 lg:py-0 lg:w-[480px] shrink-0"
          >
            <div className="w-full max-w-[380px] glass rounded-2xl p-8 shadow-xl shadow-black/5">
              <h2 className="text-xl font-bold mb-1">
                {mode === 'signin' ? 'Welcome back' : 'Get started'}
              </h2>
              <p className="text-sm text-muted mb-6">
                {mode === 'signin'
                  ? 'Sign in to your trading dashboard.'
                  : 'Create an account to start trading.'}
              </p>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-border bg-card text-sm font-medium hover:bg-hover hover:border-muted transition-all duration-200 mb-5"
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
                <span className="text-xs text-muted">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg/50 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 placeholder:text-muted/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full h-11 px-3.5 rounded-xl border border-border bg-bg/50 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200 placeholder:text-muted/40"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-loss bg-loss-soft border border-loss/10 rounded-xl px-3.5 py-2.5"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-11 rounded-xl btn-accent text-sm flex items-center justify-center gap-2"
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

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="px-6 md:px-10 py-4 text-xs text-muted font-mono"
        >
          Paper trading only — No real money — CSCI 411/412
        </motion.div>
      </div>
    </div>
  );
}
