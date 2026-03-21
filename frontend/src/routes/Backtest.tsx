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

  const inputClass = 'w-full h-9 px-3 border border-border rounded-xl bg-bg text-sm font-mono outline-none focus:border-muted transition-all duration-200';

  return (
    <div className="max-w-[1100px]">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-lg font-bold">Backtester</h1>
        <span className="text-xs text-muted font-mono">Momentum-proxy</span>
      </div>

      <div className="card-elevated p-5">
        <div className="flex gap-3 flex-wrap items-end mb-5">
          <div className="min-w-[130px] flex-1">
            <label className="text-xs text-muted mb-1.5 block">Symbol</label>
            <input className={`${inputClass} uppercase`} placeholder="AAPL" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="text-xs text-muted mb-1.5 block">Period</label>
            <select className={inputClass} value={period} onChange={(e) => setPeriod(e.target.value)}>
              {BACKTEST_PERIODS.map((p) => <option key={p} value={p}>{p === '1W' ? '1 Week' : p === '1M' ? '1 Month' : p === '3M' ? '3 Months' : p === '6M' ? '6 Months' : '1 Year'}</option>)}
            </select>
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="text-xs text-muted mb-1.5 block">Threshold</label>
            <input type="number" step={0.001} min={0.001} max={0.1} className={inputClass} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="text-xs text-muted mb-1.5 block">Notional ($)</label>
            <input type="number" step={500} min={100} className={inputClass} value={notional} onChange={(e) => setNotional(Number(e.target.value))} />
          </div>
          <button onClick={run} disabled={running}
            className="h-9 px-5 rounded-xl bg-text text-bg text-sm font-medium whitespace-nowrap disabled:opacity-40 hover:opacity-90 transition-opacity">
            {running ? 'Running...' : 'Run'}
          </button>
        </div>

        {running && <div className="text-center py-8 text-muted text-sm"><Spinner /> Simulating...</div>}

        {result && !running && (
          <div>
            {result.error ? (
              <div className="text-center py-6 text-muted text-sm">{result.error}</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    ['Return', `${plSign(result.total_return_pct)}${result.total_return_pct.toFixed(2)}%`, result.total_return_pct >= 0],
                    ['Win Rate', `${result.win_rate.toFixed(1)}%`, true],
                    ['Max DD', `${result.max_drawdown_pct.toFixed(2)}%`, result.max_drawdown_pct <= 5],
                    ['Trades', String(result.trade_count), true],
                    ['Bars', String(result.bars_count), true],
                    ['Start $', fmt(result.starting_equity), true],
                    ['End $', fmt(result.final_equity), result.total_return_pct >= 0],
                    ['Ticker', `${result.symbol} · ${result.period}`, true],
                  ].map(([label, val, pos], i) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <div className="text-xs text-muted mb-1">{label as string}</div>
                      <div className={`text-base font-semibold font-mono ${i < 3 || i === 6 ? (pos ? 'text-gain' : 'text-loss') : ''}`} style={i === 7 ? { fontSize: 13 } : undefined}>{val as string}</div>
                    </div>
                  ))}
                </div>

                {result.trades.length ? (
                  <>
                    <div className="text-xs font-mono text-muted tracking-wider uppercase mb-3">Trade Log</div>
                    <VirtualTable
                      data={result.trades}
                      onRowClick={(t) => navigate(`/stock/${t.symbol}`)}
                      columns={[
                        { header: 'Symbol', accessor: (t) => <span className="font-semibold font-mono">{t.symbol}</span> },
                        { header: 'Entry', accessor: (t) => <span className="text-xs font-mono text-muted">{fmtDate(t.entry_time)}</span> },
                        { header: 'Exit', accessor: (t) => <span className="text-xs font-mono text-muted">{fmtDate(t.exit_time)}</span> },
                        { header: 'Shares', accessor: (t) => <span className="font-mono">{t.shares}</span> },
                        { header: 'Entry $', accessor: (t) => <span className="font-mono">{fmt(t.entry_price)}</span> },
                        { header: 'Exit $', accessor: (t) => <span className="font-mono">{fmt(t.exit_price)}</span> },
                        { header: 'P&L', accessor: (t) => <span className={`font-mono ${plClass(t.pnl)}`}>{plSign(t.pnl)}{fmt(t.pnl)}</span> },
                        { header: 'P&L %', accessor: (t) => <span className={`font-mono ${plClass(t.pnl_pct)}`}>{plSign(t.pnl_pct)}{t.pnl_pct.toFixed(3)}%</span> },
                        { header: 'Bars', accessor: (t) => <span className="font-mono">{t.bars_held}</span> },
                        { header: 'Reason', accessor: (t) => <span className="text-xs text-muted">{t.exit_reason}</span> },
                      ]}
                    />
                  </>
                ) : (
                  <div className="text-center py-4 text-muted text-sm">No trades triggered — try lowering the threshold</div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
