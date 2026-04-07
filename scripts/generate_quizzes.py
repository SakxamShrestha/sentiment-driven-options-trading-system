#!/usr/bin/env python3
"""
Generate quiz questions for all 34 Learn lessons using Groq (Llama 3).

Usage:
    python scripts/generate_quizzes.py

- Saves progress to scripts/quiz_cache.json so it can resume if interrupted.
- On completion, writes the full frontend/src/data/quizzes.ts file.
- Set FORCE=1 to regenerate a specific lesson:
    LESSON=106 FORCE=1 python scripts/generate_quizzes.py
"""

import json
import os
import re
import sys
import time
from pathlib import Path

import requests
from dotenv import load_dotenv

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

CACHE_FILE = Path(__file__).parent / "quiz_cache.json"
OUT_FILE   = ROOT / "frontend" / "src" / "data" / "quizzes.ts"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
if not GROQ_API_KEY:
    print("ERROR: GROQ_API_KEY not set in .env")
    sys.exit(1)

# ── Lesson targets ─────────────────────────────────────────────────────────────
# id → (title, target_question_count)
LESSONS = {
    101: ("Asset Classes Explained",        10),
    102: ("Annual Returns: What They Mean",  8),
    103: ("Bull vs. Bear Markets",          12),
    104: ("Bonds 101",                       9),
    105: ("2 Ways To Pay Off Debt",          5),
    106: ("Candlestick Charts Deep Dive",   14),
    107: ("Compound Interest Over Time",    11),
    108: ("Circuit Breakers in Trading",     6),
    109: ("Diversification Strategies",     13),
    110: ("Dividends & Yield",              10),
    111: ("Day Trading Fundamentals",       18),
    112: ("Earnings Per Share (EPS)",       16),
    113: ("ETFs vs. Mutual Funds",          12),
    114: ("FinBERT: AI for Finance",         8),
    115: ("Fixed Income Investing",         10),
    116: ("Index Funds Explained",           9),
    117: ("IPOs: Going Public",             15),
    118: ("Liquidity & Market Depth",        7),
    119: ("Limit Orders vs. Market Orders",  8),
    120: ("Market Capitalization",          10),
    121: ("Momentum Trading",              11),
    122: ("Options: Calls & Puts",          20),
    123: ("Order Types Explained",           9),
    124: ("P/E Ratio",                      12),
    125: ("Portfolio Rebalancing",          11),
    126: ("Paper Trading Strategies",        8),
    127: ("Risk-Reward Ratio",               9),
    128: ("RSI: Relative Strength Index",   13),
    129: ("Sentiment Analysis in Trading",  14),
    130: ("Short Selling 101",              16),
    131: ("Stop Loss Orders",               7),
    132: ("Volatility & VIX",              12),
    133: ("Volume Analysis",                8),
    134: ("Watchlists & Screening",         6),
}

# ── Groq helper ────────────────────────────────────────────────────────────────
def call_groq(prompt: str, retries: int = 6) -> str:
    for attempt in range(retries):
        try:
            r = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.4,
                    "max_tokens": 4096,
                },
                timeout=90,
            )
            if r.status_code == 429:
                retry_after = int(r.headers.get("retry-after", 30))
                wait = max(retry_after, 20 * (attempt + 1))
                print(f"    Rate-limited — waiting {wait}s…")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except requests.exceptions.HTTPError as e:
            wait = 15 * (attempt + 1)
            print(f"    Attempt {attempt + 1} HTTP error: {e} — retrying in {wait}s…")
            time.sleep(wait)
        except Exception as e:
            wait = 10 * (attempt + 1)
            print(f"    Attempt {attempt + 1} failed: {e} — retrying in {wait}s…")
            time.sleep(wait)
    raise RuntimeError(f"Groq call failed after {retries} attempts")


# ── Prompt builder ─────────────────────────────────────────────────────────────
def build_prompt(lesson_title: str, count: int) -> str:
    return f"""You are an expert financial educator creating quiz questions for a retail investing app.

Generate exactly {count} multiple-choice quiz questions about the topic: "{lesson_title}".

Requirements:
- Each question must test genuine understanding, not just recall.
- All four answer options must be plausible — avoid obviously wrong distractors.
- The explanation must clearly state WHY the correct answer is right and why the others are not.
- Cover a range of difficulty: some foundational, some nuanced.
- Questions must be factually accurate and relevant to retail investors.
- Do NOT number the questions.

Return ONLY a valid JSON array — no markdown, no commentary, no extra text — in exactly this format:
[
  {{
    "question": "...",
    "options": ["option A", "option B", "option C", "option D"],
    "correctIndex": 0,
    "explanation": "..."
  }}
]

correctIndex is the 0-based index of the correct option in the options array.
Generate all {count} questions now:"""


# ── Parser ─────────────────────────────────────────────────────────────────────
def clean_json(raw: str) -> str:
    """Remove stray backslashes that break json.loads (e.g. \$ \1 inside strings)."""
    # Extract the JSON array first
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in response")
    text = match.group()
    # Replace invalid escape sequences inside JSON strings
    # Valid JSON escapes: \" \\ \/ \b \f \n \r \t \uXXXX
    text = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', text)
    return text


def parse_questions(raw: str, count: int) -> list[dict]:
    text = clean_json(raw)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Last resort: strip any remaining bad escapes more aggressively
        text = re.sub(r'\\(.)', lambda m: m.group(1) if m.group(1) not in '"\\/' else m.group(0), text)
        parsed = json.loads(text)
    if not isinstance(parsed, list):
        raise ValueError("Response is not a JSON array")

    validated = []
    for i, q in enumerate(parsed):
        if not isinstance(q, dict):
            continue
        question = str(q.get("question", "")).strip()
        options  = q.get("options", [])
        correct  = q.get("correctIndex")
        explanation = str(q.get("explanation", "")).strip()

        if not question or len(options) != 4 or correct not in (0, 1, 2, 3) or not explanation:
            print(f"    Skipping malformed question {i + 1}")
            continue

        validated.append({
            "id": len(validated) + 1,
            "question": question,
            "options": [str(o).strip() for o in options],
            "correctIndex": int(correct),
            "explanation": explanation,
        })

    if len(validated) < count:
        print(f"    Warning: requested {count}, got {len(validated)} valid questions")

    return validated[:count]  # cap at target


# ── TypeScript writer ──────────────────────────────────────────────────────────
def escape_ts(s: str) -> str:
    return s.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")


def options_to_ts(options: list[str], indent: str) -> str:
    inner = ", ".join(f"'{o.replace(chr(39), chr(92) + chr(39))}'" for o in options)
    return f"[{inner}]"


def questions_to_ts(questions: list[dict], lesson_id: int, indent: str = "    ") -> str:
    lines = []
    for q in questions:
        opts = options_to_ts(q["options"], indent)
        explanation = q["explanation"].replace("'", "\\'")
        question_text = q["question"].replace("'", "\\'")
        lines.append(f"""{indent}{{
{indent}  id: {q['id']},
{indent}  question: '{question_text}',
{indent}  options: {opts},
{indent}  correctIndex: {q['correctIndex']},
{indent}  explanation: '{explanation}',
{indent}}},""")
    return "\n".join(lines)


def write_ts(all_questions: dict[int, list[dict]]) -> None:
    blocks = []
    for lesson_id in sorted(all_questions.keys()):
        title, _ = LESSONS[lesson_id]
        qs = all_questions[lesson_id]
        inner = questions_to_ts(qs, lesson_id)
        blocks.append(f"  // ── {lesson_id}: {title}\n  {lesson_id}: [\n{inner}\n  ],")

    content = f"""export interface QuizQuestion {{
  id: number;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}}

export const QUIZ_DATA: Record<number, QuizQuestion[]> = {{
{chr(10).join(blocks)}
}};
"""
    OUT_FILE.write_text(content, encoding="utf-8")
    print(f"\nWrote {OUT_FILE}")


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    force_lesson = int(os.getenv("LESSON", "0"))
    force        = os.getenv("FORCE", "0") == "1"

    # Load existing cache
    cache: dict[str, list[dict]] = {}
    if CACHE_FILE.exists():
        with open(CACHE_FILE) as f:
            cache = json.load(f)

    total = len(LESSONS)
    for idx, (lesson_id, (title, target)) in enumerate(LESSONS.items(), 1):
        key = str(lesson_id)

        # Skip if already cached (unless force-regenerating this lesson)
        if key in cache and not (force and force_lesson == lesson_id):
            print(f"[{idx:02d}/{total}] {lesson_id} {title} — cached ({len(cache[key])}q) ✓")
            continue

        print(f"[{idx:02d}/{total}] {lesson_id} {title} — generating {target}q…", flush=True)
        try:
            prompt = build_prompt(title, target)
            raw    = call_groq(prompt)
            questions = parse_questions(raw, target)
            cache[key] = questions

            # Persist after every lesson so interruption doesn't lose work
            with open(CACHE_FILE, "w") as f:
                json.dump(cache, f, indent=2)

            print(f"    → {len(questions)} questions saved to cache")
        except Exception as e:
            print(f"    ERROR: {e} — skipping lesson {lesson_id}")

        # Pause between lessons to stay within Groq token-per-minute limits
        if idx < total:
            time.sleep(8)

    # Build final TS file from cache
    all_questions = {int(k): v for k, v in cache.items() if int(k) in LESSONS}
    missing = [lid for lid in LESSONS if str(lid) not in cache]
    if missing:
        print(f"\nWarning: {len(missing)} lesson(s) missing from cache: {missing}")
        print("Re-run the script to retry them.")

    if all_questions:
        write_ts(all_questions)
        total_q = sum(len(v) for v in all_questions.values())
        print(f"Done — {len(all_questions)} lessons, {total_q} total questions.")
    else:
        print("Nothing to write.")


if __name__ == "__main__":
    main()
