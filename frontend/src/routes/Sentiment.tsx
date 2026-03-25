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
    <div className="bg-hover rounded-sm px-3 py-2.5">
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

/* ── Sentiment arc gauge ─────────────────────────────────────── */
function SentimentGauge({ score }: { score: number }) {
  const cx = 100, cy = 96, r = 72, sw = 10;
  const s = Math.max(-1, Math.min(1, score));
  const toPoint = (v: number) => {
    const a = ((1 - v) / 2) * Math.PI;
    return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) };
  };
  const left = toPoint(-1);
  const right = toPoint(1);
  const mid = toPoint(0);
  const needle = toPoint(s);
  const pos = s >= 0;
  const col = pos ? 'var(--color-gain)' : 'var(--color-loss)';
  const filledArc = s === 0 ? null :
    `M ${mid.x} ${mid.y} A ${r} ${r} 0 0 ${pos ? 1 : 0} ${needle.x} ${needle.y}`;

  return (
    <svg viewBox="0 8 200 102" className="w-[160px] shrink-0">
      {/* Track */}
      <path d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`}
        fill="none" stroke="var(--color-border)" strokeWidth={sw} strokeLinecap="round" />
      {/* Score fill */}
      {filledArc && <path d={filledArc} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" />}
      {/* Tick marks */}
      {([-1, -0.5, 0, 0.5, 1] as const).map(v => {
        const pt = toPoint(v);
        const a = ((1 - v) / 2) * Math.PI;
        const len = v === 0 ? 9 : 5;
        const ip = { x: +(cx + (r - len) * Math.cos(a)).toFixed(1), y: +(cy - (r - len) * Math.sin(a)).toFixed(1) };
        return <line key={v} x1={pt.x} y1={pt.y} x2={ip.x} y2={ip.y}
          stroke="var(--color-muted)" strokeWidth={v === 0 ? 2 : 1.5} opacity={0.45} />;
      })}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
      {/* Hub */}
      <circle cx={cx} cy={cy} r={4.5} fill={col} />
      {/* Labels */}
      <text x={left.x} y={cy + 14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="var(--color-muted)">−1</text>
      <text x={right.x} y={cy + 14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="var(--color-muted)">+1</text>
      <text x={mid.x} y={mid.y - 5} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="var(--color-muted)">0</text>
    </svg>
  );
}

/* ── Article distribution bar ────────────────────────────────── */
function DistributionBar({ articles }: { articles: Array<{ score?: number | null }> }) {
  const total = articles.length;
  if (total === 0) return null;
  const bull = articles.filter(a => (a.score ?? 0) >= 0.2).length;
  const bear = articles.filter(a => (a.score ?? 0) <= -0.2).length;
  const neut = total - bull - bear;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <span style={{ color: 'var(--color-gain)' }}>{bull} bullish</span>
        <span className="text-muted opacity-30">·</span>
        <span className="text-muted">{neut} neutral</span>
        <span className="text-muted opacity-30">·</span>
        <span style={{ color: 'var(--color-loss)' }}>{bear} bearish</span>
      </div>
      <div className="flex h-1 rounded-full overflow-hidden">
        {bull > 0 && <div style={{ width: `${(bull / total) * 100}%`, background: 'var(--color-gain)' }} />}
        {neut > 0 && <div style={{ width: `${(neut / total) * 100}%`, background: 'var(--color-border)' }} />}
        {bear > 0 && <div style={{ width: `${(bear / total) * 100}%`, background: 'var(--color-loss)' }} />}
      </div>
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="text-[9px] font-mono text-muted tracking-widest uppercase">
            {cbTripped ? 'Trade signals paused' : 'Trade signals active'}
          </p>
          <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-sm border text-xs font-mono transition-all duration-300 ${
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
            className={`px-3.5 py-1.5 rounded-sm text-xs font-mono font-semibold tracking-wide border transition-all duration-200 hover:opacity-80 active:scale-95 ${
              cbTripped
                ? 'bg-gain text-white border-transparent shadow-sm'
                : 'bg-loss/90 text-white border-transparent shadow-sm'
            }`}
          >
            {cbTripped ? 'CLEAR' : 'TRIP'}
          </button>
          </div>
        </div>
      </div>

      {/* ── Bento Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3 items-start">

        {/* ╔══ LEFT: AI Sentiment Lookup ═════════════════════════════╗ */}
        <div className="terminal-card flex flex-col" style={{ minHeight: '520px' }}>

          {/* Panel header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-4 border-b border-border">
            <SectionLabel>AI Sentiment Lookup</SectionLabel>
            {/* Model toggle */}
            <span className="text-[10px] font-mono text-muted px-2 py-1 border border-border rounded-sm bg-hover">
              {model === 'finbert' ? 'FinBERT · local' : 'Llama 3 · Groq'}
            </span>
          </div>

          <div className="p-5 flex flex-col gap-5 flex-1">
            {/* Ticker input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  className="w-full h-10 pl-3 pr-3 border border-border rounded-sm bg-bg font-mono text-sm tracking-widest uppercase outline-none transition-colors duration-150 focus:border-accent placeholder:normal-case placeholder:tracking-normal placeholder:text-muted placeholder:opacity-50"
                  style={{ ['--tw-ring-color' as string]: 'var(--color-accent)' }}
                  placeholder=""
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && analyze()}
                  onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--color-accent)'; }}
                  onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = ''; }}
                />
              </div>
              <button
                onClick={analyze}
                disabled={analyzing}
                className="terminal-btn h-10 px-5 rounded-sm disabled:opacity-40"
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
                {/* Score hero: gauge + number + distribution */}
                <div className="relative rounded-sm border border-border overflow-hidden"
                  style={{ background: 'var(--color-hover)' }}>
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 h-0.5 transition-all duration-700"
                    style={{ width: `${Math.min(Math.abs(avg ?? 0) * 120 + 8, 100)}%`,
                      background: isPositive ? 'var(--color-gain)' : 'var(--color-loss)' }} />
                  <div className="px-4 pt-4 pb-3 flex items-center gap-4">
                    {/* Gauge */}
                    <SentimentGauge score={avg ?? 0} />
                    {/* Score + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap mb-1">
                        <span className="text-4xl font-bold font-mono tabular-nums tracking-tight"
                          style={{ color: isPositive ? 'var(--color-gain)' : 'var(--color-loss)' }}>
                          {avg !== null && avg !== undefined
                            ? (avg >= 0 ? '+' : '') + avg.toFixed(3) : '–'}
                        </span>
                        <Badge variant={chipVariant}>{chipLabel}</Badge>
                      </div>
                      {/* Threshold legend */}
                      <div className="text-[9px] font-mono text-muted mb-2.5 tracking-wide">
                        &lt;−0.2 bearish · ±0.2 neutral · &gt;+0.2 bullish
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
                  {/* Distribution bar */}
                  <div className="px-4 pb-3">
                    <DistributionBar articles={result.articles} />
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
                        className="relative flex gap-3 items-start border border-border rounded-sm px-3.5 py-2.5 cursor-pointer transition-all duration-200 overflow-hidden group"
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
                  className="w-14 h-14 rounded-sm border border-border flex items-center justify-center opacity-25"
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
          <div className="terminal-card p-5">
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

                <div className="border border-border rounded-sm p-3">
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
            <div className="terminal-card p-5">
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
          <div className="terminal-card p-5">
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
                    className="flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-all duration-200"
                    style={{
                      borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                      background: active ? 'rgba(245,158,11,0.08)' : 'var(--color-hover)',
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
