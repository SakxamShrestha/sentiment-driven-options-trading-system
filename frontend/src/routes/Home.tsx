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
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8">

      {/* ── Hero card ───────────────────────────────────────────────── */}
      <motion.div {...fade(0)}>
        <div
          className="relative overflow-hidden rounded-2xl p-6 md:p-7"
          style={{
            background: 'linear-gradient(135deg, #0b1326 0%, #0f1a36 45%, #131b2e 100%)',
            boxShadow: '0 8px 40px rgba(56,97,251,0.10), 0 2px 8px rgba(0,0,0,0.5)',
            border: '1px solid rgba(56,97,251,0.12)',
          }}
        >
          {/* Subtle depth orbs */}
          <div
            className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(56,97,251,0.14) 0%, transparent 65%)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-8 -left-8 w-48 h-48 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(107,138,253,0.08) 0%, transparent 70%)' }}
          />

          <div className="relative z-10 flex flex-col gap-4">
            {/* Live badge */}
            <div
              className="inline-flex items-center gap-2 w-fit px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(56,97,251,0.12)', color: '#b8c3ff', border: '1px solid rgba(56,97,251,0.22)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#4ade80' }} />
              Paper Trading — TradeSent.AI
            </div>

            {/* Equity hero */}
            <div>
              <div className="text-xs font-medium mb-1.5 tracking-wider uppercase" style={{ color: 'rgba(184,195,255,0.55)' }}>
                Portfolio Value
              </div>
              <div className="text-4xl md:text-5xl font-bold font-mono leading-none tracking-tight text-white">
                <AnimatedNumber value={equity} prefix="$" />
              </div>
            </div>

            {/* Daily P&L row */}
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono"
                style={{
                  background: isUp ? 'rgba(34,197,94,0.18)' : 'rgba(239,68,68,0.18)',
                  color: isUp ? '#4ade80' : '#f87171',
                  border: `1px solid ${isUp ? 'rgba(74,222,128,0.28)' : 'rgba(248,113,113,0.28)'}`,
                }}
              >
                {isUp ? '▲' : '▼'} {plSign(dailyPl)}{fmt(Math.abs(dailyPl))}
              </span>
              <span className="text-xs font-mono" style={{ color: 'rgba(184,195,255,0.55)' }}>
                {plSign(dailyPlPct)}{dailyPlPct.toFixed(2)}% today
              </span>
              <span className="text-xs" style={{ color: 'rgba(184,195,255,0.35)' }}>·</span>
              <span className="text-xs" style={{ color: 'rgba(184,195,255,0.45)' }}>
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
          <div className="card-elevated p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium uppercase tracking-wide">Total Equity</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(56,97,251,0.12)', color: '#6b8afd' }}
              >
                <IconTrend />
              </div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold tabular-nums">{fmt(account?.equity)}</div>
              <div className="text-xs text-muted mt-0.5">Portfolio balance</div>
            </div>
          </div>

          {/* Buying Power */}
          <div className="card-elevated p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium uppercase tracking-wide">Buying Power</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(56,97,251,0.12)', color: '#6b8afd' }}
              >
                <IconWallet />
              </div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold tabular-nums">{fmt(account?.buying_power)}</div>
              <div className="text-xs text-muted mt-0.5">Available capital</div>
            </div>
          </div>

          {/* Daily P&L */}
          <div className="card-elevated p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium uppercase tracking-wide">Daily P&amp;L</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: dailyPl >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  color: dailyPl >= 0 ? '#4ade80' : '#f87171',
                }}
              >
                <IconBarChart />
              </div>
            </div>
            <div>
              <div className={`text-lg font-mono font-bold tabular-nums ${plClass(dailyPl)}`}>
                {plSign(dailyPl)}{fmt(Math.abs(dailyPl))}
              </div>
              <div className="text-xs text-muted mt-0.5">{plSign(dailyPlPct)}{dailyPlPct.toFixed(2)}% change</div>
            </div>
          </div>

          {/* Total Return */}
          <div className="card-elevated p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted font-medium uppercase tracking-wide">Total Return</span>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: totalPlPct >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  color: totalPlPct >= 0 ? '#4ade80' : '#f87171',
                }}
              >
                <IconPercent />
              </div>
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
        <div className="card-elevated overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">Portfolio Performance</span>
              <span className="text-xs text-muted hidden sm:block">Equity curve</span>
            </div>
            <div className="flex items-center gap-1">
              {PORTFOLIO_PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all duration-200 ${
                    period === p
                      ? 'bg-accent text-white shadow-sm'
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
