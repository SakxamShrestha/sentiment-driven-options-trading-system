import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../stores/useAccountStore';
import { api } from '../services/api';
import { fmt, plClass, plSign } from '../lib/formatters';
import { STARTING_EQUITY, PORTFOLIO_PERIODS, type PortfolioPeriod } from '../lib/constants';
import { PortfolioAreaChart } from '../components/charts/PortfolioAreaChart';
import { Badge } from '../components/shared/Badge';
import { AnimatedNumber } from '../components/shared/AnimatedNumber';
import { Spinner } from '../components/shared/Spinner';
import type { Position } from '../types';

export default function Home() {
  const { account, positions, setAccount, setPositions } = useAccountStore();
  const [period, setPeriod] = useState<PortfolioPeriod>('1D');
  const navigate = useNavigate();

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

  return (
    <div>
      {/* Portfolio chart card */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex justify-between items-start mb-1">
          <div>
            <div className="text-xs text-muted mb-1">Your portfolio</div>
            <div className="text-[28px] font-bold">
              <AnimatedNumber value={equity} prefix="$" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {account && (
                <Badge variant={totalPl >= 0 ? 'gain' : 'loss'}>
                  {plSign(totalPl)}{fmt(totalPl)} ({plSign(totalPlPct)}{totalPlPct.toFixed(2)}%) all-time
                </Badge>
              )}
              <span className="text-xs text-muted">As of {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {PORTFOLIO_PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-md border text-xs transition-all ${
                  period === p ? 'bg-text text-white border-text' : 'border-border text-muted hover:border-accent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <PortfolioAreaChart period={period} />
      </div>

      {/* Balances */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Balances</div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-[11px] text-muted mb-1">Buying Power</div>
            <div className="text-[15px] font-bold">{fmt(account?.buying_power)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1">Cash</div>
            <div className="text-[15px] font-bold">{fmt(account?.cash)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted mb-1">Daily P&L</div>
            <div className={`text-[15px] font-bold ${plClass(dailyPl)}`}>{fmt(dailyPl)}</div>
          </div>
        </div>
      </div>

      {/* Top Positions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Top Positions</div>
        {!positions.length ? (
          <div className="text-center py-6 text-muted text-sm">
            {account ? 'No open positions · Search a symbol to trade' : <Spinner />}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-semibold text-muted uppercase tracking-wide border-b border-border">
                <th className="text-left px-3 py-2">Symbol</th>
                <th className="text-left px-3 py-2">Qty</th>
                <th className="text-left px-3 py-2">Avg Cost</th>
                <th className="text-left px-3 py-2">Current</th>
                <th className="text-left px-3 py-2">P&L</th>
                <th className="text-left px-3 py-2">P&L %</th>
              </tr>
            </thead>
            <tbody>
              {positions.slice(0, 5).map((p: Position) => {
                const pl = parseFloat(p.unrealized_pl || '0');
                const plPct = parseFloat(p.unrealized_plpc || '0') * 100;
                return (
                  <tr key={p.symbol} className="border-b border-border last:border-0 hover:bg-hover transition-colors">
                    <td className="px-3 py-2.5 font-bold text-blue cursor-pointer hover:underline" onClick={() => navigate(`/stock/${p.symbol}`)}>{p.symbol}</td>
                    <td className="px-3 py-2.5">{p.qty}</td>
                    <td className="px-3 py-2.5">{fmt(p.avg_entry_price)}</td>
                    <td className="px-3 py-2.5">{fmt(p.current_price)}</td>
                    <td className={`px-3 py-2.5 ${plClass(pl)}`}>{fmt(pl)}</td>
                    <td className={`px-3 py-2.5 ${plClass(plPct)}`}>{plSign(plPct)}{plPct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
