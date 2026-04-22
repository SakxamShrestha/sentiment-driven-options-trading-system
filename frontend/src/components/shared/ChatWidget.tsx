import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = 'home' | 'messages' | 'help';

// ── Help articles ─────────────────────────────────────────────────────────────
interface HelpArticle {
  title: string;
  content: string[];  // paragraphs
}

interface HelpCategory {
  label: string;
  articles: HelpArticle[];
}

const HELP_CATEGORIES: HelpCategory[] = [
  {
    label: 'Getting Started',
    articles: [
      {
        title: 'How to place your first paper trade',
        content: [
          'Search for any stock symbol using the search bar at the top of the app. Click a result to open the Stock Detail page.',
          'On that page you\'ll see a live candlestick chart and an order form on the right. Select Buy or Sell, enter a quantity, choose Market or Limit order, and set the time-in-force (Day or GTC).',
          'Click Place Order. Your paper account starts with $100,000 virtual USD — no real money is ever used. Filled orders appear immediately under Orders and Activities.',
        ],
      },
      {
        title: 'Understanding your portfolio dashboard',
        content: [
          'The Home page shows your total equity, cash balance, and an area chart of your portfolio\'s performance over time. Use the period selector (1D, 1W, 1M, 3M) to zoom in or out.',
          'The right panel lists all your open positions with live prices and unrealised P&L. Click any row to jump to that stock\'s detail page.',
          'The News feed below the chart shows the latest market headlines pulled from Alpaca News and NewsAPI in real time.',
        ],
      },
      {
        title: 'Setting up Firebase authentication',
        content: [
          'TradeSent.AI uses Firebase for authentication. You can sign in with Google (one click) or register with an email and password.',
          'Your progress data — quiz scores, streaks, and lesson completions — is tied to your Firebase user ID, so it persists across devices.',
          'If you sign out, your data is saved and will be restored the next time you log in with the same account.',
        ],
      },
    ],
  },
  {
    label: 'Sentiment Engine',
    articles: [
      {
        title: 'How composite sentiment scoring works',
        content: [
          'Each article is scored by our AI model on a scale of -1.0 (very bearish) to +1.0 (very bullish). The primary model is Claude (Haiku), with Groq Llama 3.3 70B as an automatic fallback.',
          'The composite score blends two signals: news sentiment (85% weight) averaged across all recent articles, and social sentiment from LunarCrush (15% weight) when available.',
          'The final number displayed — e.g. +0.62 BULLISH — is this weighted composite. Anything above +0.2 is bullish, below -0.2 is bearish, and in between is neutral.',
        ],
      },
      {
        title: 'What are catalysts and impact horizon?',
        content: [
          'Catalysts are the specific reasons the AI identified as driving sentiment for an article — for example "earnings beat", "FDA approval", or "supply chain risk". They are extracted per article and aggregated across all results.',
          'Impact horizon tells you how long the sentiment driver is likely to matter: short-term (days to weeks), medium-term (weeks to months), or long-term (months to years).',
          'The dominant horizon shown in the stats sidebar is whichever horizon appeared most often across all scored articles for that ticker.',
        ],
      },
      {
        title: 'Why does confidence vary between articles?',
        content: [
          'Confidence (0–100%) reflects how certain the model is about its own score. A clear earnings report with obvious language produces high confidence. A vague opinion piece or ambiguous headline produces lower confidence.',
          'Low confidence does not mean the score is wrong — it means the signal is weaker and should be weighted less heavily in your own judgement.',
          'The overall confidence shown in the stats ring is the average confidence across all articles analysed in that session.',
        ],
      },
    ],
  },
  {
    label: 'Learn Platform',
    articles: [
      {
        title: 'How streaks and progress are tracked',
        content: [
          'A streak counts how many consecutive days you have completed at least one quiz. The counter resets if you miss a day.',
          'The week dots (Mon–Sun) on the Learn page show which days this week you were active. A filled dot means you completed a quiz that day.',
          'Your total lessons completed and total questions answered are tallied from your quiz history and shown in the Your Progress card.',
        ],
      },
      {
        title: 'What is Daily Trivia?',
        content: [
          'Daily Trivia is one randomly selected question drawn from the full lesson library. It refreshes every 24 hours.',
          'Answering it correctly is a quick way to keep your streak alive on days when you don\'t have time for a full lesson.',
          'The question is pulled from real lesson content, so it doubles as a review of material you may have already studied.',
        ],
      },
      {
        title: 'How quiz scores are saved',
        content: [
          'After finishing a quiz your score (e.g. 8/10) is sent to the backend and stored against your user ID and the lesson ID.',
          'Only your best score is shown on each course card — retaking a quiz can only improve your record, never lower it.',
          'The attempt counter increments every time you complete a quiz, regardless of score, so you can track how much practice you\'ve put in.',
        ],
      },
    ],
  },
  {
    label: 'Trading & Orders',
    articles: [
      {
        title: 'Paper trading vs real trading',
        content: [
          'TradeSent.AI uses Alpaca\'s paper trading environment. All orders are simulated — your $100,000 starting balance is virtual and no real brokerage account is required.',
          'Prices are real-time market data from Alpaca, so the fills you receive reflect actual market conditions. This makes paper trading a realistic environment for learning.',
          'To switch to real money trading you would need a live Alpaca account and separate API keys — this app is intentionally kept in paper mode for safety.',
        ],
      },
      {
        title: 'How the circuit breaker works',
        content: [
          'The circuit breaker is a safety switch that pauses the automated trading pipeline. When tripped, the system stops generating new trade signals even if sentiment conditions are met.',
          'You can toggle it manually from the Sentiment page. It is useful when markets are unusually volatile and you want to review signals manually before acting.',
          'The circuit breaker only affects automated signals — you can still place manual orders from the Stock Detail page while it is active.',
        ],
      },
      {
        title: 'Reading candlestick charts',
        content: [
          'Each candle represents one time period (1 minute, 1 hour, etc.). The body shows the open and close price; the wicks show the high and low.',
          'A green candle means the price closed higher than it opened (bullish). A red candle means it closed lower (bearish).',
          'Use the timeframe selector on the Stock Detail page to switch between 1m, 5m, 15m, 1h, and 1D views depending on whether you want a micro or macro picture.',
        ],
      },
    ],
  },
];

// ── Blinking cursor ───────────────────────────────────────────────────────────
function Cursor() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 13,
        background: 'var(--color-accent)',
        marginLeft: 3,
        verticalAlign: 'middle',
        animation: 'blink 1.1s step-end infinite',
      }}
    />
  );
}

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ color = 'var(--color-gain)' }: { color?: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 6px ${color}88`,
      }}
    />
  );
}

// ── Home tab ──────────────────────────────────────────────────────────────────
function HomeTab({ onFeedback }: { onFeedback: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 16px 0' }}>

      {/* System status */}
      <div style={{
        background: 'var(--color-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', letterSpacing: '0.2em', marginBottom: 2 }}>
          SYSTEM STATUS
        </div>
        {[
          { label: 'Sentiment Engine', status: 'OPERATIONAL' },
          { label: 'Alpaca Paper API', status: 'OPERATIONAL' },
          { label: 'News Pipeline', status: 'OPERATIONAL' },
          { label: 'Auth / Firebase', status: 'OPERATIONAL' },
        ].map(({ label, status }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <StatusDot />
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-gain)' }}>{status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chat CTA */}
      <div style={{
        background: 'var(--color-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: '14px',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--color-text)' }}>
          Talk to us
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 12, lineHeight: 1.5 }}>
          We typically reply within a few hours during business days.
        </div>
        <button
          onClick={() => window.open('mailto:sakxamshrestha57@gmail.com?subject=TradeSent.AI%20Support%20Request&body=Hi%20Sakxam%2C%0A%0AI%20have%20a%20question%20about%20TradeSent.AI%3A%0A%0A', '_blank')}
          style={{
            width: '100%',
            padding: '9px 0',
            background: 'var(--color-accent)',
            color: '#09090b',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.12em',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          INIT CHAT SESSION →
        </button>
      </div>

      {/* Feedback */}
      <button
        onClick={onFeedback}
        style={{
          width: '100%',
          padding: '10px 0',
          background: 'transparent',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          color: 'var(--color-muted)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--color-accent)';
          e.currentTarget.style.color = 'var(--color-accent)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-muted)';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        SEND FEEDBACK
      </button>
    </div>
  );
}

// ── Messages tab ──────────────────────────────────────────────────────────────
function MessagesTab() {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      padding: '0 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 44,
        height: 44,
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.25,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--color-muted)', opacity: 0.6 }}>
        NO ACTIVE THREADS
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-muted)', opacity: 0.5, lineHeight: 1.5 }}>
        Start a conversation from the Home tab to see messages here.
      </div>
    </div>
  );
}

// ── Help tab ──────────────────────────────────────────────────────────────────
function HelpTab() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<HelpArticle | null>(null);

  const filtered = HELP_CATEGORIES.map(cat => ({
    ...cat,
    articles: cat.articles.filter(a =>
      !query ||
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      cat.label.toLowerCase().includes(query.toLowerCase())
    ),
  })).filter(cat => cat.articles.length > 0);

  // ── Article detail view ──
  if (active) {
    return (
      <motion.div
        key="article"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -18 }}
        transition={{ duration: 0.18 }}
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* Back bar */}
        <button
          onClick={() => setActive(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            background: 'var(--color-hover)',
            border: 'none',
            borderBottom: '1px solid var(--color-border)',
            cursor: 'pointer',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.18em',
            flexShrink: 0,
            textAlign: 'left',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          BACK TO HELP
        </button>

        {/* Content */}
        <div style={{ padding: '16px 16px 20px', overflowY: 'auto', flex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--color-text)',
            lineHeight: 1.4,
            marginBottom: 14,
          }}>
            {active.title}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.content.map((para, i) => (
              <p key={i} style={{
                fontSize: 11,
                color: 'var(--color-muted)',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {para}
              </p>
            ))}
          </div>

          {/* CTA */}
          <div style={{
            marginTop: 20,
            padding: '10px 12px',
            background: 'var(--color-hover)',
            border: '1px solid var(--color-border)',
            borderRadius: 3,
          }}>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Still need help?{' '}
              <span
                onClick={() => window.open('mailto:sakxamshrestha57@gmail.com?subject=TradeSent.AI%20Help%3A%20' + encodeURIComponent(active.title), '_blank')}
                style={{ color: 'var(--color-accent)', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10 }}
              >
                Email us →
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Article list view ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, padding: '14px 16px 0' }}>
      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--color-hover)',
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        padding: '8px 12px',
        marginBottom: 14,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search docs..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-text)',
          }}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', padding: 0, lineHeight: 1 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map(cat => (
          <div key={cat.label}>
            <div style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-accent)',
              letterSpacing: '0.2em',
              marginBottom: 6,
            }}>
              {cat.label.toUpperCase()}
            </div>
            {cat.articles.map(article => (
              <div
                key={article.title}
                onClick={() => setActive(article)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid var(--color-border)',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                  color: 'var(--color-muted)',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-muted)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-accent)', opacity: 0.5 }}>›</span>
                  <span style={{ fontSize: 11, lineHeight: 1.4 }}>{article.title}</span>
                </div>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.4 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSendFeedback = () => {
    if (!feedbackText.trim()) return;
    const subject = encodeURIComponent('TradeSent.AI Feedback');
    const body = encodeURIComponent(feedbackText.trim());
    window.open(`mailto:sakxamshrestha57@gmail.com?subject=${subject}&body=${body}`, '_blank');
    setFeedbackSent(true);
    setTimeout(() => {
      setFeedbackOpen(false);
      setFeedbackSent(false);
      setFeedbackText('');
    }, 2000);
  };

  return (
    <>
      {/* Blink keyframe */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes widget-pulse { 0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--color-accent) 40%,transparent)} 50%{box-shadow:0 0 0 8px transparent} }
      `}</style>

      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        {/* ── Widget panel ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="panel"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 340,
                height: 520,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 6,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transformOrigin: 'bottom right',
              }}
            >
              {/* Header */}
              <div style={{
                borderBottom: '1px solid var(--color-border)',
                borderTop: '2px solid var(--color-accent)',
                padding: '14px 16px 12px',
                background: 'var(--color-card)',
                flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-accent)',
                      letterSpacing: '0.2em',
                      marginBottom: 5,
                    }}>
                      SUPPORT.SYS <Cursor />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                      Hi there 👋
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                      How can we help you today?
                    </div>
                  </div>

                  {/* Team avatars */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div style={{ display: 'flex' }}>
                      {['S', 'A', 'T'].map((initial, i) => (
                        <div
                          key={i}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: i === 0 ? 'var(--color-accent)' : i === 1 ? '#34d399' : '#818cf8',
                            border: '2px solid var(--color-bg)',
                            marginLeft: i > 0 ? -8 : 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#09090b',
                            fontFamily: 'var(--font-mono)',
                            zIndex: 3 - i,
                          }}
                        >
                          {initial}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <StatusDot />
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--color-gain)', letterSpacing: '0.1em' }}>
                        ONLINE
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tab}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                    style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                  >
                    {tab === 'home'     && <HomeTab onFeedback={() => setFeedbackOpen(true)} />}
                    {tab === 'messages' && <MessagesTab />}
                    {tab === 'help'     && <HelpTab />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom nav */}
              <div style={{
                display: 'flex',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-card)',
                flexShrink: 0,
              }}>
                {([
                  { id: 'home' as Tab, label: 'HOME', icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  )},
                  { id: 'messages' as Tab, label: 'MSGS', icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  )},
                  { id: 'help' as Tab, label: 'HELP', icon: (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  )},
                ] as const).map(({ id, label, icon }) => {
                  const active = tab === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      style={{
                        flex: 1,
                        padding: '10px 0 9px',
                        background: 'transparent',
                        border: 'none',
                        borderTop: `2px solid ${active ? 'var(--color-accent)' : 'transparent'}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        color: active ? 'var(--color-accent)' : 'var(--color-muted)',
                        transition: 'color 0.15s',
                        marginTop: -1,
                      }}
                    >
                      {icon}
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.15em' }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FAB ── */}
        <motion.button
          onClick={() => setOpen(o => !o)}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.93 }}
          style={{
            width: 48,
            height: 48,
            borderRadius: 4,
            background: open ? 'var(--color-hover)' : 'var(--color-accent)',
            border: `1.5px solid ${open ? 'var(--color-border)' : 'var(--color-accent)'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: open ? 'none' : '0 8px 24px rgba(0,0,0,0.4)',
            animation: open ? 'none' : 'widget-pulse 2.5s ease-in-out infinite',
            transition: 'background 0.2s, border-color 0.2s',
            color: open ? 'var(--color-muted)' : '#09090b',
          }}
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.svg key="close"
                initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </motion.svg>
            ) : (
              <motion.svg key="chat"
                initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Feedback modal ── */}
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div
            key="feedback-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 10000,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setFeedbackOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 380,
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderTop: '2px solid var(--color-accent)',
                borderRadius: 6,
                padding: 24,
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-accent)', letterSpacing: '0.2em', marginBottom: 10 }}>
                FEEDBACK.LOG
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: 'var(--color-text)' }}>
                Send Feedback
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                Feature requests, bug reports, or general thoughts — we read everything.
              </div>
              {feedbackSent ? (
                <div style={{
                  padding: '14px', textAlign: 'center', fontFamily: 'var(--font-mono)',
                  fontSize: 11, color: 'var(--color-gain)', letterSpacing: '0.1em',
                  border: '1px solid var(--color-gain)', borderRadius: 3,
                }}>
                  ✓ RECEIVED — THANK YOU
                </div>
              ) : (
                <>
                  <textarea
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Type your feedback here..."
                    rows={4}
                    style={{
                      width: '100%',
                      background: 'var(--color-hover)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 3,
                      padding: '10px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--color-text)',
                      resize: 'none',
                      outline: 'none',
                      boxSizing: 'border-box',
                      marginBottom: 12,
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setFeedbackOpen(false)}
                      style={{
                        flex: 1, padding: '9px 0',
                        background: 'transparent', border: '1px solid var(--color-border)',
                        borderRadius: 3, color: 'var(--color-muted)',
                        fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer',
                      }}
                    >
                      CANCEL
                    </button>
                    <button
                      onClick={handleSendFeedback}
                      disabled={!feedbackText.trim()}
                      style={{
                        flex: 2, padding: '9px 0',
                        background: feedbackText.trim() ? 'var(--color-accent)' : 'var(--color-hover)',
                        border: 'none', borderRadius: 3,
                        color: feedbackText.trim() ? '#09090b' : 'var(--color-muted)',
                        fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                        letterSpacing: '0.1em', cursor: feedbackText.trim() ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s',
                      }}
                    >
                      TRANSMIT →
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
