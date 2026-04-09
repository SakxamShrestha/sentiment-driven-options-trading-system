import { useState, useEffect, useCallback } from 'react';
import { useAccountStore } from '../stores/useAccountStore';
import { api } from '../services/api';
import { fmt, plSign, plClass } from '../lib/formatters';
import { STARTING_EQUITY, PORTFOLIO_PERIODS, type PortfolioPeriod } from '../lib/constants';
import { PortfolioAreaChart } from '../components/charts/PortfolioAreaChart';
import { AnimatedNumber } from '../components/shared/AnimatedNumber';
import { motion, AnimatePresence } from 'framer-motion';
import type { SentimentArticle } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const NEWS_TICKERS = ['SPY', 'AAPL', 'TSLA', 'NVDA'] as const;
type NewsTicker = (typeof NEWS_TICKERS)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function sentimentMeta(score: number | null | undefined) {
  const s = score ?? 0;
  if (s >= 0.2)  return { label: 'BULLISH', color: 'var(--color-gain)', bg: 'var(--color-gain-soft)' };
  if (s <= -0.2) return { label: 'BEARISH', color: 'var(--color-loss)', bg: 'var(--color-loss-soft)' };
  return           { label: 'NEUTRAL',  color: 'var(--color-muted)', bg: 'var(--color-hover)' };
}

// ── News Article Card ─────────────────────────────────────────────────────────

interface NewsItem extends SentimentArticle {
  ticker: NewsTicker;
}

function NewsCard({ item, delay }: { item: NewsItem; delay: number }) {
  const s    = item.score ?? 0;
  const sent = sentimentMeta(s);

  const thumbBg = s >= 0.2
    ? 'rgba(22,163,74,0.07)'
    : s <= -0.2
    ? 'rgba(220,38,38,0.07)'
    : 'var(--color-surface)';
  const thumbBorderColor = s >= 0.2
    ? 'rgba(22,163,74,0.18)'
    : s <= -0.2
    ? 'rgba(220,38,38,0.18)'
    : 'var(--color-border)';

  const directionArrow = s >= 0.2 ? '▲' : s <= -0.2 ? '▼' : '–';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: 'easeOut' }}
      className="flex gap-5 px-6 py-7 border-b border-border last:border-0 cursor-pointer group transition-colors duration-150"
      onClick={() => item.url && window.open(item.url, '_blank')}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >

      {/* ── Left: text stack ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">

        {/* Source · time — top anchor */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-medium text-muted">
            {item.source}
          </span>
          {item.created_at && (
            <span className="text-[11px] font-mono text-muted" style={{ opacity: 0.5 }}>
              {timeAgo(item.created_at)}
            </span>
          )}
        </div>

        {/* Headline — primary content */}
        <h3 className="text-[14px] font-semibold leading-[1.45] line-clamp-2 group-hover:opacity-70 transition-opacity duration-150">
          {item.headline || '(no headline)'}
        </h3>

        {/* Contextual asset info — bottom left */}
        <div className="flex items-center gap-2.5 mt-1">
          <span
            className="text-[11px] font-mono font-bold"
            style={{ color: 'var(--color-accent)' }}
          >
            {item.ticker}
          </span>
          <span
            className="text-[11px] font-mono font-medium tabular-nums"
            style={{ color: sent.color }}
          >
            {directionArrow} {Math.abs(s).toFixed(3)}
          </span>
          <span
            className="text-[10px] font-mono font-semibold px-1.5 py-[2px]"
            style={{ background: sent.bg, color: sent.color, borderRadius: 2 }}
          >
            {sent.label}
          </span>
          {item.url && (
            <span
              className="ml-auto text-[11px] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ color: 'var(--color-accent)' }}
            >
              Read →
            </span>
          )}
        </div>
      </div>

      {/* ── Right: thumbnail placeholder ─────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-center overflow-hidden self-center"
        style={{
          width: 88,
          height: 66,
          borderRadius: 3,
          background: thumbBg,
          border: `1px solid ${thumbBorderColor}`,
        }}
      >
        <span
          className="font-mono font-black select-none tabular-nums"
          style={{ fontSize: 17, letterSpacing: '-0.04em', color: sent.color, opacity: 0.3 }}
        >
          {item.ticker}
        </span>
      </div>

    </motion.div>
  );
}

function NewsSkeletonCard() {
  return (
    <div className="flex gap-5 px-6 py-7 border-b border-border">
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="h-2.5 w-28 rounded-sm animate-shimmer" style={{ background: 'var(--color-hover)' }} />
        <div className="h-4 w-full rounded-sm animate-shimmer" style={{ background: 'var(--color-hover)' }} />
        <div className="h-4 w-3/4 rounded-sm animate-shimmer" style={{ background: 'var(--color-hover)' }} />
        <div className="h-3.5 w-36 rounded-sm animate-shimmer mt-0.5" style={{ background: 'var(--color-hover)' }} />
      </div>
      <div
        className="shrink-0 self-center rounded-sm animate-shimmer"
        style={{ width: 88, height: 66, background: 'var(--color-hover)' }}
      />
    </div>
  );
}

// ── Page entry animation helper ───────────────────────────────────────────────

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Home() {
  const { account, setAccount, setPositions } = useAccountStore();
  const [period, setPeriod]               = useState<PortfolioPeriod>('1D');
  const [bpOpen, setBpOpen]               = useState(false);
  const [news, setNews]                   = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading]     = useState(false);
  const [newsLoaded, setNewsLoaded]       = useState(false);

  // ── Fetching ────────────────────────────────────────────────────────────────

  const refreshAccount = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([api.getAccount(), api.getPositions()]);
      setAccount(a);
      setPositions(p);
    } catch { /* ignore */ }
  }, [setAccount, setPositions]);


  const fetchNews = useCallback(async () => {
    if (newsLoaded) return;
    setNewsLoading(true);
    try {
      const results = await Promise.allSettled(
        NEWS_TICKERS.map((sym) => api.getSentiment(sym, 5))
      );
      const items: NewsItem[] = [];
      const seen = new Set<string>();
      results.forEach((r, i) => {
        if (r.status !== 'fulfilled') return;
        r.value.articles.forEach((a) => {
          const key = a.article_id || a.headline;
          if (!key || seen.has(key)) return;
          seen.add(key);
          items.push({ ...a, ticker: NEWS_TICKERS[i] });
        });
      });
      items.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
      setNews(items);
      setNewsLoaded(true);
    } catch { /* ignore */ }
    setNewsLoading(false);
  }, [newsLoaded]);

  useEffect(() => {
    refreshAccount();
    const id = setInterval(refreshAccount, 10_000);
    return () => clearInterval(id);
  }, [refreshAccount]);

  useEffect(() => {
    const t = setTimeout(fetchNews, 800);
    return () => clearTimeout(t);
  }, [fetchNews]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const equity      = parseFloat(account?.equity       ?? '0');
  const totalPl     = equity - STARTING_EQUITY;
  const totalPlPct  = (totalPl / STARTING_EQUITY) * 100;
  const lastEquity  = parseFloat(account?.last_equity  ?? String(equity));
  const dailyPl     = equity - lastEquity;
  const dailyPlPct  = lastEquity !== 0 ? (dailyPl / lastEquity) * 100 : 0;
  const isUp        = dailyPl >= 0;


  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <motion.div {...fade(0)} className="mb-6">
        <div className="terminal-card overflow-hidden" style={{ borderLeft: '3px solid var(--color-accent)' }}>

          {/* Main hero content */}
          <div className="p-7 md:p-9">
            {/* Account label row */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[9px] font-mono tracking-[0.25em] text-muted uppercase">
                Individual
              </span>
              <span className="text-muted opacity-30 text-[10px]">·</span>
              <span
                className="inline-flex items-center gap-1.5 text-[9px] font-mono tracking-widest"
                style={{ color: 'var(--color-gain)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse shrink-0" />
                Paper Trading
              </span>
            </div>

            {/* Equity number */}
            <div className="text-4xl md:text-5xl font-bold font-mono leading-none tracking-tight mb-5">
              <AnimatedNumber value={equity} prefix="$" />
            </div>

            {/* P&L row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold font-mono"
                style={{
                  borderRadius: 2,
                  background: isUp ? 'var(--color-gain-soft)' : 'var(--color-loss-soft)',
                  color:      isUp ? 'var(--color-gain)'      : 'var(--color-loss)',
                }}
              >
                {isUp ? '▲' : '▼'} {plSign(dailyPl)}{fmt(Math.abs(dailyPl))} today
              </span>
              <span className="text-xs font-mono text-muted">
                {plSign(dailyPlPct)}{dailyPlPct.toFixed(2)}%
              </span>
              <span className="text-muted opacity-30 text-xs">·</span>
              <span className="text-xs font-mono text-muted">
                All-time{' '}
                <span className={plClass(totalPl)}>
                  {plSign(totalPl)}{fmt(Math.abs(totalPl))}
                </span>
                <span style={{ opacity: 0.55 }}>
                  {' '}({plSign(totalPlPct)}{totalPlPct.toFixed(2)}%)
                </span>
              </span>
            </div>
          </div>

          {/* Collapsible buying power */}
          <div className="border-t border-border">
            <button
              className="w-full flex items-center justify-between px-7 py-4 text-xs font-mono text-muted hover:bg-hover transition-colors duration-150"
              onClick={() => setBpOpen((o) => !o)}
            >
              <span className="uppercase tracking-[0.2em]">Buying Power</span>
              <div className="flex items-center gap-3">
                <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
                  {fmt(account?.buying_power)}
                </span>
                <svg
                  className="w-3 h-3 transition-transform duration-200"
                  style={{ transform: bpOpen ? 'rotate(180deg)' : 'none' }}
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </button>

            <AnimatePresence>
              {bpOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="grid grid-cols-2 md:grid-cols-4"
                    style={{ borderTop: '1px solid var(--color-border)', gap: 1, background: 'var(--color-border)' }}
                  >
                    {[
                      { label: 'Buying Power',  value: fmt(account?.buying_power) },
                      { label: 'Cash',          value: fmt(account?.cash) },
                      { label: 'Reg-T Margin',  value: fmt(account?.regt_buying_power) },
                      { label: 'Day Trade BP',  value: fmt(account?.daytrading_buying_power) },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-6 py-5" style={{ background: 'var(--color-card)' }}>
                        <div className="text-[9px] font-mono text-muted uppercase tracking-widest mb-2">{label}</div>
                        <div className="text-sm font-mono font-semibold tabular-nums">{value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── CHART ────────────────────────────────────────────────────────────── */}
      <motion.div {...fade(0.08)} className="mb-6">
        <div className="terminal-card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold font-mono tracking-wide">
                Portfolio Performance
              </span>
              <span className="text-[9px] text-muted font-mono uppercase tracking-widest hidden sm:block">
                Equity curve
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {PORTFOLIO_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-2.5 py-1 text-xs font-mono font-medium transition-all duration-150"
                  style={{
                    borderRadius: 2,
                    background: period === p ? 'var(--color-accent)' : 'transparent',
                    color:      period === p ? '#09090b'              : 'var(--color-muted)',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <PortfolioAreaChart period={period} height={300} />
        </div>
      </motion.div>

      {/* ── STATS STRIP ──────────────────────────────────────────────────────── */}
      <motion.div {...fade(0.14)} className="mb-10">
        <div
          className="grid grid-cols-2 md:grid-cols-4 rounded-sm overflow-hidden"
          style={{ border: '1px solid var(--color-border)', gap: 1, background: 'var(--color-border)' }}
        >
          {[
            {
              label: 'Total Equity',
              value: fmt(account?.equity),
              sub:   'Portfolio balance',
              color: undefined,
            },
            {
              label: 'Long Value',
              value: fmt(account?.long_market_value),
              sub:   'Invested capital',
              color: undefined,
            },
            {
              label: 'Daily P&L',
              value: `${plSign(dailyPl)}${fmt(Math.abs(dailyPl))}`,
              sub:   `${plSign(dailyPlPct)}${dailyPlPct.toFixed(2)}% today`,
              color: plClass(dailyPl),
            },
            {
              label: 'Total Return',
              value: `${plSign(totalPlPct)}${totalPlPct.toFixed(2)}%`,
              sub:   `${plSign(totalPl)}${fmt(Math.abs(totalPl))} from $100K`,
              color: plClass(totalPl),
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-5 py-5" style={{ background: 'var(--color-card)' }}>
              <div className="text-[9px] font-mono text-muted uppercase tracking-widest mb-2.5">{label}</div>
              <div className={`text-base font-mono font-bold tabular-nums ${color ?? ''}`}>{value}</div>
              <div className="text-[10px] text-muted mt-1.5">{sub}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── MARKET PULSE SECTION ─────────────────────────────────────────────── */}
      <motion.div {...fade(0.2)}>

        {/* Section header */}
        <div className="mb-6 pt-2">
          <h2 className="text-[22px] font-mono font-bold tracking-[0.18em] uppercase"
              style={{ letterSpacing: '0.15em' }}>
            NEWS
          </h2>
          <div className="mt-2 h-[2px] w-12" style={{ background: 'var(--color-accent)' }} />
        </div>

        <div className="terminal-card overflow-hidden">

          {/* News feed */}

          {/* News feed */}
          <div>
            {/* Loading skeletons */}
            {newsLoading && !newsLoaded && (
              <>
                {[...Array(6)].map((_, i) => (
                  <NewsSkeletonCard key={i} />
                ))}
              </>
            )}

            {/* Empty state */}
            {newsLoaded && news.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <div
                  className="w-10 h-10 border flex items-center justify-center"
                  style={{ borderRadius: 2, borderColor: 'var(--color-border)', opacity: 0.3 }}
                >
                  <svg
                    className="w-5 h-5"
                    style={{ color: 'var(--color-muted)' }}
                    fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z"
                    />
                  </svg>
                </div>
                <p className="text-[10px] font-mono text-muted tracking-[0.3em] uppercase">
                  No news available
                </p>
                <p className="text-[11px] text-muted" style={{ opacity: 0.5 }}>
                  Start the backend to load headlines
                </p>
              </div>
            )}

            {/* Article cards */}
            {news.map((item, i) => (
              <NewsCard
                key={item.article_id || `${item.ticker}-${i}`}
                item={item}
                delay={i * 0.035}
              />
            ))}
          </div>
        </div>
      </motion.div>

    </div>
  );
}
