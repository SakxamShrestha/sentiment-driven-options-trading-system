import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LearnQuestion } from '../../types';

// Normalise either the static QuizQuestion shape or the API LearnQuestion shape
// into a single internal shape so the modal works with both.
interface NormQuestion {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

function normalise(q: LearnQuestion): NormQuestion {
  return {
    question: q.question,
    options: q.options,
    correctIndex: q.correct_index,
    explanation: q.explanation,
  };
}

interface Props {
  lessonId: number;
  lessonTitle: string;
  lessonEmoji: string;
  iconBg: string;
  questions: LearnQuestion[];
  onClose: () => void;
  onComplete?: (score: number, total: number) => void;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;

// ── Score screen shown after all questions are answered ─────────────────────
function ScoreScreen({
  score,
  total,
  onClose,
}: {
  score: number;
  total: number;
  onClose: () => void;
}) {
  const pct = Math.round((score / total) * 100);
  const emoji =
    pct === 100 ? '🏆' : pct >= 80 ? '🎉' : pct >= 60 ? '👍' : pct >= 40 ? '📚' : '💪';
  const label =
    pct === 100
      ? 'Perfect score!'
      : pct >= 80
      ? 'Great job!'
      : pct >= 60
      ? 'Good effort!'
      : pct >= 40
      ? 'Keep studying!'
      : 'Keep going!';

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 80, marginBottom: 20, lineHeight: 1 }}>{emoji}</div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: 8,
          letterSpacing: '-0.02em',
        }}
      >
        {score} / {total}
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          color: pct >= 60 ? '#22C55E' : '#F43F5E',
          lineHeight: 1,
          marginBottom: 12,
          letterSpacing: '-0.03em',
        }}
      >
        {pct}%
      </div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#A1A1AA', marginBottom: 36 }}>
        {label}
      </div>
      <button
        onClick={onClose}
        style={{
          padding: '14px 40px',
          borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          border: 'none',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
        }}
      >
        ← Back to lessons
      </button>
    </div>
  );
}

// ── Main QuizModal ───────────────────────────────────────────────────────────
export default function QuizModal({
  lessonTitle,
  lessonEmoji,
  iconBg,
  questions: rawQuestions,
  onClose,
  onComplete,
}: Props) {
  const questions = rawQuestions.map(normalise);
  const total = questions.length;

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [history, setHistory] = useState<('correct' | 'incorrect' | 'unanswered')[]>(
    Array(total).fill('unanswered'),
  );

  const q = questions[currentQ];
  const isCorrect = selectedIdx === q.correctIndex;

  function handleSelect(idx: number) {
    if (answered) return;
    setSelectedIdx(idx);
    setAnswered(true);
    const correct = idx === q.correctIndex;
    if (correct) setScore(s => s + 1);
    setHistory(prev => {
      const next = [...prev];
      next[currentQ] = correct ? 'correct' : 'incorrect';
      return next;
    });
  }

  function handleNext() {
    if (currentQ + 1 >= total) {
      setCompleted(true);
      onComplete?.(score, total);
    } else {
      setCurrentQ(i => i + 1);
      setSelectedIdx(null);
      setAnswered(false);
    }
  }

  function handleNav(dir: -1 | 1) {
    const next = currentQ + dir;
    if (next < 0 || next >= total) return;
    setCurrentQ(next);
    setSelectedIdx(null);
    setAnswered(false);
  }

  // Decide background color for an answer option
  function optionBg(idx: number): string {
    if (!answered) return '#2A2A2A';
    if (idx === q.correctIndex) return 'rgba(34,197,94,0.15)';
    if (idx === selectedIdx && idx !== q.correctIndex) return 'rgba(244,63,94,0.15)';
    return '#2A2A2A';
  }

  function optionBorder(idx: number): string {
    if (!answered) return idx === selectedIdx ? '#6366f1' : '#3A3A3A';
    if (idx === q.correctIndex) return '#22C55E';
    if (idx === selectedIdx && idx !== q.correctIndex) return '#F43F5E';
    return '#3A3A3A';
  }

  function letterBg(idx: number): string {
    if (!answered) return '#3A3A3A';
    if (idx === q.correctIndex) return '#22C55E';
    if (idx === selectedIdx && idx !== q.correctIndex) return '#F43F5E';
    return '#3A3A3A';
  }

  function historyDotStyle(i: number): React.CSSProperties {
    const state = history[i];
    const isCurrent = i === currentQ;
    let bg = '#3A3A3A';
    let border = 'transparent';
    let color = '#718096';
    if (state === 'correct') { bg = 'rgba(34,197,94,0.22)'; color = '#22C55E'; }
    if (state === 'incorrect') { bg = 'rgba(244,63,94,0.22)'; color = '#F43F5E'; }
    if (isCurrent) { border = '#6366f1'; }
    return {
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: bg,
      border: `2px solid ${isCurrent ? '#6366f1' : border}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      fontWeight: 700,
      color,
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'background 0.15s, border-color 0.15s',
    };
  }

  const progressPct = ((history.filter(h => h !== 'unanswered').length) / total) * 100;

  return (
    <motion.div
      key="quiz-modal"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 700,
        background: '#121212',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 24px',
          borderBottom: '1px solid #2A2A2A',
          background: '#1A1A1A',
        }}
      >
        <button
          onClick={onClose}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'none',
            border: '1px solid #3A3A3A',
            color: '#A1A1AA',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
            (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = '#3A3A3A';
            (e.currentTarget as HTMLButtonElement).style.color = '#A1A1AA';
          }}
          aria-label="Close quiz"
        >
          ←
        </button>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#A1A1AA' }}>
          <span
            onClick={onClose}
            style={{ cursor: 'pointer', transition: 'color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = '#ffffff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = '#A1A1AA'; }}
          >
            Learn
          </span>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>{lessonEmoji}</span>
            {lessonTitle}
          </span>
          <span
            style={{
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 4,
              border: '1px solid #3A3A3A',
              color: '#A1A1AA',
              marginLeft: 4,
            }}
          >
            Quiz
          </span>
        </div>

        {/* Score badge (top-right) */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {!completed && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 6,
                background: 'rgba(99,102,241,0.12)',
                border: '1px solid rgba(99,102,241,0.3)',
                color: '#818cf8',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {score}/{total} correct
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {completed ? (
        <ScoreScreen score={score} total={total} onClose={onClose} />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* ── Left Sidebar (260px) ──────────────────────────────────────── */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              borderRight: '1px solid #2A2A2A',
              background: '#1A1A1A',
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 20px',
              gap: 20,
              overflowY: 'auto',
            }}
          >
            {/* Lesson icon + title */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  boxShadow: `0 4px 20px ${iconBg}55`,
                }}
              >
                {lessonEmoji}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#ffffff',
                  textAlign: 'center',
                  lineHeight: 1.35,
                }}
              >
                {lessonTitle}
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ color: '#A1A1AA' }}>PROGRESS</span>
                <span style={{ color: '#818cf8' }}>
                  {history.filter(h => h !== 'unanswered').length}/{total}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 6,
                  background: '#2A2A2A',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    borderRadius: 6,
                    background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Question list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, monospace)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#A1A1AA',
                  marginBottom: 4,
                }}
              >
                QUESTIONS
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentQ(i);
                      setSelectedIdx(null);
                      setAnswered(false);
                    }}
                    style={historyDotStyle(i)}
                    title={`Question ${i + 1}`}
                  >
                    {history[i] === 'correct'
                      ? '✓'
                      : history[i] === 'incorrect'
                      ? '✗'
                      : i + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Question Area (flex-1) ────────────────────────────────────── */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '32px 40px 160px',
              position: 'relative',
            }}
          >
            {/* Badges row */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.3)',
                  color: '#818cf8',
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                LESSON QUIZ
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: `${iconBg}1A`,
                  border: `1px solid ${iconBg}40`,
                  color: iconBg,
                  letterSpacing: '0.05em',
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {lessonTitle.toUpperCase().slice(0, 24)}
              </span>
            </div>

            {/* Question counter */}
            <div
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#A1A1AA',
                marginBottom: 12,
                letterSpacing: '0.04em',
              }}
            >
              Question {currentQ + 1} of {total}
            </div>

            {/* Question text */}
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.45,
                marginBottom: 32,
                maxWidth: 640,
                letterSpacing: '-0.01em',
              }}
            >
              {q.question}
            </div>

            {/* Answer options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={answered}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 18px',
                    borderRadius: 14,
                    background: optionBg(idx),
                    border: `1.5px solid ${optionBorder(idx)}`,
                    cursor: answered ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
                    transform: 'translateY(0)',
                    width: '100%',
                  }}
                  onMouseEnter={e => {
                    if (!answered) {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = '#6366f1';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!answered) {
                      (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = optionBorder(idx);
                    }
                  }}
                >
                  {/* Letter circle */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: letterBg(idx),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color:
                        answered && idx === q.correctIndex
                          ? '#ffffff'
                          : answered && idx === selectedIdx
                          ? '#ffffff'
                          : '#A1A1AA',
                      flexShrink: 0,
                      transition: 'background 0.15s, color 0.15s',
                      fontFamily: 'var(--font-mono, monospace)',
                    }}
                  >
                    {LETTERS[idx]}
                  </div>
                  {/* Option text */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color:
                        answered && idx === q.correctIndex
                          ? '#22C55E'
                          : answered && idx === selectedIdx && idx !== q.correctIndex
                          ? '#F43F5E'
                          : '#D4D4D8',
                      lineHeight: 1.4,
                      transition: 'color 0.15s',
                    }}
                  >
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Right Nav (40px) ─────────────────────────────────────────── */}
          <div
            style={{
              width: 48,
              flexShrink: 0,
              borderLeft: '1px solid #2A2A2A',
              background: '#1A1A1A',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 0',
            }}
          >
            <button
              onClick={() => handleNav(-1)}
              disabled={currentQ === 0}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: currentQ === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                border: '1px solid #3A3A3A',
                color: currentQ === 0 ? '#4A4A4A' : '#A1A1AA',
                cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                transition: 'background 0.15s, color 0.15s',
              }}
              title="Previous question"
            >
              ↑
            </button>
            <button
              onClick={() => handleNav(1)}
              disabled={currentQ === total - 1}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: currentQ === total - 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                border: '1px solid #3A3A3A',
                color: currentQ === total - 1 ? '#4A4A4A' : '#A1A1AA',
                cursor: currentQ === total - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                transition: 'background 0.15s, color 0.15s',
              }}
              title="Next question"
            >
              ↓
            </button>
          </div>

          {/* ── Feedback Panel (slides up from bottom) ───────────────────── */}
          <AnimatePresence>
            {answered && (
              <motion.div
                key={`feedback-${currentQ}`}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 260,
                  right: 48,
                  padding: '20px 40px',
                  background: isCorrect
                    ? 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.08))'
                    : 'linear-gradient(135deg, rgba(244,63,94,0.18), rgba(244,63,94,0.08))',
                  borderTop: `1.5px solid ${isCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(244,63,94,0.35)'}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 20,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(244,63,94,0.2)',
                    border: `1.5px solid ${isCorrect ? '#22C55E' : '#F43F5E'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {isCorrect ? '✓' : '✗'}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: isCorrect ? '#22C55E' : '#F43F5E',
                      marginBottom: 4,
                    }}
                  >
                    {isCorrect ? 'Correct!' : 'Not quite'}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: '#D4D4D8',
                      maxWidth: 520,
                    }}
                  >
                    {q.explanation}
                  </div>
                </div>

                {/* Next button */}
                <button
                  onClick={handleNext}
                  style={{
                    flexShrink: 0,
                    padding: '10px 24px',
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'opacity 0.15s, transform 0.15s',
                    marginTop: 2,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.88';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  }}
                >
                  {currentQ + 1 >= total ? 'See results →' : 'Next question →'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
