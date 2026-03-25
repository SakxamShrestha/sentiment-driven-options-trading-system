import { useState, useEffect, useCallback } from 'react';
import { useAccountStore } from '../stores/useAccountStore';
import { api } from '../services/api';
import { fmt, plClass, plSign } from '../lib/formatters';
import { STARTING_EQUITY, PORTFOLIO_PERIODS, type PortfolioPeriod } from '../lib/constants';
import { PortfolioAreaChart } from '../components/charts/PortfolioAreaChart';
import { AnimatedNumber } from '../components/shared/AnimatedNumber';
import { motion } from 'framer-motion';

function IconWallet() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" />
      <path d="M16 12h5" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function IconPercent() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

function IconTrend() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
});

export default function Home() {
  const { account, setAccount, setPositions } = useAccountStore();
  const [period, setPeriod] = useState<PortfolioPeriod>('1D');

  const refresh = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([api.getAccount(), api.getPositions()]);
      setAccount(a);
      setPositions(p);
    } catch { /* ignore */ }
  }, [setAccount, setPositions]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  const equity = parseFloat(account?.equity ?? '0');
  const totalPl = equity - STARTING_EQUITY;
  const totalPlPct = (totalPl / STARTING_EQUITY) * 100;
  const dailyPl = equity - parseFloat(account?.last_equity ?? String(equity));
  const dailyPlPct = equity - dailyPl !== 0 ? (dailyPl / (equity - dailyPl)) * 100 : 0;
  const isUp = dailyPl >= 0;

  return (
    <div className="max-w-4xl space-y-5">

      {/* ── Hero card ───────────────────────────────────────────────── */}
      <motion.div {...fade(0)}>
        <div
          className="terminal-card p-6 md:p-7"
          style={{ borderLeft: '3px solid var(--color-accent)' }}
        >
          <div className="flex flex-col gap-4">
            {/* Equity hero */}
            <div>
              <div className="text-[10px] font-mono font-semibold text-muted uppercase tracking-widest mb-1.5">
                Portfolio Value
              </div>
              <div className="text-4xl md:text-5xl font-bold font-mono leading-none tracking-tight">
                <AnimatedNumber value={equity} prefix="$" />
              </div>
            </div>

            {/* Daily P&L row */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-semibold font-mono ${
                isUp ? 'bg-gain-soft text-gain' : 'bg-loss-soft text-loss'
              }`}>
                {isUp ? '▲' : '▼'} {plSign(dailyPl)}{fmt(Math.abs(dailyPl))}
              </span>
              <span className="text-xs font-mono text-muted">
                {plSign(dailyPlPct)}{dailyPlPct.toFixed(2)}% today
              </span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">
                Started at {fmt(STARTING_EQUITY)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <motion.div {...fade(0.08)}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* Total Equity */}
          <div className="terminal-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Total Equity</span>
              <span className="text-accent"><IconTrend /></span>
            </div>
            <div>
              <div className="text-lg font-mono font-bold tabular-nums">{fmt(account?.equity)}</div>
              <div className="text-xs text-muted mt-0.5">Portfolio balance</div>
            </div>
          </div>

          {/* Buying Power */}
          <div className="terminal-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Buying Power</span>
              <span className="text-accent"><IconWallet /></span>
            </div>
            <div>
              <div className="text-lg font-mono font-bold tabular-nums">{fmt(account?.buying_power)}</div>
              <div className="text-xs text-muted mt-0.5">Available capital</div>
            </div>
          </div>

          {/* Daily P&L */}
          <div className="terminal-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Daily P&amp;L</span>
              <span className={dailyPl >= 0 ? 'text-gain' : 'text-loss'}><IconBarChart /></span>
            </div>
            <div>
              <div className={`text-lg font-mono font-bold tabular-nums ${plClass(dailyPl)}`}>
                {plSign(dailyPl)}{fmt(Math.abs(dailyPl))}
              </div>
              <div className="text-xs text-muted mt-0.5">{plSign(dailyPlPct)}{dailyPlPct.toFixed(2)}% change</div>
            </div>
          </div>

          {/* Total Return */}
          <div className="terminal-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted uppercase tracking-widest">Total Return</span>
              <span className={totalPlPct >= 0 ? 'text-gain' : 'text-loss'}><IconPercent /></span>
            </div>
            <div>
              <div className={`text-lg font-mono font-bold tabular-nums ${plClass(totalPlPct)}`}>
                {plSign(totalPlPct)}{totalPlPct.toFixed(2)}%
              </div>
              <div className="text-xs text-muted mt-0.5">{plSign(totalPl)}{fmt(Math.abs(totalPl))} all-time</div>
            </div>
          </div>

        </div>
      </motion.div>

      {/* ── Chart card ──────────────────────────────────────────────── */}
      <motion.div {...fade(0.16)}>
        <div className="terminal-card overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold font-mono">Portfolio Performance</span>
              <span className="text-[10px] text-muted font-mono uppercase tracking-widest hidden sm:block">Equity curve</span>
            </div>
            <div className="flex items-center gap-1">
              {PORTFOLIO_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-mono font-medium transition-colors duration-150 ${
                    period === p
                      ? 'bg-accent text-bg'
                      : 'text-muted hover:text-text hover:bg-hover'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <PortfolioAreaChart period={period} height={260} />
        </div>
      </motion.div>

    </div>
  );
}
