import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useSentimentStore } from '../stores/useSentimentStore';
import { useToastStore } from '../stores/useToastStore';
import { Spinner } from '../components/shared/Spinner';
import { Badge } from '../components/shared/Badge';
import { fmtDateShort } from '../lib/formatters';
import type { SentimentResult, LunarCrushBuzz } from '../types';

type Model = 'finbert' | 'llama3';

/* ── Sentiment arc gauge ──────────────────────────────────────────── */
function SentimentGauge({ score }: { score: number }) {
  const cx = 100, cy = 96, r = 72, sw = 10;
  const s = Math.max(-1, Math.min(1, score));
  const toPoint = (v: number) => {
    const a = ((1 - v) / 2) * Math.PI;
    return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) };
  };
  const left  = toPoint(-1);
  const right = toPoint(1);
  const mid   = toPoint(0);
  const needle = toPoint(s);
  const pos = s >= 0;
  const col = pos ? 'var(--color-gain)' : 'var(--color-loss)';
  const filledArc = s === 0 ? null :
    `M ${mid.x} ${mid.y} A ${r} ${r} 0 0 ${pos ? 1 : 0} ${needle.x} ${needle.y}`;

  return (
    <svg viewBox="0 8 200 102" className="w-[148px] shrink-0">
      <path d={`M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`}
        fill="none" stroke="var(--color-border)" strokeWidth={sw} strokeLinecap="round" />
      {filledArc && (
        <path d={filledArc} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" />
      )}
      {([-1, -0.5, 0, 0.5, 1] as const).map(v => {
        const pt = toPoint(v);
        const a  = ((1 - v) / 2) * Math.PI;
        const len = v === 0 ? 9 : 5;
        const ip = {
          x: +(cx + (r - len) * Math.cos(a)).toFixed(1),
          y: +(cy - (r - len) * Math.sin(a)).toFixed(1),
        };
        return (
          <line key={v} x1={pt.x} y1={pt.y} x2={ip.x} y2={ip.y}
            stroke="var(--color-muted)" strokeWidth={v === 0 ? 2 : 1.5} opacity={0.45} />
        );
      })}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y}
        stroke={col} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={4.5} fill={col} />
      <text x={left.x}  y={cy + 14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="var(--color-muted)">−1</text>
      <text x={right.x} y={cy + 14} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="var(--color-muted)">+1</text>
      <text x={mid.x}   y={mid.y - 5} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="var(--color-muted)">0</text>
    </svg>
  );
}

/* ── Distribution bar ─────────────────────────────────────────────── */
function DistributionBar({ articles }: { articles: Array<{ score?: number | null }> }) {
  const total = articles.length;
  if (total === 0) return null;
  const bull = articles.filter(a => (a.score ?? 0) >= 0.2).length;
  const bear = articles.filter(a => (a.score ?? 0) <= -0.2).length;
  const neut = total - bull - bear;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 text-[10px] font-mono tracking-wider">
        <span style={{ color: 'var(--color-gain)' }}>{bull} BULLISH</span>
        <span className="text-muted opacity-30">·</span>
        <span className="text-muted">{neut} NEUTRAL</span>
        <span className="text-muted opacity-30">·</span>
        <span style={{ color: 'var(--color-loss)' }}>{bear} BEARISH</span>
      </div>
      <div className="flex h-1.5 overflow-hidden" style={{ borderRadius: 1 }}>
        {bull > 0 && <div style={{ width: `${(bull / total) * 100}%`, background: 'var(--color-gain)' }} />}
        {neut > 0 && <div style={{ width: `${(neut / total) * 100}%`, background: 'var(--color-border)' }} />}
        {bear > 0 && <div style={{ width: `${(bear / total) * 100}%`, background: 'var(--color-loss)' }} />}
      </div>
    </div>
  );
}

/* ── Sidebar stat cell ────────────────────────────────────────────── */
function StatCell({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="p-2.5" style={{ background: 'var(--color-hover)', borderRadius: 1 }}>
      <div className="text-[9px] font-mono text-muted uppercase tracking-[0.18em] mb-1">{label}</div>
      <div className="text-sm font-bold font-mono tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  );
}

/* ── Panel section label ──────────────────────────────────────────── */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-px h-4 shrink-0"
        style={{ background: 'var(--color-accent)', opacity: 0.7 }} />
      <span className="text-[10px] font-mono tracking-[0.22em] text-muted uppercase">{children}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function Sentiment() {
  const { cbTripped, setCbTripped } = useSentimentStore();
  const toast = useToastStore((s) => s.show);
  const [model, setModel]     = useState<Model>('finbert');
  const [ticker, setTicker]   = useState('');
  const [result, setResult]   = useState<SentimentResult | null>(null);
  const [buzz, setBuzz]       = useState<LunarCrushBuzz | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [liveSent, setLiveSent]   = useState<Record<string, unknown> | null>(null);

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

  const avg          = result?.average_score;
  const isPositive   = avg !== null && avg !== undefined && avg >= 0;
  const chipVariant: 'gain' | 'loss' | 'neutral' =
    avg === null || avg === undefined ? 'neutral' : avg >= 0.2 ? 'gain' : avg <= -0.2 ? 'loss' : 'neutral';
  const chipLabel    =
    avg === null || avg === undefined ? 'NO DATA' : avg >= 0.2 ? 'BULLISH' : avg <= -0.2 ? 'BEARISH' : 'NEUTRAL';

  const liveScore = liveSent ? parseFloat(String(liveSent.score ?? 0)) : null;
  const livePos   = liveScore !== null && liveScore >= 0;
  const hasLive   = liveSent && Object.keys(liveSent).length > 0;

  return (
    <div className="w-full flex flex-col gap-5">

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-mono tracking-[0.28em] text-muted uppercase mb-1">
            TradeSent.AI · Signal Layer
          </p>
          <h1 className="text-2xl font-black font-mono tracking-tighter leading-none">
            SENTIMENT{' '}
            <span style={{ color: 'var(--color-accent)' }}>ANALYSIS</span>
          </h1>
        </div>

        {/* Circuit breaker */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-[9px] font-mono tracking-widest text-muted uppercase">Signal Engine</div>
            <div
              className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-widest"
              style={{ color: cbTripped ? 'var(--color-loss)' : 'var(--color-gain)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: cbTripped ? 'var(--color-loss)' : 'var(--color-gain)' }} />
              CB · {cbTripped ? 'TRIPPED' : 'ACTIVE'}
            </div>
          </div>
          <button
            onClick={toggleCb}
            className={`px-4 py-2 text-[11px] font-mono font-bold tracking-widest border transition-all duration-200 hover:opacity-80 active:scale-95 ${
              cbTripped
                ? 'bg-gain text-[#09090b] border-transparent'
                : 'border-loss/50 text-loss hover:bg-loss/10'
            }`}
            style={{ borderRadius: 2 }}
          >
            {cbTripped ? 'CLEAR' : 'TRIP'}
          </button>
        </div>
      </div>

      {/* ── COMMAND PANEL ─────────────────────────────────────────── */}
      <div
        className="terminal-card overflow-hidden"
        style={{
          position: 'relative',
          borderColor: analyzing ? 'var(--color-accent)' : undefined,
          transition: 'border-color 0.4s ease',
        }}
      >
        {/* Radar sweep — shown while analyzing */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              key="sweep"
              className="pointer-events-none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 1,
                background: 'linear-gradient(90deg, transparent 0%, var(--color-accent) 50%, transparent 100%)',
                zIndex: 20,
                opacity: 0.75,
              }}
              initial={{ top: 0 }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </AnimatePresence>

        {/* Model selector — tab bar */}
        <div className="flex border-b border-border">
          {(
            [
              { id: 'finbert' as Model, label: 'FinBERT', sub: 'LOCAL · HuggingFace' },
              { id: 'llama3'  as Model, label: 'Llama 3', sub: 'CLOUD · Groq API'    },
            ] as const
          ).map((m) => {
            const active = model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className="flex items-center gap-3 px-5 py-3 border-r border-border transition-all duration-200"
                style={{
                  background: active ? 'rgba(245,158,11,0.07)' : 'transparent',
                  borderBottom: active ? '2px solid var(--color-accent)' : '2px solid transparent',
                  marginBottom: -1,
                  cursor: 'pointer',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                  style={{ background: active ? 'var(--color-accent)' : 'var(--color-border)' }}
                />
                <div className="text-left">
                  <div className="text-xs font-mono font-bold tracking-wide"
                    style={{ color: active ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                    {m.label}
                  </div>
                  <div className="text-[9px] font-mono text-muted tracking-widest">{m.sub}</div>
                </div>
                {active && (
                  <span
                    className="text-[8px] font-mono font-black tracking-widest px-1.5 py-0.5 ml-1"
                    style={{ background: 'var(--color-accent)', color: '#09090b', borderRadius: 1 }}
                  >
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}

          {/* Spacer + status pill */}
          <div className="flex-1" />
          <div className="flex items-center px-4 gap-1.5 text-[10px] font-mono text-muted select-none">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: analyzing ? 'var(--color-accent)' : 'var(--color-muted)', opacity: analyzing ? 1 : 0.4 }} />
            {analyzing ? `SCANNING ${ticker.toUpperCase()}…` : 'SIGNAL READY'}
          </div>
        </div>

        {/* Input row */}
        <div className="p-5 flex items-center gap-4">
          {/* Terminal prompt prefix */}
          <div className="font-mono shrink-0 flex items-center gap-2 select-none opacity-70">
            <span className="text-lg font-bold leading-none" style={{ color: 'var(--color-accent)' }}>❯</span>
            <span className="text-[10px] text-muted tracking-widest">SCAN</span>
          </div>

          {/* Ticker — dramatic full-width input */}
          <input
            className="flex-1 bg-transparent border-0 border-b-2 font-mono tracking-[0.25em] uppercase outline-none transition-all duration-200 placeholder:text-muted/30 placeholder:normal-case placeholder:tracking-normal"
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              height: '3.25rem',
              borderBottomColor: ticker ? 'var(--color-accent)' : 'var(--color-border)',
              color: 'var(--color-text)',
              minWidth: 0,
            }}
            placeholder="TICKER"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="characters"
          />

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={analyzing || !ticker.trim()}
            className="terminal-btn shrink-0 px-6 tracking-widest disabled:opacity-30 flex items-center gap-2"
            style={{ height: '2.75rem', fontSize: 11 }}
          >
            {analyzing
              ? <><Spinner className="w-3 h-3" /> SCANNING</>
              : 'ANALYZE →'
            }
          </button>
        </div>
      </div>

      {/* ── RESULTS + SIDEBAR ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 items-start">

        {/* ╔══ LEFT ══════════════════════════════════════════════════════╗ */}
        <div className="flex flex-col gap-4">

          <AnimatePresence mode="wait">

            {/* SCANNING skeleton */}
            {analyzing && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="terminal-card p-8 flex flex-col gap-4"
              >
                <div className="font-mono text-[10px] tracking-[0.4em] text-muted uppercase animate-pulse">
                  {model === 'llama3' ? 'Llama 3 · Groq' : 'FinBERT · Local'} &mdash; Scanning {ticker.toUpperCase()}
                </div>
                {[...Array(4)].map((_, i) => (
                  <div key={i}
                    className="w-full rounded-sm animate-shimmer"
                    style={{ height: i === 0 ? 72 : 48, background: 'var(--color-hover)', animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </motion.div>
            )}

            {/* RESULT HERO */}
            {result && !analyzing && (
              <motion.div
                key="result-hero"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="terminal-card relative overflow-hidden"
              >
                {/* Ghost watermark */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                  aria-hidden
                >
                  <span
                    className="font-black font-mono uppercase tracking-widest"
                    style={{
                      fontSize: 'clamp(4rem, 12vw, 8.5rem)',
                      color: isPositive ? 'var(--color-gain)' : 'var(--color-loss)',
                      opacity: 0.045,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {chipLabel}
                  </span>
                </div>

                {/* Top sentinel stripe */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: isPositive ? 'var(--color-gain)' : 'var(--color-loss)',
                    transition: 'background 0.5s ease',
                  }}
                />

                <div className="relative z-10 p-6 flex flex-col gap-5">
                  {/* Score + gauge */}
                  <div className="flex items-center gap-6 flex-wrap">
                    <SentimentGauge score={avg ?? 0} />

                    <div className="flex-1 min-w-0">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12, duration: 0.4 }}
                        className="font-black font-mono tabular-nums tracking-tighter leading-none"
                        style={{
                          fontSize: 'clamp(2.8rem, 6.5vw, 4.5rem)',
                          color: isPositive ? 'var(--color-gain)' : 'var(--color-loss)',
                        }}
                      >
                        {avg !== null && avg !== undefined
                          ? (avg >= 0 ? '+' : '') + avg.toFixed(3)
                          : '–'}
                      </motion.div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant={chipVariant}>{chipLabel}</Badge>
                        <span className="text-[10px] font-mono text-muted">{result.ticker}</span>
                        <span className="text-muted opacity-30">·</span>
                        <span className="text-[10px] font-mono text-muted">
                          {result.count} article{result.count === 1 ? '' : 's'}
                        </span>
                        <span className="text-muted opacity-30">·</span>
                        <span
                          className="text-[10px] font-mono px-1.5 py-px border"
                          style={{ borderColor: 'var(--color-border)', borderRadius: 2, color: 'var(--color-muted)' }}
                        >
                          {result.model === 'llama3' ? 'Llama 3 · Groq' : 'FinBERT · local'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Threshold + distribution */}
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    <div className="text-[9px] font-mono text-muted tracking-wide">
                      THRESHOLD — &lt;−0.2 bearish &nbsp;·&nbsp; ±0.2 neutral &nbsp;·&nbsp; &gt;+0.2 bullish
                    </div>
                    <DistributionBar articles={result.articles} />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* INTERCEPTS / articles */}
          <AnimatePresence>
            {result && !analyzing && result.articles.length > 0 && (
              <motion.div
                key="intercepts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.22 }}
                className="terminal-card overflow-hidden"
              >
                {/* Panel header */}
                <div
                  className="px-5 py-3 flex items-center justify-between border-b border-border"
                  style={{ background: 'var(--color-hover)' }}
                >
                  <PanelLabel>Intercepts · {result.articles.length}</PanelLabel>
                  <div className="flex items-center gap-3 text-[9px] font-mono tracking-widest">
                    <span style={{ color: 'var(--color-gain)' }}>
                      {result.articles.filter(a => (a.score ?? 0) >= 0.2).length} BULL
                    </span>
                    <span style={{ color: 'var(--color-loss)' }}>
                      {result.articles.filter(a => (a.score ?? 0) <= -0.2).length} BEAR
                    </span>
                  </div>
                </div>

                {/* Rows */}
                <div>
                  {result.articles.map((a, i) => {
                    const s   = typeof a.score === 'number' ? a.score : 0;
                    const pos = s >= 0;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.28 + i * 0.045, duration: 0.28, ease: 'easeOut' }}
                        className="relative flex items-start gap-4 px-5 py-3.5 border-b border-border cursor-pointer group transition-colors duration-150"
                        onClick={() => a.url && window.open(a.url, '_blank')}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'var(--color-hover)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = '';
                        }}
                      >
                        {/* Score gutter bar */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[2px]"
                          style={{ background: pos ? 'var(--color-gain)' : 'var(--color-loss)', opacity: 0.6 }}
                        />

                        {/* Row index */}
                        <div className="text-[10px] font-mono text-muted tabular-nums shrink-0 pt-0.5 w-7 text-right select-none">
                          {String(i + 1).padStart(2, '0')}
                        </div>

                        {/* Headline + meta */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm leading-snug mb-1.5 line-clamp-2">
                            {a.headline || '(no headline)'}
                          </div>
                          <div className="flex gap-2 flex-wrap items-center text-[10px] font-mono text-muted">
                            <span
                              className="px-1.5 py-px border uppercase tracking-wide"
                              style={{ borderColor: 'var(--color-border)', borderRadius: 1 }}
                            >
                              {a.source}
                            </span>
                            {a.created_at && <span>{fmtDateShort(a.created_at)}</span>}
                            {a.url && (
                              <span
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                                style={{ color: 'var(--color-accent)' }}
                              >
                                ↗ OPEN
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score chip */}
                        <div
                          className="text-sm font-black font-mono tabular-nums shrink-0 pt-0.5 tracking-tight"
                          style={{ color: pos ? 'var(--color-gain)' : 'var(--color-loss)' }}
                        >
                          {typeof a.score === 'number'
                            ? (s >= 0 ? '+' : '') + s.toFixed(3)
                            : '–'}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* EMPTY STATE */}
          <AnimatePresence>
            {!result && !analyzing && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="terminal-card py-24 flex flex-col items-center gap-3"
              >
                <div
                  className="w-12 h-12 border flex items-center justify-center"
                  style={{ borderColor: 'var(--color-border)', borderRadius: 2, opacity: 0.2 }}
                >
                  <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }}
                    fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="font-mono text-[10px] text-muted tracking-[0.35em] uppercase">
                  Enter a ticker symbol above to begin
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
        {/* ╚═══════════════════════════════════════════════════════════════╝ */}

        {/* ╔══ RIGHT SIDEBAR ═══════════════════════════════════════════════╗ */}
        <div className="flex flex-col gap-4">

          {/* Live Signal */}
          <div className="terminal-card p-5">
            <div className="flex items-center justify-between mb-4">
              <PanelLabel>Live Signal</PanelLabel>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'var(--color-accent)' }} />
                Alpaca stream
              </div>
            </div>

            {hasLive ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-4xl font-black font-mono tabular-nums tracking-tighter leading-none"
                    style={{ color: livePos ? 'var(--color-gain)' : 'var(--color-loss)' }}
                  >
                    {liveScore !== null
                      ? (liveScore >= 0 ? '+' : '') + liveScore.toFixed(3)
                      : '–'}
                  </span>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 tracking-widest"
                    style={{
                      background: livePos ? 'var(--color-gain-soft)' : 'var(--color-loss-soft)',
                      color: livePos ? 'var(--color-gain)' : 'var(--color-loss)',
                      borderRadius: 1,
                    }}
                  >
                    {String(liveSent?.signal_side ?? '–').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatCell label="Model" value={String(liveSent?.model_used ?? '–')} />
                  <StatCell
                    label="Side"
                    value={String(liveSent?.signal_side ?? '–').toUpperCase()}
                    color={livePos ? 'var(--color-gain)' : 'var(--color-loss)'}
                  />
                </div>

                <div className="border p-3" style={{ borderColor: 'var(--color-border)', borderRadius: 2 }}>
                  <div className="text-[9px] font-mono text-muted uppercase tracking-[0.2em] mb-1.5">
                    Latest Headline
                  </div>
                  <p className="text-[11px] leading-relaxed">{String(liveSent?.headline ?? '–')}</p>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center gap-2">
                <span className="w-2 h-2 rounded-full border border-muted opacity-30 block" />
                <p className="font-mono text-[10px] text-muted tracking-[0.25em] uppercase text-center">
                  Awaiting stream
                </p>
                <p className="text-[11px] text-muted opacity-50 text-center">
                  Start the app and wait for Alpaca news
                </p>
              </div>
            )}
          </div>

          {/* LunarCrush — only when data available */}
          {buzz && buzz.available && buzz.metrics && (
            <div className="terminal-card p-5">
              <div className="flex items-center justify-between mb-4">
                <PanelLabel>LunarCrush Social</PanelLabel>
                <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {result?.ticker}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {buzz.metrics.galaxy_score !== undefined && (
                  <StatCell label="Galaxy Score" value={buzz.metrics.galaxy_score} color="var(--color-accent)" />
                )}
                {buzz.metrics.social_volume !== undefined && (
                  <StatCell label="Social Vol" value={Number(buzz.metrics.social_volume).toLocaleString()} />
                )}
                {buzz.metrics.social_score !== undefined && (
                  <StatCell label="Social Score" value={buzz.metrics.social_score} />
                )}
                {buzz.metrics.sentiment !== undefined && (
                  <StatCell
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

        </div>
        {/* ╚═══════════════════════════════════════════════════════════════╝ */}

      </div>
    </div>
  );
}
