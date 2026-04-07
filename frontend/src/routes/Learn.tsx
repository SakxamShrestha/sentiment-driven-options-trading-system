import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import QuizModal from '../components/learn/QuizModal';
import { api } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import type { LearnQuestion } from '../types';

// ─── Glossary Data — add your terms here ──────────────────────────────────────
// Each entry: { term, definition, emoji }
// emoji = icon shown on the card. Terms auto-sort A–Z and group by first letter.

const GLOSSARY: { term: string; definition: string; emoji: string }[] = [
  // ── A ──
  { term: 'Annual Report',    emoji: '📄', definition: 'A comprehensive report released by public companies each year, detailing financial performance, strategy, and future outlook.' },
  { term: 'Ask Price',        emoji: '🏷️', definition: 'The lowest price a seller is willing to accept for a security.' },
  { term: 'Asset Allocation', emoji: '🥧', definition: 'The process of dividing investments among different asset categories such as stocks, bonds, and cash.' },
  // ── B ──
  { term: 'Balance Sheet',    emoji: '⚖️', definition: 'A financial statement showing a company\'s assets, liabilities, and shareholders\' equity at a specific point in time.' },
  { term: 'Bear Market',      emoji: '🐻', definition: 'A market condition where prices fall 20% or more from recent highs, typically accompanied by negative investor sentiment.' },
  { term: 'Bid Price',        emoji: '💬', definition: 'The highest price a buyer is willing to pay for a security.' },
  { term: 'Bull Market',      emoji: '🐂', definition: 'A market condition where prices are rising or expected to rise, typically by 20% or more.' },
  // ── C ──
  { term: 'Candlestick Chart', emoji: '🕯️', definition: 'A price chart that displays the open, high, low, and close for a security over a specific time period.' },
  { term: 'Circuit Breaker',  emoji: '🔌', definition: 'A mechanism that temporarily halts trading or automated signals when extreme market conditions are detected.' },
  // ── D ──
  { term: 'Dividend',         emoji: '💰', definition: 'A distribution of a portion of a company\'s earnings to its shareholders.' },
  { term: 'Drawdown',         emoji: '📉', definition: 'The peak-to-trough decline during a specific period for an investment or fund.' },
  // ── E ──
  { term: 'EPS (Earnings Per Share)', emoji: '💵', definition: 'A company\'s net profit divided by the number of outstanding shares. Higher EPS generally signals stronger profitability.' },
  { term: 'ETF (Exchange-Traded Fund)', emoji: '🗂️', definition: 'A type of investment fund traded on stock exchanges, holding assets such as stocks, bonds, or commodities.' },
  // ── F ──
  { term: 'FinBERT',          emoji: '🤖', definition: 'A BERT-based NLP model fine-tuned on financial text. Used in TradeSent to score news sentiment from -1 (bearish) to +1 (bullish).' },
  // ── L ──
  { term: 'Liquidity',        emoji: '💧', definition: 'How quickly and easily an asset can be converted into cash without significantly affecting its price.' },
  { term: 'Llama 3',          emoji: '🦙', definition: 'A large language model by Meta, used via the Groq API in TradeSent for deeper sentiment reasoning on financial news.' },
  // ── M ──
  { term: 'Market Cap',       emoji: '🏢', definition: 'Total market value of a company\'s outstanding shares. Calculated as share price × total shares outstanding.' },
  { term: 'Momentum',         emoji: '⚡', definition: 'The rate of acceleration of a security\'s price or volume — a key signal in TradeSent\'s backtest strategy.' },
  // ── P ──
  { term: 'P/E Ratio',        emoji: '📐', definition: 'Price-to-Earnings ratio. Measures a company\'s current share price relative to its earnings per share.' },
  { term: 'Paper Trading',    emoji: '📝', definition: 'Simulated trading using virtual money. TradeSent uses Alpaca\'s paper environment with $100K virtual USD.' },
  { term: 'Portfolio',        emoji: '💼', definition: 'A collection of financial investments — stocks, bonds, cash, and other assets — held by an investor.' },
  { term: 'Position Sizing',  emoji: '📏', definition: 'Determining how much capital to allocate to a single trade based on risk tolerance and strategy rules.' },
  // ── S ──
  { term: 'Sentiment Score',  emoji: '🧠', definition: 'A numerical value representing the emotional tone of financial news. TradeSent uses FinBERT and Llama 3 to generate these scores.' },
  { term: 'Short Selling',    emoji: '🔽', definition: 'Borrowing and selling a security with the expectation of buying it back at a lower price.' },
  { term: 'Spread',           emoji: '↔️', definition: 'The difference between the bid and ask price of a security.' },
  { term: 'Stop Loss',        emoji: '🛑', definition: 'An order placed to sell a security when it reaches a specific price, limiting potential losses.' },
  // ── V ──
  { term: 'Volatility',       emoji: '🌊', definition: 'A statistical measure of the dispersion of returns for a security. Higher volatility means higher risk and potential reward.' },
  { term: 'Volume',           emoji: '📊', definition: 'The number of shares or contracts traded in a security or market during a given period.' },
];

// ─── Dictionary Panel ─────────────────────────────────────────────────────────
function DictionaryPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? GLOSSARY.filter(g => g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q))
      : GLOSSARY;
  }, [query]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof GLOSSARY> = {};
    const sorted = [...filtered].sort((a, b) => a.term.localeCompare(b.term));
    for (const entry of sorted) {
      const letter = entry.term[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(entry);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <AnimatePresence>
      <motion.div
        key="dict-overlay"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 599,
          background: 'var(--color-bg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header bar ───────────────────────────────────────────────── */}
        <div style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 28px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-card)',
        }}>
          {/* Back + breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 6,
                background: 'none',
                border: '1px solid var(--color-border)',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 14,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-accent)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-muted)';
              }}
            >
              ←
            </button>

            {/* Breadcrumb */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
            }}>
              <span
                onClick={onClose}
                style={{ cursor: 'pointer', transition: 'color 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = 'var(--color-text)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = 'var(--color-muted)'; }}
              >
                Learn
              </span>
              <span style={{ opacity: 0.4 }}>/</span>
              <span style={{ color: 'var(--color-text)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>📖</span> Investing Dictionary
              </span>
              <span style={{
                fontSize: 10,
                padding: '1px 7px',
                borderRadius: 4,
                border: '1px solid var(--color-border)',
                color: 'var(--color-muted)',
                marginLeft: 2,
              }}>
                {GLOSSARY.length} terms
              </span>
            </div>
          </div>

          {/* Pill search bar */}
          <div style={{ position: 'relative', width: 280, flexShrink: 0 }}>
            <svg
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-muted)',
                pointerEvents: 'none',
              }}
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              style={{
                width: '100%',
                height: 36,
                paddingLeft: 36,
                paddingRight: 16,
                borderRadius: 999,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              placeholder="Search for a term…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              spellCheck={false}
              onFocus={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--color-accent)'; }}
              onBlur={e => { (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--color-border)'; }}
            />
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px 80px' }}>
          {grouped.length === 0 ? (
            <div style={{
              marginTop: 80,
              textAlign: 'center',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--color-muted)',
            }}>
              No results for "<strong style={{ color: 'var(--color-text)' }}>{query}</strong>"
            </div>
          ) : (
            grouped.map(([letter, terms]) => (
              <div
                key={letter}
                style={{
                  display: 'flex',
                  gap: 24,
                  marginBottom: 40,
                  alignItems: 'flex-start',
                }}
              >
                {/* Letter marker */}
                <div style={{
                  width: 36,
                  flexShrink: 0,
                  paddingTop: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 22,
                  fontWeight: 800,
                  color: 'var(--color-accent)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}>
                  {letter}
                </div>

                {/* Card grid */}
                <div style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: 12,
                }}>
                  {terms.map(({ term, definition, emoji }) => (
                    <DictCard key={term} term={term} definition={definition} emoji={emoji} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Floating help button ──────────────────────────────────────── */}
        <button
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            border: 'none',
            color: '#09090b',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'transform 0.15s ease, opacity 0.15s ease',
            zIndex: 600,
          }}
          title="Help"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          💬
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Dictionary Card ──────────────────────────────────────────────────────────
function DictCard({ term, definition, emoji }: { term: string; definition: string; emoji: string }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        padding: '16px 18px',
        borderRadius: 16,
        background: 'var(--color-card)',
        border: `1px solid ${hovered ? 'var(--color-accent)' : 'var(--color-border)'}`,
        cursor: 'default',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 20px rgba(0,0,0,0.15)' : 'none',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'var(--color-hover)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        marginBottom: 12,
      }}>
        {emoji}
      </div>
      {/* Term */}
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text)',
        marginBottom: 7,
        lineHeight: 1.3,
      }}>
        {term}
      </div>
      {/* Definition */}
      <div style={{
        fontSize: 12,
        lineHeight: 1.65,
        color: 'var(--color-muted)',
      }}>
        {definition}
      </div>
    </div>
  );
}

// ─── Data ──────────────────────────────────────────────────────────────────────

const COURSES = [
  {
    id: 1,
    title: 'Investing 101',
    instructor: 'Brandon Beavis',
    description: 'Start your investing journey with the fundamentals every trader needs to know.',
    modules: 5,
    duration: '1h 30m',
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
    accentColor: '#818cf8',
    emoji: '📈',
  },
  {
    id: 2,
    title: 'Sentiment Analysis',
    instructor: 'TradeSent Team',
    description: 'Master AI-driven sentiment scoring with FinBERT and Llama 3 models.',
    modules: 4,
    duration: '55m',
    gradient: 'linear-gradient(160deg, #0c0a09 0%, #1c0a00 50%, #431407 100%)',
    accentColor: '#fb923c',
    emoji: '🧠',
  },
  {
    id: 3,
    title: 'Technical Analysis',
    instructor: 'Sarah Chen',
    description: 'Read candlestick charts, identify trends, and spot key support levels.',
    modules: 6,
    duration: '2h',
    gradient: 'linear-gradient(160deg, #042f2e 0%, #065f46 50%, #064e3b 100%)',
    accentColor: '#34d399',
    emoji: '📊',
  },
  {
    id: 4,
    title: 'Options Fundamentals',
    instructor: 'Marcus Webb',
    description: 'Calls, puts, strikes, expiry — decode the language of options trading.',
    modules: 7,
    duration: '3h',
    gradient: 'linear-gradient(160deg, #0c0a00 0%, #1a1200 50%, #3d2b00 100%)',
    accentColor: '#fbbf24',
    emoji: '⚡',
  },
  {
    id: 5,
    title: 'Risk Management',
    instructor: 'Elena Ross',
    description: 'Position sizing, stop losses, and circuit breakers for consistent returns.',
    modules: 3,
    duration: '45m',
    gradient: 'linear-gradient(160deg, #0f0a1e 0%, #1e0a2e 50%, #2e1065 100%)',
    accentColor: '#c084fc',
    emoji: '🛡️',
  },
  {
    id: 6,
    title: 'Momentum Backtesting',
    instructor: 'TradeSent Team',
    description: 'Replay historical bars to validate your strategies before going live.',
    modules: 4,
    duration: '1h 10m',
    gradient: 'linear-gradient(160deg, #0a1628 0%, #0d2137 50%, #0c3560 100%)',
    accentColor: '#60a5fa',
    emoji: '🔁',
  },
];

const EARN_ENTITIES = [
  {
    id: 1,
    name: 'REX Shares',
    title: 'What is a Leveraged ETF?',
    amount: '0.50',
    locked: false,
    emoji: '📦',
    gradient: 'linear-gradient(135deg, #1a0505 0%, #2d0f0f 100%)',
    accentColor: '#f87171',
  },
  {
    id: 2,
    name: 'Vanguard',
    title: 'Index Funds Explained',
    amount: '1.00',
    locked: true,
    emoji: '🏛️',
    gradient: 'linear-gradient(135deg, #0d0a1a 0%, #1a1030 100%)',
    accentColor: '#a78bfa',
  },
  {
    id: 3,
    name: 'ARK Invest',
    title: 'Disruptive Innovation',
    amount: '0.75',
    locked: false,
    emoji: '🚀',
    gradient: 'linear-gradient(135deg, #020d1a 0%, #051830 100%)',
    accentColor: '#38bdf8',
  },
  {
    id: 4,
    name: 'iShares',
    title: 'Bond ETFs 101',
    amount: '0.50',
    locked: true,
    emoji: '💰',
    gradient: 'linear-gradient(135deg, #031a0e 0%, #052e18 100%)',
    accentColor: '#4ade80',
  },
  {
    id: 5,
    name: 'Invesco QQQ',
    title: 'Nasdaq 100 Deep Dive',
    amount: '0.75',
    locked: false,
    emoji: '🔷',
    gradient: 'linear-gradient(135deg, #0f0a00 0%, #1f1400 100%)',
    accentColor: '#fbbf24',
  },
];

const RECOMMENDED = [
  {
    id: 1,
    title: 'Earnings Per Share',
    duration: '1 min',
    quizzes: 16,
    emoji: '💵',
    accentColor: '#818cf8',
  },
  {
    id: 2,
    title: 'Price-to-Earnings Ratio',
    duration: '2 min',
    quizzes: 12,
    emoji: '📐',
    accentColor: '#fb923c',
  },
  {
    id: 3,
    title: 'Market Capitalization',
    duration: '1 min',
    quizzes: 10,
    emoji: '🏢',
    accentColor: '#34d399',
  },
  {
    id: 4,
    title: 'Dividend Yield',
    duration: '3 min',
    quizzes: 8,
    emoji: '🍃',
    accentColor: '#4ade80',
  },
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const COMPLETED_DAYS = [0, 1, 2];

// ─── Lesson Library Data ───────────────────────────────────────────────────────
const LESSONS: {
  id: number; title: string; duration: string; quizzes: number;
  emoji: string; iconBg: string;
}[] = [
  // A
  { id: 101, title: 'Asset Classes Explained',        duration: '2 min', quizzes: 10, emoji: '🗂️',  iconBg: '#4299E1' },
  { id: 102, title: 'Annual Returns: What They Mean', duration: '1 min', quizzes: 8,  emoji: '📅',  iconBg: '#805AD5' },
  // B
  { id: 103, title: 'Bull vs. Bear Markets',          duration: '2 min', quizzes: 12, emoji: '🐂',  iconBg: '#68D391' },
  { id: 104, title: 'Bonds 101',                      duration: '3 min', quizzes: 9,  emoji: '📜',  iconBg: '#ED8936' },
  { id: 105, title: '2 Ways To Pay Off Debt',         duration: '3 min', quizzes: 2,  emoji: '💳',  iconBg: '#F687B3' },
  // C
  { id: 106, title: 'Candlestick Charts Deep Dive',   duration: '4 min', quizzes: 14, emoji: '🕯️',  iconBg: '#ED8936' },
  { id: 107, title: 'Compound Interest Over Time',    duration: '2 min', quizzes: 11, emoji: '📈',  iconBg: '#4FD1C5' },
  { id: 108, title: 'Circuit Breakers in Trading',    duration: '1 min', quizzes: 6,  emoji: '🔌',  iconBg: '#805AD5' },
  // D
  { id: 109, title: 'Diversification Strategies',    duration: '3 min', quizzes: 13, emoji: '🥧',  iconBg: '#68D391' },
  { id: 110, title: 'Dividends & Yield',              duration: '2 min', quizzes: 10, emoji: '🍃',  iconBg: '#4299E1' },
  { id: 111, title: 'Day Trading Fundamentals',       duration: '5 min', quizzes: 18, emoji: '⚡',  iconBg: '#ED8936' },
  // E
  { id: 112, title: 'Earnings Per Share (EPS)',       duration: '1 min', quizzes: 16, emoji: '💵',  iconBg: '#805AD5' },
  { id: 113, title: 'ETFs vs. Mutual Funds',          duration: '3 min', quizzes: 12, emoji: '🗂️',  iconBg: '#68D391' },
  // F
  { id: 114, title: 'FinBERT: AI for Finance',        duration: '2 min', quizzes: 8,  emoji: '🤖',  iconBg: '#4FD1C5' },
  { id: 115, title: 'Fixed Income Investing',         duration: '3 min', quizzes: 10, emoji: '🏦',  iconBg: '#ED8936' },
  // I
  { id: 116, title: 'Index Funds Explained',          duration: '2 min', quizzes: 9,  emoji: '🏛️',  iconBg: '#4299E1' },
  { id: 117, title: 'IPOs: Going Public',             duration: '4 min', quizzes: 15, emoji: '🚀',  iconBg: '#F687B3' },
  // L
  { id: 118, title: 'Liquidity & Market Depth',       duration: '2 min', quizzes: 7,  emoji: '💧',  iconBg: '#68D391' },
  { id: 119, title: 'Limit Orders vs. Market Orders', duration: '1 min', quizzes: 8,  emoji: '🎯',  iconBg: '#805AD5' },
  // M
  { id: 120, title: 'Market Capitalization',          duration: '1 min', quizzes: 10, emoji: '🏢',  iconBg: '#4FD1C5' },
  { id: 121, title: 'Momentum Trading',               duration: '3 min', quizzes: 11, emoji: '🌊',  iconBg: '#ED8936' },
  // O
  { id: 122, title: 'Options: Calls & Puts',          duration: '5 min', quizzes: 20, emoji: '📋',  iconBg: '#F687B3' },
  { id: 123, title: 'Order Types Explained',          duration: '2 min', quizzes: 9,  emoji: '📤',  iconBg: '#4299E1' },
  // P
  { id: 124, title: 'P/E Ratio',                      duration: '2 min', quizzes: 12, emoji: '📐',  iconBg: '#805AD5' },
  { id: 125, title: 'Portfolio Rebalancing',          duration: '3 min', quizzes: 11, emoji: '⚖️',  iconBg: '#68D391' },
  { id: 126, title: 'Paper Trading Strategies',       duration: '2 min', quizzes: 8,  emoji: '📝',  iconBg: '#ED8936' },
  // R
  { id: 127, title: 'Risk-Reward Ratio',              duration: '2 min', quizzes: 9,  emoji: '🎲',  iconBg: '#4FD1C5' },
  { id: 128, title: 'RSI: Relative Strength Index',   duration: '3 min', quizzes: 13, emoji: '📊',  iconBg: '#4299E1' },
  // S
  { id: 129, title: 'Sentiment Analysis in Trading',  duration: '3 min', quizzes: 14, emoji: '🧠',  iconBg: '#805AD5' },
  { id: 130, title: 'Short Selling 101',              duration: '4 min', quizzes: 16, emoji: '🔽',  iconBg: '#F687B3' },
  { id: 131, title: 'Stop Loss Orders',               duration: '1 min', quizzes: 7,  emoji: '🛑',  iconBg: '#ED8936' },
  // V
  { id: 132, title: 'Volatility & VIX',               duration: '3 min', quizzes: 12, emoji: '🌪️',  iconBg: '#4FD1C5' },
  { id: 133, title: 'Volume Analysis',                duration: '2 min', quizzes: 8,  emoji: '📊',  iconBg: '#68D391' },
  // W
  { id: 134, title: 'Watchlists & Screening',        duration: '1 min', quizzes: 6,  emoji: '🔍',  iconBg: '#4299E1' },
];

// ─── Library Lesson Card ───────────────────────────────────────────────────────
function LibraryLessonCard({ lesson, onStartQuiz, completed }: {
  lesson: typeof LESSONS[0];
  onStartQuiz?: () => void;
  completed?: boolean;
}) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onStartQuiz}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 16,
        background: hovered ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${completed ? 'rgba(34,197,94,0.35)' : hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        borderRadius: 12,
        background: lesson.iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
        boxShadow: `0 4px 14px ${lesson.iconBg}55`,
      }}>
        {lesson.emoji}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#ffffff',
          marginBottom: 4,
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {lesson.title}
        </div>
        <div style={{
          fontSize: 11,
          color: '#718096',
          fontFamily: 'var(--font-mono)',
        }}>
          {lesson.duration} · {lesson.quizzes} quiz questions
        </div>
      </div>
      {completed && (
        <div style={{
          width: 20, height: 20, borderRadius: '50%',
          background: 'rgba(34,197,94,0.2)', border: '1.5px solid #22c55e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#22c55e', flexShrink: 0,
        }}>✓</div>
      )}
    </div>
  );
}

// ─── Lesson Library Panel ─────────────────────────────────────────────────────
function LessonLibraryPanel({ onClose, onOpenDict, onStartQuiz, completedLessons }: { onClose: () => void; onOpenDict: () => void; onStartQuiz: (id: number, title: string, emoji: string, iconBg: string) => void; completedLessons?: Set<number> }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? LESSONS.filter(l => l.title.toLowerCase().includes(q))
      : LESSONS;
  }, [query]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof LESSONS> = {};
    for (const lesson of filtered) {
      const letter = lesson.title[0].toUpperCase();
      if (!map[letter]) map[letter] = [];
      map[letter].push(lesson);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <AnimatePresence>
      <motion.div
        key="lib-overlay"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 598,
          background: '#0E0E0E',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: '#0E0E0E',
          gap: 16,
        }}>
          {/* Back button */}
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#a0aec0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 12H5" /><path d="M12 5l-7 7 7 7" />
            </svg>
          </button>

          {/* Centered title */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', letterSpacing: '-0.01em' }}>
              Lesson library
            </span>
          </div>

          {/* Right: balance + dictionary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '5px 12px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#a0aec0', fontWeight: 600 }}>
                $ 0.50
              </span>
              <span style={{ fontSize: 14, color: '#718096', cursor: 'pointer' }}>···</span>
            </div>
            <button
              onClick={() => { onClose(); onOpenDict(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 999,
                background: '#48C7B0',
                border: 'none',
                color: '#0a2e29',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Dictionary
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px 80px' }}>

          {/* Hero search banner */}
          <div style={{
            borderRadius: 24,
            background: 'linear-gradient(135deg, #7b6ff0 0%, #a197ff 50%, #c3baff 100%)',
            padding: '28px 28px 24px',
            marginBottom: 32,
          }}>
            <h2 style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#1a1040',
              margin: '0 0 16px',
              letterSpacing: '-0.02em',
            }}>
              Lesson Library
            </h2>
            <div style={{ position: 'relative' }}>
              <svg
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#718096', pointerEvents: 'none' }}
                width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                style={{
                  width: '100%',
                  height: 44,
                  paddingLeft: 42,
                  paddingRight: 16,
                  borderRadius: 12,
                  border: 'none',
                  background: '#1a1a2e',
                  color: '#e2e8f0',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                placeholder="Search for a lesson"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
                spellCheck={false}
              />
            </div>
          </div>

          {/* Lesson grid */}
          <div style={{
            borderRadius: 24,
            background: '#1A1A1A',
            padding: '28px 24px 24px',
          }}>
            {grouped.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#718096', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                No lessons found for "<strong style={{ color: '#a0aec0' }}>{query}</strong>"
              </div>
            ) : (
              grouped.map(([letter, lessons]) => (
                <div key={letter} style={{ display: 'flex', gap: 20, marginBottom: 36, alignItems: 'flex-start' }}>
                  {/* Letter marker */}
                  <div style={{
                    width: 32,
                    flexShrink: 0,
                    paddingTop: 8,
                    fontSize: 20,
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: '#a197ff',
                    lineHeight: 1,
                    userSelect: 'none',
                  }}>
                    {letter}
                  </div>
                  {/* Two-column grid */}
                  <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}>
                    {lessons.map(lesson => (
                      <LibraryLessonCard
                        key={lesson.id}
                        lesson={lesson}
                        completed={completedLessons?.has(lesson.id)}
                        onStartQuiz={() => onStartQuiz(lesson.id, lesson.title, lesson.emoji, lesson.iconBg)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Floating chat widget */}
        <button
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: '#805AD5',
            border: 'none',
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(128,90,213,0.5)',
            transition: 'transform 0.15s ease',
            zIndex: 599,
          }}
          title="Support"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          💬
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Hover hook ────────────────────────────────────────────────────────────────
function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

// ─── Course Card ──────────────────────────────────────────────────────────────
function CourseCard({ course }: { course: typeof COURSES[0] }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();
  const [playHovered, setPlayHovered] = useState(false);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        flexShrink: 0,
        width: 196,
        borderRadius: 20,
        overflow: 'hidden',
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-5px) scale(1.015)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? '0 16px 48px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.12)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease',
      }}
    >
      {/* Art panel */}
      <div style={{
        height: 228,
        background: course.gradient,
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        padding: 14,
        overflow: 'hidden',
      }}>
        {/* Decorative large emoji */}
        <div style={{
          position: 'absolute',
          top: 14,
          right: 14,
          fontSize: 52,
          opacity: 0.22,
          transform: hovered ? 'scale(1.12) rotate(6deg)' : 'scale(1) rotate(0deg)',
          transition: 'transform 0.3s ease',
          userSelect: 'none',
        }}>
          {course.emoji}
        </div>

        {/* Stats badge */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: 8,
          padding: '3px 9px',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: 'rgba(255,255,255,0.88)',
          border: '1px solid rgba(255,255,255,0.12)',
          letterSpacing: '0.02em',
        }}>
          {course.modules} Modules · {course.duration}
        </div>

        {/* Play button */}
        <button
          onMouseEnter={() => setPlayHovered(true)}
          onMouseLeave={() => setPlayHovered(false)}
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: playHovered ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255,255,255,0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transform: playHovered ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* Text body */}
      <div style={{ padding: '14px 16px 18px' }}>
        <div style={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.35,
          marginBottom: 5,
          color: 'var(--color-text)',
        }}>
          {course.title}
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: course.accentColor,
          marginBottom: 9,
          opacity: 0.9,
        }}>
          by {course.instructor}
        </div>
        <div style={{
          fontSize: 11.5,
          lineHeight: 1.55,
          color: 'var(--color-muted)',
        }}>
          {course.description}
        </div>
      </div>
    </div>
  );
}

// ─── Earn Card ────────────────────────────────────────────────────────────────
function EarnCard({ entity }: { entity: typeof EARN_ENTITIES[0] }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        flexShrink: 0,
        width: 172,
        borderRadius: 18,
        overflow: 'hidden',
        background: entity.gradient,
        border: `1px solid ${entity.locked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
        opacity: entity.locked ? 0.6 : 1,
        cursor: entity.locked ? 'default' : 'pointer',
        transform: (!entity.locked && hovered) ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.2s ease, opacity 0.2s ease',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height: 88,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 38,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse at center, ${entity.accentColor}18 0%, transparent 70%)`,
        }} />
        {entity.emoji}
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          color: entity.accentColor,
          marginBottom: 5,
          fontWeight: 700,
          letterSpacing: '0.04em',
        }}>
          {entity.name}
        </div>
        <div style={{
          fontSize: 12.5,
          fontWeight: 600,
          lineHeight: 1.35,
          marginBottom: 12,
          color: 'rgba(255,255,255,0.9)',
        }}>
          {entity.title}
        </div>

        {entity.locked ? (
          <button style={{
            width: '100%',
            padding: '7px 0',
            borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            cursor: 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}>
            🔒 Unlock
          </button>
        ) : (
          <button style={{
            width: '100%',
            padding: '7px 0',
            borderRadius: 10,
            background: 'rgba(34,197,94,0.14)',
            border: '1.5px solid rgba(34,197,94,0.35)',
            color: '#22c55e',
            fontSize: 12,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            Earn ${entity.amount}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Lesson Card ──────────────────────────────────────────────────────────────
function LessonCard({ lesson, onStartQuiz }: { lesson: typeof RECOMMENDED[0]; onStartQuiz?: () => void }) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onStartQuiz}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '15px 18px',
        borderRadius: 18,
        background: 'var(--color-card)',
        border: `1px solid ${hovered ? lesson.accentColor + '66' : 'var(--color-border)'}`,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
        boxShadow: hovered ? `0 8px 24px rgba(0,0,0,0.2)` : 'none',
      }}
    >
      <div style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        background: `${lesson.accentColor}18`,
        border: `1.5px solid ${lesson.accentColor}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        transition: 'transform 0.18s ease',
      }}>
        {lesson.emoji}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          marginBottom: 5,
          lineHeight: 1.3,
          color: 'var(--color-text)',
        }}>
          {lesson.title}
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-muted)',
        }}>
          {lesson.duration} · {lesson.quizzes} quiz questions
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Learn() {
  const earnProgress = 4.5;
  const earnPct = (earnProgress / 11) * 100;
  const [dictOpen, setDictOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [quizLesson, setQuizLesson] = useState<{ id: number; title: string; emoji: string; iconBg: string } | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<LearnQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [tip, setTip] = useState<{ quote: string; author: string } | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    api.getDailyTip().then(setTip).catch(() => {});
  }, []);

  // Load user progress on mount so lesson cards show completion badges
  useEffect(() => {
    if (!user?.uid) return;
    api.getLearnProgress(user.uid)
      .then(progress => setCompletedLessons(new Set(progress.map(p => p.lesson_id))))
      .catch(() => {});
  }, [user?.uid]);

  const handleStartQuiz = useCallback(async (id: number, title: string, emoji: string, iconBg: string) => {
    setQuizLesson({ id, title, emoji, iconBg });
    setQuizLoading(true);
    setLibOpen(false);
    try {
      const questions = await api.getLearnQuestions(id);
      setQuizQuestions(questions);
    } catch {
      setQuizQuestions([]);
    }
    setQuizLoading(false);
  }, []);

  const handleQuizComplete = useCallback((score: number, total: number) => {
    if (!user?.uid || !quizLesson) return;
    api.saveLearnProgress(user.uid, quizLesson.id, score, total).catch(() => {});
    setCompletedLessons(prev => new Set([...prev, quizLesson.id]));
  }, [user?.uid, quizLesson]);

  return (
    <>
      {/* Hide scrollbar utility for carousels */}
      <style>{`.learn-hscroll::-webkit-scrollbar { display: none; }`}</style>

      {/* Overlays */}
      {libOpen && (
        <LessonLibraryPanel
          onClose={() => setLibOpen(false)}
          onOpenDict={() => setDictOpen(true)}
          onStartQuiz={handleStartQuiz}
          completedLessons={completedLessons}
        />
      )}
      {dictOpen && <DictionaryPanel onClose={() => setDictOpen(false)} />}
      {quizLesson && !quizLoading && quizQuestions.length > 0 && (
        <QuizModal
          lessonId={quizLesson.id}
          lessonTitle={quizLesson.title}
          lessonEmoji={quizLesson.emoji}
          iconBg={quizLesson.iconBg}
          questions={quizQuestions}
          onClose={() => { setQuizLesson(null); setQuizQuestions([]); }}
          onComplete={handleQuizComplete}
        />
      )}

      {/* Page header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>Learn</h1>
          <p style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 4 }}>
            Courses, lessons, and tools to sharpen your trading edge.
          </p>
        </div>
        <button
          className="terminal-btn"
          style={{ height: 30, paddingLeft: 14, paddingRight: 14, display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setDictOpen(true)}
        >
          <span style={{ fontSize: 13 }}>📖</span>
          Dictionary
        </button>
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* ── Main Content ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 40 }}>

          {/* ① Courses Carousel */}
          <section>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  🌿 Courses by TradeSent
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 5 }}>
                  Structured learning paths to sharpen your edge
                </p>
              </div>
              <button style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-accent)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.85,
                paddingBottom: 2,
              }}>
                View all →
              </button>
            </div>

            <div
              className="learn-hscroll"
              style={{
                display: 'flex',
                gap: 14,
                overflowX: 'auto',
                paddingBottom: 10,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              } as React.CSSProperties}
            >
              {COURSES.map(course => <CourseCard key={course.id} course={course} />)}
            </div>
          </section>

          {/* ② Get Paid To Learn */}
          <section style={{
            borderRadius: 24,
            background: 'linear-gradient(140deg, #0d0a1e 0%, #130d2e 55%, #1a1040 100%)',
            border: '1px solid rgba(139,92,246,0.22)',
            padding: '26px 26px 22px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Glow decoration */}
            <div style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 68%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              bottom: -40,
              left: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(34,197,94,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff', letterSpacing: '-0.01em' }}>
                  💸 Get Paid To Learn
                </h2>
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.45)', marginTop: 5 }}>
                  Complete lessons about companies and earn virtual rewards
                </p>
              </div>
              <button style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: '#a78bfa',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                opacity: 0.85,
              }}>
                View more →
              </button>
            </div>

            {/* Earnings progress bar */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#a78bfa', letterSpacing: '0.04em' }}>
                  EARNINGS PROGRESS
                </span>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.55)' }}>
                  ${earnProgress.toFixed(2)} / $11.00
                </span>
              </div>
              <div style={{
                height: 7,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.07)',
                position: 'relative',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 8,
                  width: `${earnPct}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    right: -5,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 13,
                    height: 13,
                    borderRadius: '50%',
                    background: '#c084fc',
                    border: '2.5px solid #130d2e',
                    boxShadow: '0 0 10px rgba(192,132,252,0.7)',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>$1</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>$11</span>
                </div>
              </div>
            </div>

            {/* Entity cards */}
            <div
              className="learn-hscroll"
              style={{
                display: 'flex',
                gap: 13,
                overflowX: 'auto',
                paddingBottom: 4,
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              } as React.CSSProperties}
            >
              {EARN_ENTITIES.map(e => <EarnCard key={e.id} entity={e} />)}
            </div>
          </section>

          {/* ③ Recommended */}
          <section style={{ paddingBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                ✨ Recommended
              </h2>
              <button
                onClick={() => setLibOpen(true)}
                style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
              >
                View all lessons →
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
              {RECOMMENDED.map(lesson => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  onStartQuiz={() => handleStartQuiz(lesson.id, lesson.title, lesson.emoji, lesson.accentColor)}
                />
              ))}
            </div>
          </section>
        </div>

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <div style={{
          width: 256,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          position: 'sticky',
          top: 0,
        }}>

          {/* Progress stats */}
          <div style={{
            borderRadius: 20,
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            padding: '18px 18px 20px',
          }}>
            <p style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.09em',
              color: 'var(--color-muted)',
              marginBottom: 14,
              textTransform: 'uppercase',
            }}>
              Your Progress
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {/* Lessons completed */}
              <div style={{
                flex: 1,
                borderRadius: 14,
                background: 'rgba(139,92,246,0.08)',
                border: '1px solid rgba(139,92,246,0.2)',
                padding: '14px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>📚</div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#a78bfa',
                  lineHeight: 1,
                  marginBottom: 5,
                }}>7</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                  lessons<br />completed
                </div>
              </div>

              {/* Time spent */}
              <div style={{
                flex: 1,
                borderRadius: 14,
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.2)',
                padding: '14px 10px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>⏱️</div>
                <div style={{
                  fontSize: 24,
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color: '#fb923c',
                  lineHeight: 1,
                  marginBottom: 5,
                }}>43</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-muted)', lineHeight: 1.4 }}>
                  min spent<br />learning
                </div>
              </div>
            </div>
          </div>

          {/* Daily Trivia */}
          <div style={{
            borderRadius: 20,
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            padding: '18px 18px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>🎯 Daily Trivia</h3>
              <button style={{
                padding: '5px 14px',
                borderRadius: 10,
                background: 'rgba(249,115,22,0.12)',
                border: '1.5px solid rgba(249,115,22,0.38)',
                color: '#f97316',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                cursor: 'pointer',
              }}>
                Start
              </button>
            </div>

            <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-muted)', marginBottom: 16 }}>
              Test your knowledge with today's market question.
            </p>

            {/* Streak row */}
            <div style={{
              borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.05))',
              border: '1px solid rgba(249,115,22,0.18)',
              padding: '12px 12px 10px',
            }}>
              <div style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'rgba(249,115,22,0.7)',
                marginBottom: 10,
                letterSpacing: '0.07em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>THIS WEEK</span>
                <span>🔥 3 day streak</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {WEEK_DAYS.map((day, i) => {
                  const done = COMPLETED_DAYS.includes(i);
                  return (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: done ? 13 : 10,
                        background: done ? 'rgba(249,115,22,0.22)' : 'rgba(255,255,255,0.04)',
                        border: done ? '1.5px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.07)',
                        color: done ? '#f97316' : 'rgba(255,255,255,0.25)',
                        marginBottom: 4,
                      }}>
                        {done ? '👁️' : '·'}
                      </div>
                      <div style={{
                        fontSize: 9,
                        fontFamily: 'var(--font-mono)',
                        color: done ? 'rgba(249,115,22,0.7)' : 'rgba(255,255,255,0.3)',
                      }}>
                        {day}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tip of the day */}
          <div style={{
            borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.07), rgba(34,197,94,0.03))',
            border: '1px solid rgba(34,197,94,0.15)',
            padding: '16px 18px',
          }}>
            <div style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: '#22c55e',
              marginBottom: 9,
              fontWeight: 700,
              letterSpacing: '0.07em',
            }}>
              💡 TIP OF THE DAY
            </div>
            <p style={{
              fontSize: 12,
              lineHeight: 1.65,
              color: 'var(--color-muted)',
              margin: 0,
              fontStyle: 'italic',
              opacity: tip ? 1 : 0.4,
              transition: 'opacity 0.4s ease',
            }}>
              "{tip
                ? tip.quote
                : 'Loading today\'s tip…'}"
            </p>
            <div style={{
              marginTop: 8,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
              opacity: 0.6,
            }}>
              {tip ? `— ${tip.author}` : ''}
            </div>
          </div>

          {/* XP / Level widget */}
          <div style={{
            borderRadius: 20,
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>⭐ Level 3</div>
              <div style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-muted)',
              }}>
                240 / 500 XP
              </div>
            </div>
            <div style={{
              height: 5,
              borderRadius: 5,
              background: 'var(--color-surface, rgba(255,255,255,0.06))',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: '48%',
                borderRadius: 5,
                background: 'linear-gradient(90deg, var(--color-accent), #fbbf24)',
              }} />
            </div>
            <p style={{
              fontSize: 11,
              color: 'var(--color-muted)',
              marginTop: 9,
              lineHeight: 1.5,
            }}>
              260 XP to <strong>Level 4</strong> — keep learning!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
