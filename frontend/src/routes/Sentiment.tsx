import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSentimentStore } from '../stores/useSentimentStore';
import { useToastStore } from '../stores/useToastStore';
import { Spinner } from '../components/shared/Spinner';
import { Badge } from '../components/shared/Badge';
import { fmtDateShort } from '../lib/formatters';
import type { SentimentResult, LunarCrushBuzz } from '../types';

type Model = 'finbert' | 'llama3';

export default function Sentiment() {
  const { cbTripped, setCbTripped } = useSentimentStore();
  const toast = useToastStore((s) => s.show);
  const [model, setModel] = useState<Model>('finbert');
  const [ticker, setTicker] = useState('');
  const [result, setResult] = useState<SentimentResult | null>(null);
  const [buzz, setBuzz] = useState<LunarCrushBuzz | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [liveSent, setLiveSent] = useState<Record<string, unknown> | null>(null);

  const loadCb = useCallback(async () => {
    try {
      const d = await api.getCircuitBreaker();
      setCbTripped(d.tripped);
    } catch { /* ignore */ }
  }, [setCbTripped]);

  const toggleCb = async () => {
    try {
      const d = await api.setCircuitBreaker(!cbTripped);
      setCbTripped(d.tripped);
      toast(d.tripped ? 'Circuit breaker TRIPPED' : 'Circuit breaker cleared', d.tripped ? 'error' : 'success');
    } catch { toast('Failed to update circuit breaker', 'error'); }
  };

  const analyze = async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setAnalyzing(true);
    setResult(null);
    setBuzz(null);
    try {
      const d = model === 'llama3'
        ? await api.getSentimentLlama(t, 6)
        : await api.getSentiment(t, 12);
      setResult(d);
      api.getLunarCrush(t).then(setBuzz).catch(() => {});
    } catch { /* ignore */ }
    setAnalyzing(false);
  };

  useEffect(() => {
    loadCb();
    api.getLiveSentiment().then(setLiveSent).catch(() => {});
  }, [loadCb]);

  const avg = result?.average_score;
  const chipVariant: 'gain' | 'loss' | 'neutral' =
    avg === null || avg === undefined ? 'neutral' : avg >= 0.2 ? 'gain' : avg <= -0.2 ? 'loss' : 'neutral';
  const chipLabel = avg === null || avg === undefined ? 'No data' : avg >= 0.2 ? 'Bullish' : avg <= -0.2 ? 'Bearish' : 'Neutral';

  return (
    <div>
      {/* Circuit Breaker */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium border ${
        cbTripped ? 'bg-loss-soft border-loss/30 text-loss' : 'bg-gain-soft border-gain/30 text-gain'
      }`}>
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="12" y1="20" x2="12.01" y2="20" />
        </svg>
        <span>{cbTripped ? 'Circuit Breaker: TRIPPED — all signals paused (HOLD only)' : 'Circuit Breaker: OFF — signals are active'}</span>
        <button onClick={toggleCb}
          className={`ml-auto px-3.5 py-1 rounded-md text-xs font-bold text-white transition-opacity hover:opacity-85 ${cbTripped ? 'bg-gain' : 'bg-loss'}`}>
          {cbTripped ? 'Clear Breaker' : 'Trip Breaker'}
        </button>
      </div>

      {/* Sentiment Lookup */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">AI Sentiment Lookup</div>
          <div className="flex border border-border rounded-lg overflow-hidden">
            {(['finbert', 'llama3'] as Model[]).map((m) => (
              <button key={m} onClick={() => setModel(m)}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${model === m ? 'bg-text text-white' : 'text-muted hover:bg-hover'}`}>
                {m === 'finbert' ? 'FinBERT' : 'Llama 3'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5 mb-4">
          <input
            className="flex-1 h-9 px-3 border border-border rounded-lg text-sm outline-none focus:border-accent"
            placeholder="Enter ticker symbol (e.g. AAPL, NIO, TSLA)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
          />
          <button onClick={analyze} disabled={analyzing}
            className="h-9 px-5 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity">
            Analyze
          </button>
        </div>

        {analyzing && <div className="text-center py-6 text-muted text-sm"><Spinner /> Analyzing with {model === 'llama3' ? 'Llama 3' : 'FinBERT'}…</div>}

        {result && !analyzing && (
          <div>
            <div className="flex items-baseline gap-3 flex-wrap mb-4">
              <span className={`text-4xl font-bold ${avg !== null && avg !== undefined && avg >= 0 ? 'text-gain' : 'text-loss'}`}>
                {avg !== null && avg !== undefined ? avg.toFixed(3) : '–'}
              </span>
              <Badge variant={chipVariant}>{chipLabel}</Badge>
              <span className="text-xs text-muted">{result.count} article{result.count === 1 ? '' : 's'} · {result.ticker}</span>
              <span className="text-[11px] bg-hover px-2 py-0.5 rounded-md text-muted">
                Model: {result.model === 'llama3' ? 'Llama 3 (Groq)' : 'FinBERT'}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {result.articles.map((a, i) => (
                <div key={i}
                  className="border border-border rounded-xl px-3.5 py-2.5 cursor-pointer hover:border-accent hover:bg-amber-50 transition-colors"
                  onClick={() => a.url && window.open(a.url, '_blank')}>
                  <div className="text-sm font-medium mb-1">{a.headline || '(no headline)'}</div>
                  <div className="flex gap-2.5 flex-wrap text-[11px] text-muted items-center">
                    <span className="bg-hover px-1.5 py-px rounded text-[10px] font-semibold uppercase">{a.source}</span>
                    <span className={typeof a.score === 'number' ? (a.score >= 0 ? 'text-gain' : 'text-loss') : ''}>
                      Score: {typeof a.score === 'number' ? a.score.toFixed(3) : '–'}
                    </span>
                    {a.created_at && <span>{fmtDateShort(a.created_at)}</span>}
                    {a.url && <span className="text-accent">↗ Read</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LunarCrush */}
        {buzz && buzz.available && buzz.metrics && (
          <div className="mt-4 border border-border rounded-xl p-4 bg-gradient-to-br from-blue-50 to-amber-50">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wide mb-2.5">LunarCrush Social Buzz — {result?.ticker}</div>
            <div className="flex gap-5 flex-wrap">
              {buzz.metrics.galaxy_score !== undefined && (
                <div><div className="text-[10px] text-muted">Galaxy Score</div><div className="text-lg font-bold text-accent">{buzz.metrics.galaxy_score}</div></div>
              )}
              {buzz.metrics.social_volume !== undefined && (
                <div><div className="text-[10px] text-muted">Social Volume</div><div className="text-lg font-bold">{Number(buzz.metrics.social_volume).toLocaleString()}</div></div>
              )}
              {buzz.metrics.social_score !== undefined && (
                <div><div className="text-[10px] text-muted">Social Score</div><div className="text-lg font-bold">{buzz.metrics.social_score}</div></div>
              )}
              {buzz.metrics.sentiment !== undefined && (
                <div><div className="text-[10px] text-muted">Avg Sentiment</div><div className={`text-lg font-bold ${parseFloat(String(buzz.metrics.sentiment)) >= 0 ? 'text-gain' : 'text-loss'}`}>{parseFloat(String(buzz.metrics.sentiment)).toFixed(2)}</div></div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Sentiment */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-semibold text-muted uppercase tracking-wide">Live Stream Sentiment</div>
          <div className="text-[11px] text-muted">From Alpaca news stream</div>
        </div>
        {liveSent && Object.keys(liveSent).length ? (
          <div className="flex gap-5 flex-wrap">
            <div>
              <div className="text-[11px] text-muted mb-1">Score</div>
              <div className={`text-xl font-bold ${parseFloat(String(liveSent.score || 0)) >= 0 ? 'text-gain' : 'text-loss'}`}>
                {parseFloat(String(liveSent.score || 0)).toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted mb-1">Signal</div>
              <div className="text-base font-bold">{String(liveSent.signal_side || '–').toUpperCase()}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted mb-1">Model</div>
              <div className="text-sm">{String(liveSent.model_used || '–')}</div>
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="text-[11px] text-muted mb-1">Latest headline</div>
              <div className="text-xs">{String(liveSent.headline || '–')}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted text-sm">No live sentiment yet. Start the app and wait for Alpaca news…</div>
        )}
      </div>
    </div>
  );
}
