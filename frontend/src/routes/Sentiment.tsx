import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useSentimentStore } from '../stores/useSentimentStore';
import { useToastStore } from '../stores/useToastStore';
import { Spinner } from '../components/shared/Spinner';
import { Badge } from '../components/shared/Badge';
import { fmtDateShort } from '../lib/formatters';
import type { SentimentResult, LunarCrushBuzz } from '../types';

type Model = 'finbert' | 'llama3';

/* ── Micro-component: labelled stat block ────────────────────── */
function StatBlock({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="bg-hover rounded-xl px-3 py-2.5">
      <div className="text-[9px] font-mono text-muted uppercase tracking-[0.18em] mb-1">{label}</div>
      <div className="text-lg font-bold font-mono tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

/* ── Accent divider ──────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block w-px h-4 rounded-full shrink-0"
        style={{ background: 'var(--color-accent)', opacity: 0.7 }}
      />
      <span className="text-[10px] font-mono tracking-[0.22em] text-muted uppercase">{children}</span>
    </div>
  );
}

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
      toast(
        d.tripped ? 'Circuit breaker TRIPPED' : 'Circuit breaker cleared',
        d.tripped ? 'error' : 'success',
      );
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
  const isPositive = avg !== null && avg !== undefined && avg >= 0;
  const chipVariant: 'gain' | 'loss' | 'neutral' =
    avg === null || avg === undefined ? 'neutral' : avg >= 0.2 ? 'gain' : avg <= -0.2 ? 'loss' : 'neutral';
  const chipLabel =
    avg === null || avg === undefined ? 'No data' : avg >= 0.2 ? 'Bullish' : avg <= -0.2 ? 'Bearish' : 'Neutral';

  const liveScore = liveSent ? parseFloat(String(liveSent.score ?? 0)) : null;
  const livePos = liveScore !== null && liveScore >= 0;
  const hasLive = liveSent && Object.keys(liveSent).length > 0;

  return (
    <div className="w-full flex flex-col gap-4">

      {/* ── Page Header + Circuit Breaker ──────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-mono tracking-[0.25em] text-muted uppercase mb-0.5">
            TradeSent.AI · Intelligence
          </p>
          <h1 className="text-xl font-bold tracking-tight">Sentiment Analysis</h1>
        </div>

        {/* Circuit Breaker — compact status badge + action button */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all duration-300 ${
              cbTripped
                ? 'bg-loss-soft border-loss/30 text-loss'
                : 'bg-gain-soft border-gain/30 text-gain'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 animate-pulse ${
                cbTripped ? 'bg-loss' : 'bg-gain'
              }`}
            />
            <span className="tracking-widest font-semibold">
              CB {cbTripped ? '· TRIPPED' : '· ACTIVE'}
            </span>
          </div>
          <button
            onClick={toggleCb}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold tracking-wide border transition-all duration-200 hover:opacity-80 active:scale-95 ${
              cbTripped
                ? 'bg-gain text-white border-transparent shadow-sm'
                : 'bg-loss/90 text-white border-transparent shadow-sm'
            }`}
          >
            {cbTripped ? 'CLEAR' : 'TRIP'}
          </button>
        </div>
      </div>

      {/* ── Bento Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 items-start">

        {/* ╔══ LEFT: AI Sentiment Lookup ═════════════════════════════╗ */}
        <div className="card-elevated flex flex-col" style={{ minHeight: '520px' }}>

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border">
            <SectionLabel>AI Sentiment Lookup</SectionLabel>
            {/* Model toggle */}
            <div className="flex items-center gap-0.5 p-1 rounded-lg border border-border bg-hover">
              {(['finbert', 'llama3'] as Model[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setModel(m)}
                  className={`px-3 py-1 text-[11px] font-mono font-semibold rounded-md transition-all duration-200 ${
                    model === m
                      ? 'bg-card text-text border border-border shadow-sm'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {m === 'finbert' ? 'FinBERT' : 'Llama 3'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 flex flex-col gap-5 flex-1">
            {/* Ticker input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm pointer-events-none select-none opacity-50"
                  style={{ color: 'var(--color-accent)' }}>
                  ›_
                </span>
                <input
                  className="w-full h-10 pl-10 pr-3 border border-border rounded-xl bg-bg font-mono text-sm tracking-widest uppercase outline-none transition-all duration-200 placeholder:normal-case placeholder:tracking-normal placeholder:text-muted placeholder:opacity-50"
                  style={{ ['--tw-ring-color' as string]: 'var(--color-accent)' }}
                  placeholder="AAPL · TSLA · NIO"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyze()}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--color-accent)'; }}
                  onBlur={(e) => { e.target.style.borderColor = ''; }}
                />
              </div>
              <button
                onClick={analyze}
                disabled={analyzing}
                className="btn-accent h-10 px-5 text-sm font-semibold rounded-xl disabled:opacity-40 disabled:transform-none"
              >
                {analyzing ? 'Scanning…' : 'Analyze'}
              </button>
            </div>

            {/* Loading */}
            {analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-muted">
                <Spinner />
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">
                  Scanning with {model === 'llama3' ? 'Llama 3' : 'FinBERT'}…
                </span>
              </div>
            )}

            {/* Result */}
            {result && !analyzing && (
              <div className="flex flex-col gap-4">
                {/* Score hero */}
                <div
                  className="relative rounded-xl border border-border overflow-hidden"
                  style={{ background: 'var(--color-hover)' }}
                >
                  {/* Score bar accent line */}
                  <div
                    className="absolute top-0 left-0 h-0.5 transition-all duration-700"
                    style={{
                      width: `${Math.min(Math.abs(avg ?? 0) * 120 + 8, 100)}%`,
                      background: isPositive ? 'var(--color-gain)' : 'var(--color-loss)',
                    }}
                  />
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-baseline gap-3 flex-wrap mb-1.5">
                      <span
                        className="text-5xl font-bold font-mono tabular-nums tracking-tight"
                        style={{ color: isPositive ? 'var(--color-gain)' : 'var(--color-loss)' }}
                      >
                        {avg !== null && avg !== undefined
                          ? (avg >= 0 ? '+' : '') + avg.toFixed(3)
                          : '–'}
                      </span>
                      <Badge variant={chipVariant}>{chipLabel}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-muted flex-wrap">
                      <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                        {result.ticker}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{result.count} article{result.count === 1 ? '' : 's'}</span>
                      <span className="opacity-40">·</span>
                      <span className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px]">
                        {result.model === 'llama3' ? 'Llama 3 · Groq' : 'FinBERT · local'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Articles list */}
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-mono text-muted tracking-[0.22em] uppercase mb-0.5">
                    Articles · {result.articles.length}
                  </div>
                  {result.articles.map((a, i) => {
                    const s = typeof a.score === 'number' ? a.score : 0;
                    const pos = s >= 0;
                    return (
                      <div
                        key={i}
                        className="relative flex gap-3 items-start border border-border rounded-lg px-3.5 py-2.5 cursor-pointer transition-all duration-200 overflow-hidden group"
                        style={{ background: 'var(--color-card)' }}
                        onClick={() => a.url && window.open(a.url, '_blank')}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)';
                          (e.currentTarget as HTMLElement).style.background = 'var(--color-hover)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.borderColor = '';
                          (e.currentTarget as HTMLElement).style.background = 'var(--color-card)';
                        }}
                      >
                        {/* Score gutter bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[2px] transition-opacity duration-200"
                          style={{
                            background: pos ? 'var(--color-gain)' : 'var(--color-loss)',
                            opacity: 0.65,
                          }}
                        />
                        <div className="flex-1 min-w-0 pl-1">
                          <div className="text-sm leading-snug mb-1.5 line-clamp-2">
                            {a.headline || '(no headline)'}
                          </div>
                          <div className="flex gap-2 flex-wrap items-center text-[10px] font-mono text-muted">
                            <span className="bg-hover px-1.5 py-px rounded uppercase tracking-wide border border-border">
                              {a.source}
                            </span>
                            {a.created_at && <span>{fmtDateShort(a.created_at)}</span>}
                            {a.url && (
                              <span
                                className="group-hover:underline"
                                style={{ color: 'var(--color-accent)' }}
                              >
                                ↗ Read
                              </span>
                            )}
                          </div>
                        </div>
                        <div
                          className="text-sm font-bold font-mono tabular-nums shrink-0 pt-0.5"
                          style={{ color: pos ? 'var(--color-gain)' : 'var(--color-loss)' }}
                        >
                          {typeof a.score === 'number'
                            ? (s >= 0 ? '+' : '') + s.toFixed(3)
                            : '–'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!result && !analyzing && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
                <div
                  className="dot-grid w-16 h-16 rounded-2xl border border-border flex items-center justify-center opacity-25"
                >
                  <svg
                    className="w-7 h-7"
                    style={{ color: 'var(--color-accent)' }}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                    />
                  </svg>
                </div>
                <p className="font-mono text-[10px] text-muted tracking-[0.3em] uppercase">
                  Enter a ticker to analyze
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ╔══ RIGHT: Data Column ═══════════════════════════════════════╗ */}
        <div className="flex flex-col gap-3">

          {/* Live Signal */}
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Live Signal</SectionLabel>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--color-accent)' }} />
                Alpaca stream
              </div>
            </div>

            {hasLive ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-3xl font-bold font-mono tabular-nums"
                    style={{ color: livePos ? 'var(--color-gain)' : 'var(--color-loss)' }}
                  >
                    {liveScore !== null
                      ? (liveScore >= 0 ? '+' : '') + liveScore.toFixed(3)
                      : '–'}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold px-2 py-0.5 rounded tracking-widest"
                    style={{
                      background: livePos ? 'var(--color-gain-soft)' : 'var(--color-loss-soft)',
                      color: livePos ? 'var(--color-gain)' : 'var(--color-loss)',
                    }}
                  >
                    {String(liveSent?.signal_side ?? '–').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatBlock label="Model" value={String(liveSent?.model_used ?? '–')} />
                  <StatBlock
                    label="Side"
                    value={String(liveSent?.signal_side ?? '–').toUpperCase()}
                    color={livePos ? 'var(--color-gain)' : 'var(--color-loss)'}
                  />
                </div>

                <div className="border border-border rounded-xl p-3">
                  <div className="text-[9px] font-mono text-muted uppercase tracking-[0.2em] mb-1.5">
                    Latest Headline
                  </div>
                  <p className="text-[11px] leading-relaxed">{String(liveSent?.headline ?? '–')}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <span className="w-2 h-2 rounded-full border border-muted opacity-30 block" />
                <p className="font-mono text-[10px] text-muted tracking-[0.25em] uppercase">
                  Awaiting stream
                </p>
                <p className="text-[11px] text-muted opacity-50">
                  Start the app and wait for Alpaca news
                </p>
              </div>
            )}
          </div>

          {/* LunarCrush — only when data available */}
          {buzz && buzz.available && buzz.metrics && (
            <div className="card-elevated p-5">
              <div className="flex items-center justify-between mb-4">
                <SectionLabel>LunarCrush Social</SectionLabel>
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {result?.ticker}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {buzz.metrics.galaxy_score !== undefined && (
                  <StatBlock
                    label="Galaxy Score"
                    value={buzz.metrics.galaxy_score}
                    color="var(--color-accent)"
                  />
                )}
                {buzz.metrics.social_volume !== undefined && (
                  <StatBlock
                    label="Social Volume"
                    value={Number(buzz.metrics.social_volume).toLocaleString()}
                  />
                )}
                {buzz.metrics.social_score !== undefined && (
                  <StatBlock label="Social Score" value={buzz.metrics.social_score} />
                )}
                {buzz.metrics.sentiment !== undefined && (
                  <StatBlock
                    label="Avg Sentiment"
                    value={parseFloat(String(buzz.metrics.sentiment)).toFixed(2)}
                    color={
                      parseFloat(String(buzz.metrics.sentiment)) >= 0
                        ? 'var(--color-gain)'
                        : 'var(--color-loss)'
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* AI Engine selector */}
          <div className="card-elevated p-5">
            <div className="mb-3">
              <SectionLabel>AI Engine</SectionLabel>
            </div>
            <div className="flex flex-col gap-2">
              {(
                [
                  { id: 'finbert' as Model, name: 'FinBERT', sub: 'HuggingFace · local inference' },
                  { id: 'llama3' as Model, name: 'Llama 3', sub: 'Groq API · cloud inference' },
                ] as const
              ).map((m) => {
                const active = model === m.id;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200"
                    style={{
                      borderColor: active ? 'rgba(56,97,251,0.35)' : 'var(--color-border)',
                      background: active ? 'var(--color-active-bg)' : 'var(--color-hover)',
                      opacity: active ? 1 : 0.55,
                    }}
                    onClick={() => setModel(m.id)}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.opacity = '0.55';
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0 transition-all duration-200"
                      style={{
                        background: active ? 'var(--color-accent)' : 'var(--color-muted)',
                        opacity: active ? 1 : 0.4,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold font-mono">{m.name}</div>
                      <div className="text-[10px] text-muted">{m.sub}</div>
                    </div>
                    {active && (
                      <span
                        className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded tracking-widest"
                        style={{
                          background: 'var(--color-gain-soft)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        ACTIVE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
        {/* ╚════════════════════════════════════════════════════════════╝ */}
      </div>
    </div>
  );
}
