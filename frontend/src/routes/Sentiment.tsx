import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useSentimentStore } from '../stores/useSentimentStore';
import { useToastStore } from '../stores/useToastStore';
import { Spinner } from '../components/shared/Spinner';
import { fmtDateShort } from '../lib/formatters';
import type { CompositeSentimentResult, CompositeArticle, LunarCrushBuzz } from '../types';

/* ── Sentiment arc gauge ─────────────────────────────────────────────── */
function SentimentGauge({ score }: { score: number }) {
  const cx = 100, cy = 96, r = 72, sw = 10;
  const s = Math.max(-1, Math.min(1, score));
  const toPoint = (v: number) => {
    const a = ((1 - v) / 2) * Math.PI;
    return { x: +(cx + r * Math.cos(a)).toFixed(1), y: +(cy - r * Math.sin(a)).toFixed(1) };
  };
  const left   = toPoint(-1);
  const right  = toPoint(1);
  const mid    = toPoint(0);
  const needle = toPoint(s);
  const pos    = s >= 0;
  const col    = s >= 0.2 ? 'var(--color-gain)' : s <= -0.2 ? 'var(--color-loss)' : 'var(--color-muted)';
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

/* ── Score bar (news / social) ───────────────────────────────────────── */
function ScoreBar({ label, score, weight }: { label: string; score: number | null; weight: string }) {
  if (score === null) return null;
  const pct = Math.round(((score + 1) / 2) * 100);
  const col = score >= 0.2 ? 'var(--color-gain)' : score <= -0.2 ? 'var(--color-loss)' : 'var(--color-muted)';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[10px] font-mono">
        <span className="text-muted tracking-widest uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted opacity-50">{weight}</span>
          <span className="font-bold tabular-nums" style={{ color: col }}>
            {score >= 0 ? '+' : ''}{score.toFixed(3)}
          </span>
        </div>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden" style={{ background: 'var(--color-hover)', borderRadius: 1 }}>
        {/* Center marker */}
        <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', background: 'var(--color-border)' }} />
        {/* Fill from center */}
        {score >= 0 ? (
          <div
            className="absolute top-0 bottom-0 transition-all duration-700"
            style={{ left: '50%', width: `${pct - 50}%`, background: col }}
          />
        ) : (
          <div
            className="absolute top-0 bottom-0 transition-all duration-700"
            style={{ right: '50%', width: `${50 - pct}%`, background: col }}
          />
        )}
      </div>
    </div>
  );
}

/* ── Confidence ring ─────────────────────────────────────────────────── */
function ConfidenceRing({ confidence }: { confidence: number }) {
  const r = 18, circ = 2 * Math.PI * r;
  const fill = circ * confidence;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={48} height={48} viewBox="0 0 48 48">
        <circle cx={24} cy={24} r={r} fill="none" stroke="var(--color-border)" strokeWidth={3} />
        <circle
          cx={24} cy={24} r={r} fill="none"
          stroke="var(--color-accent)" strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={24} y={28} textAnchor="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill="var(--color-accent)">
          {Math.round(confidence * 100)}
        </text>
      </svg>
      <span className="text-[9px] font-mono text-muted tracking-widest uppercase">Confidence</span>
    </div>
  );
}

/* ── Catalyst tag ────────────────────────────────────────────────────── */
function CatalystTag({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono tracking-wide border"
      style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)', borderRadius: 2, opacity: 0.85 }}
    >
      {text}
    </span>
  );
}

/* ── Horizon badge ───────────────────────────────────────────────────── */
function HorizonBadge({ horizon }: { horizon: string | null }) {
  if (!horizon) return null;
  const map: Record<string, string> = {
    'short-term': 'S',
    'medium-term': 'M',
    'long-term': 'L',
  };
  return (
    <span
      className="text-[9px] font-mono font-bold px-2 py-0.5 tracking-widest border"
      style={{ borderColor: 'var(--color-border)', borderRadius: 2, color: 'var(--color-muted)' }}
    >
      {map[horizon] ?? 'S'} · {horizon.toUpperCase()}
    </span>
  );
}

/* ── Stat cell ───────────────────────────────────────────────────────── */
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

/* ── Panel label ─────────────────────────────────────────────────────── */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block w-px h-4 shrink-0"
        style={{ background: 'var(--color-accent)', opacity: 0.7 }} />
      <span className="text-[10px] font-mono tracking-[0.22em] text-muted uppercase">{children}</span>
    </div>
  );
}

/* ── Article row ─────────────────────────────────────────────────────── */
function ArticleRow({ article, index }: { article: CompositeArticle; index: number }) {
  const s   = article.score ?? 0;
  const col = s >= 0.2 ? 'var(--color-gain)' : s <= -0.2 ? 'var(--color-loss)' : 'var(--color-muted)';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.28 + index * 0.04, duration: 0.28, ease: 'easeOut' }}
      className="relative px-5 py-4 border-b border-border cursor-pointer group transition-colors duration-150"
      onClick={() => article.url && window.open(article.url, '_blank')}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; }}
    >
      {/* Score gutter */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: col, opacity: 0.7 }} />

      <div className="flex items-start gap-4">
        {/* Index */}
        <div className="text-[10px] font-mono text-muted tabular-nums shrink-0 pt-0.5 w-7 text-right select-none">
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="text-sm leading-snug line-clamp-2">
            {article.headline || '(no headline)'}
          </div>

          {/* Reasoning */}
          {article.reasoning && (
            <div className="text-[10px] text-muted leading-relaxed line-clamp-2 italic">
              {article.reasoning}
            </div>
          )}

          {/* Catalysts */}
          {article.catalysts.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {article.catalysts.map((c, i) => <CatalystTag key={i} text={c} />)}
            </div>
          )}

          {/* Meta row */}
          <div className="flex gap-2 flex-wrap items-center text-[10px] font-mono text-muted">
            <span className="px-1.5 py-px border uppercase tracking-wide"
              style={{ borderColor: 'var(--color-border)', borderRadius: 1 }}>
              {article.source}
            </span>
            <HorizonBadge horizon={article.impact_horizon} />
            {article.created_at && <span>{fmtDateShort(article.created_at)}</span>}
            {article.url && (
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                style={{ color: 'var(--color-accent)' }}>
                ↗ OPEN
              </span>
            )}
          </div>
        </div>

        {/* Score + confidence */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div
            className="text-sm font-black font-mono tabular-nums tracking-tight"
            style={{ color: col }}
          >
            {(s >= 0 ? '+' : '') + s.toFixed(3)}
          </div>
          <div className="text-[9px] font-mono text-muted tabular-nums">
            {Math.round((article.confidence ?? 0) * 100)}% conf
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════════ */
export default function Sentiment() {
  const { cbTripped, setCbTripped } = useSentimentStore();
  const toast = useToastStore((s) => s.show);
  const [ticker, setTicker]     = useState('');
  const [result, setResult]     = useState<CompositeSentimentResult | null>(null);
  const [buzz, setBuzz]         = useState<LunarCrushBuzz | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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
      const d = await api.getSentimentComposite(t, 10);
      setResult(d);
      api.getLunarCrush(t).then(setBuzz).catch(() => {});
    } catch { toast('Analysis failed', 'error'); }
    setAnalyzing(false);
  };

  useEffect(() => { loadCb(); }, [loadCb]);

  const score      = result?.composite_score;
  const label      = score === null || score === undefined ? 'NO DATA'
    : score >= 0.2 ? 'BULLISH' : score <= -0.2 ? 'BEARISH' : 'NEUTRAL';
  const labelColor = score === null || score === undefined ? 'var(--color-muted)'
    : score >= 0.2 ? 'var(--color-gain)' : score <= -0.2 ? 'var(--color-loss)' : 'var(--color-muted)';

  const modelLabel = result?.model_used === 'claude-haiku'
    ? 'Claude Haiku · Anthropic'
    : result?.model_used === 'groq-llama3.3-70b'
    ? 'Llama 3.3 70B · Groq'
    : result?.model_used ?? '–';

  return (
    <div className="w-full flex flex-col gap-5">

      {/* ── PAGE HEADER ───────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-mono tracking-[0.28em] text-muted uppercase mb-1">
            TradeSent.AI · Composite Signal
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
        {/* Radar sweep */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              key="sweep"
              className="pointer-events-none"
              style={{
                position: 'absolute', left: 0, right: 0, height: 1,
                background: 'linear-gradient(90deg, transparent 0%, var(--color-accent) 50%, transparent 100%)',
                zIndex: 20, opacity: 0.75,
              }}
              initial={{ top: 0 }}
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </AnimatePresence>

        {/* Top bar: model indicator + status */}
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-accent)' }} />
            <span className="tracking-widest uppercase">
              {result ? modelLabel : 'Claude · Groq Fallback · LunarCrush'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted select-none">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: analyzing ? 'var(--color-accent)' : 'var(--color-muted)', opacity: analyzing ? 1 : 0.4 }} />
            {analyzing ? `SCANNING ${ticker.toUpperCase()}…` : 'SIGNAL READY'}
          </div>
        </div>

        {/* Input row */}
        <div className="p-5 flex items-center gap-4">
          <div className="font-mono shrink-0 flex items-center gap-2 select-none opacity-70">
            <span className="text-lg font-bold leading-none" style={{ color: 'var(--color-accent)' }}>❯</span>
            <span className="text-[10px] text-muted tracking-widest">SCAN</span>
          </div>
          <input
            className="flex-1 bg-transparent border-0 border-b-2 font-mono tracking-[0.25em] uppercase outline-none transition-all duration-200 placeholder:text-muted/30 placeholder:normal-case placeholder:tracking-normal"
            style={{
              fontSize: '1.85rem', fontWeight: 800, height: '3.25rem',
              borderBottomColor: ticker ? 'var(--color-accent)' : 'var(--color-border)',
              color: 'var(--color-text)', minWidth: 0,
            }}
            placeholder="TICKER"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <button
            onClick={analyze}
            disabled={analyzing || !ticker.trim()}
            className="terminal-btn shrink-0 px-6 tracking-widest disabled:opacity-30 flex items-center gap-2"
            style={{ height: '2.75rem', fontSize: 11 }}
          >
            {analyzing ? <><Spinner className="w-3 h-3" /> SCANNING</> : 'ANALYZE →'}
          </button>
        </div>
      </div>

      {/* ── RESULTS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">

        {/* ╔══ LEFT ══════════════════════════════════════════════╗ */}
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="wait">

            {/* Scanning skeleton */}
            {analyzing && (
              <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="terminal-card p-8 flex flex-col gap-4">
                <div className="font-mono text-[10px] tracking-[0.4em] text-muted uppercase animate-pulse">
                  Composite Analysis — Scanning {ticker.toUpperCase()}…
                </div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full rounded-sm animate-shimmer"
                    style={{ height: i === 0 ? 80 : 40, background: 'var(--color-hover)', animationDelay: `${i * 0.1}s` }} />
                ))}
              </motion.div>
            )}

            {/* Result hero */}
            {result && !analyzing && (
              <motion.div key="hero" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="terminal-card relative overflow-hidden">

                {/* Ghost watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden" aria-hidden>
                  <span className="font-black font-mono uppercase tracking-widest"
                    style={{ fontSize: 'clamp(4rem, 12vw, 8.5rem)', color: labelColor, opacity: 0.04, whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>

                {/* Top color stripe */}
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{ background: labelColor, transition: 'background 0.5s ease' }} />

                <div className="relative z-10 p-6 flex flex-col gap-5">

                  {/* Score row */}
                  <div className="flex items-center gap-6 flex-wrap">
                    <SentimentGauge score={score ?? 0} />
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      <div>
                        <motion.div
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.12, duration: 0.4 }}
                          className="font-black font-mono tabular-nums tracking-tighter leading-none"
                          style={{ fontSize: 'clamp(2.8rem, 6.5vw, 4.5rem)', color: labelColor }}
                        >
                          {score !== null && score !== undefined ? (score >= 0 ? '+' : '') + score.toFixed(3) : '–'}
                        </motion.div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[11px] font-mono font-black tracking-widest px-2 py-0.5"
                            style={{ background: labelColor, color: '#09090b', borderRadius: 1 }}>
                            {label}
                          </span>
                          <span className="text-[10px] font-mono text-muted">{result.ticker}</span>
                          <span className="text-muted opacity-30">·</span>
                          <span className="text-[10px] font-mono text-muted">{result.article_count} articles</span>
                        </div>
                      </div>

                      {/* Signal breakdown bars */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-border">
                        <div className="text-[9px] font-mono text-muted tracking-widest uppercase mb-1">Signal Breakdown</div>
                        <ScoreBar label="News" score={result.news_score} weight="85%" />
                        {result.social_score !== null && (
                          <ScoreBar label="Social" score={result.social_score} weight="15%" />
                        )}
                      </div>
                    </div>

                    <ConfidenceRing confidence={result.confidence} />
                  </div>

                  {/* Catalysts */}
                  {result.all_catalysts.length > 0 && (
                    <div className="flex flex-col gap-2 pt-3 border-t border-border">
                      <div className="text-[9px] font-mono text-muted tracking-widest uppercase">Key Catalysts</div>
                      <div className="flex flex-wrap gap-1.5">
                        {result.all_catalysts.map((c, i) => <CatalystTag key={i} text={c} />)}
                      </div>
                    </div>
                  )}

                  {/* Horizon */}
                  {result.dominant_horizon && (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono text-muted tracking-widest uppercase">Impact Horizon</span>
                      <HorizonBadge horizon={result.dominant_horizon} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Articles */}
          <AnimatePresence>
            {result && !analyzing && result.articles.length > 0 && (
              <motion.div key="articles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="terminal-card overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between border-b border-border"
                  style={{ background: 'var(--color-hover)' }}>
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
                <div>
                  {result.articles.map((a, i) => (
                    <ArticleRow key={a.article_id || i} article={a} index={i} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state */}
          <AnimatePresence>
            {!result && !analyzing && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="terminal-card py-24 flex flex-col items-center gap-3">
                <div className="w-12 h-12 border flex items-center justify-center"
                  style={{ borderColor: 'var(--color-border)', borderRadius: 2, opacity: 0.2 }}>
                  <svg className="w-6 h-6" style={{ color: 'var(--color-accent)' }}
                    fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="font-mono text-[10px] text-muted tracking-[0.35em] uppercase">
                  Enter a ticker symbol above to begin
                </p>
                <p className="font-mono text-[9px] text-muted opacity-40 tracking-widest">
                  Composite · LLM + Social signals
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
        {/* ╚═══════════════════════════════════════════════════════╝ */}

        {/* ╔══ RIGHT SIDEBAR ══════════════════════════════════════╗ */}
        <div className="flex flex-col gap-4">

          {/* Stats panel */}
          {result && !analyzing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="terminal-card p-5 flex flex-col gap-4">
              <PanelLabel>Analysis Stats</PanelLabel>
              <div className="grid grid-cols-2 gap-2">
                <StatCell label="Articles" value={result.article_count} />
                <StatCell label="Confidence" value={`${Math.round(result.confidence * 100)}%`}
                  color={result.confidence >= 0.7 ? 'var(--color-gain)' : 'var(--color-muted)'} />
                <StatCell label="Horizon" value={result.dominant_horizon?.replace('-', ' ') ?? '–'} />
                {result.news_score !== null && (
                  <StatCell label="News Score"
                    value={(result.news_score >= 0 ? '+' : '') + result.news_score.toFixed(3)}
                    color={result.news_score >= 0.2 ? 'var(--color-gain)' : result.news_score <= -0.2 ? 'var(--color-loss)' : 'var(--color-muted)'} />
                )}
                {result.social_score !== null && (
                  <StatCell label="Social Score"
                    value={(result.social_score >= 0 ? '+' : '') + result.social_score.toFixed(3)}
                    color={result.social_score >= 0.2 ? 'var(--color-gain)' : result.social_score <= -0.2 ? 'var(--color-loss)' : 'var(--color-muted)'} />
                )}
              </div>
            </motion.div>
          )}

          {/* LunarCrush */}
          {buzz && buzz.available && buzz.metrics && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
              className="terminal-card p-5">
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
                  <StatCell label="Avg Sentiment"
                    value={parseFloat(String(buzz.metrics.sentiment)).toFixed(2)}
                    color={parseFloat(String(buzz.metrics.sentiment)) >= 0 ? 'var(--color-gain)' : 'var(--color-loss)'}
                  />
                )}
              </div>
            </motion.div>
          )}

        </div>
        {/* ╚═══════════════════════════════════════════════════════╝ */}

      </div>
    </div>
  );
}
