import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { fmt, fmtDate, plClass, plSign } from '../lib/formatters';
import { BACKTEST_PERIODS } from '../lib/constants';
import { VirtualTable } from '../components/shared/VirtualTable';
import { Spinner } from '../components/shared/Spinner';
import type { BacktestResult } from '../types';

export default function Backtest() {
  const [symbol, setSymbol] = useState('');
  const [period, setPeriod] = useState('1M');
  const [threshold, setThreshold] = useState(0.01);
  const [notional, setNotional] = useState(5000);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();

  const run = async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setRunning(true);
    setResult(null);
    try {
      setResult(await api.runBacktest(sym, period, threshold, notional));
    } catch { /* ignore */ }
    setRunning(false);
  };

  const inputClass = 'w-full h-[34px] px-2.5 border border-border rounded-lg bg-bg text-sm outline-none focus:border-accent';

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex justify-between items-center mb-5">
        <div className="text-xs font-semibold text-muted uppercase tracking-wide">Strategy Backtester</div>
        <div className="text-[11px] text-muted">Momentum-proxy simulation · paper capital $100,000</div>
      </div>

      <div className="flex gap-3 flex-wrap items-end mb-5">
        <div className="min-w-[140px]">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Symbol</label>
          <input className={`${inputClass} uppercase`} placeholder="e.g. AAPL" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        </div>
        <div className="min-w-[140px]">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Period</label>
          <select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {BACKTEST_PERIODS.map((p) => <option key={p} value={p}>{p === '1W' ? '1 Week' : p === '1M' ? '1 Month' : p === '3M' ? '3 Months' : p === '6M' ? '6 Months' : '1 Year'}</option>)}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Signal Threshold</label>
          <input type="number" step={0.001} min={0.001} max={0.1} className={inputClass} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
        </div>
        <div className="min-w-[140px]">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-1 block">Notional / Trade ($)</label>
          <input type="number" step={500} min={100} className={inputClass} value={notional} onChange={(e) => setNotional(Number(e.target.value))} />
        </div>
        <button onClick={run} disabled={running}
          className="h-[34px] px-5 rounded-lg bg-accent text-white text-sm font-bold whitespace-nowrap disabled:opacity-45 hover:opacity-90 transition-opacity">
          {running ? '⟳ Running…' : '▶ Run Backtest'}
        </button>
      </div>

      {running && <div className="text-center py-8 text-muted text-sm"><Spinner /> Fetching bars and simulating…</div>}

      {result && !running && (
        <div>
          {result.error ? (
            <div className="text-center py-6 text-muted text-sm">{result.error}</div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3 mb-5 max-md:grid-cols-2">
                {[
                  ['Total Return', `${plSign(result.total_return_pct)}${result.total_return_pct.toFixed(2)}%`, result.total_return_pct >= 0],
                  ['Win Rate', `${result.win_rate.toFixed(1)}%`, true],
                  ['Max Drawdown', `${result.max_drawdown_pct.toFixed(2)}%`, result.max_drawdown_pct <= 5],
                  ['Trades', String(result.trade_count), true],
                  ['Bars Analysed', String(result.bars_count), true],
                  ['Starting Capital', fmt(result.starting_equity), true],
                  ['Final Equity', fmt(result.final_equity), result.total_return_pct >= 0],
                  ['Period / Symbol', `${result.symbol} · ${result.period}`, true],
                ].map(([label, val, pos], i) => (
                  <div key={i} className="border border-border rounded-xl p-3.5">
                    <div className="text-[11px] text-muted mb-1">{label as string}</div>
                    <div className={`text-xl font-bold ${i < 3 || i === 6 ? (pos ? 'text-gain' : 'text-loss') : ''}`} style={i === 7 ? { fontSize: 14 } : undefined}>{val as string}</div>
                  </div>
                ))}
              </div>

              {result.trades.length ? (
                <>
                  <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Trade Log</div>
                  <VirtualTable
                    data={result.trades}
                    onRowClick={(t) => navigate(`/stock/${t.symbol}`)}
                    columns={[
                      { header: 'Symbol', accessor: (t) => <span className="font-bold text-blue">{t.symbol}</span> },
                      { header: 'Entry', accessor: (t) => <span className="text-[11px]">{fmtDate(t.entry_time)}</span> },
                      { header: 'Exit', accessor: (t) => <span className="text-[11px]">{fmtDate(t.exit_time)}</span> },
                      { header: 'Shares', accessor: (t) => t.shares },
                      { header: 'Entry $', accessor: (t) => fmt(t.entry_price) },
                      { header: 'Exit $', accessor: (t) => fmt(t.exit_price) },
                      { header: 'P&L', accessor: (t) => <span className={plClass(t.pnl)}>{plSign(t.pnl)}{fmt(t.pnl)}</span> },
                      { header: 'P&L %', accessor: (t) => <span className={plClass(t.pnl_pct)}>{plSign(t.pnl_pct)}{t.pnl_pct.toFixed(3)}%</span> },
                      { header: 'Bars', accessor: (t) => t.bars_held },
                      { header: 'Reason', accessor: (t) => <span className="text-[11px] text-muted">{t.exit_reason}</span> },
                    ]}
                  />
                </>
              ) : (
                <div className="text-center py-4 text-muted text-sm mt-3">No trades triggered — try lowering the signal threshold</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
