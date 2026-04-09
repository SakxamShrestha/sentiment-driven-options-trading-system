"""
Composite sentiment engine for TradeSent.AI.

Multi-signal architecture:
  1. LLM deep analysis (Claude → Groq fallback) — primary scorer, richest output
  2. LunarCrush social sentiment — blended at 15% when available

Per-article output:
  score, confidence, catalysts, impact_horizon, reasoning, model_used

Ticker-level composite:
  composite_score, news_score, social_score, confidence, all_catalysts, dominant_horizon
"""

import json
import re
import requests as req
from typing import Any, Dict, List, Optional

from config.settings import settings
from utils.logger import setup_logger

logger = setup_logger(__name__)

_PROMPT = (
    "You are a professional buy-side equity analyst specializing in news-driven stock price reactions.\n\n"
    "Ticker: {ticker}\n"
    "Article: \"{text}\"\n\n"
    "Analyze how this news specifically affects {ticker} stock price and investor sentiment.\n"
    "Reply with ONLY valid JSON, no markdown, no explanation:\n"
    '{{\n'
    '  "score": <float -1.0 to 1.0>,\n'
    '  "confidence": <float 0.0 to 1.0>,\n'
    '  "catalysts": [<1-3 short phrases, e.g. "earnings beat", "guidance cut">],\n'
    '  "impact_horizon": <"short-term"|"medium-term"|"long-term">,\n'
    '  "reasoning": "<one sentence explaining the score>"\n'
    '}}'
)


def _parse(parsed: dict, model: str) -> Dict[str, Any]:
    score = max(-1.0, min(1.0, float(parsed.get("score", 0.0))))
    confidence = max(0.0, min(1.0, float(parsed.get("confidence", 0.5))))
    catalysts = [str(c) for c in (parsed.get("catalysts") or [])[:3]]
    impact = str(parsed.get("impact_horizon", "short-term"))
    if impact not in ("short-term", "medium-term", "long-term"):
        impact = "short-term"
    reasoning = str(parsed.get("reasoning", "")).strip()[:300]
    return {
        "score": round(score, 4),
        "confidence": round(confidence, 3),
        "catalysts": catalysts,
        "impact_horizon": impact,
        "reasoning": reasoning,
        "model_used": model,
    }


def _call_claude(text: str, ticker: str) -> Optional[Dict[str, Any]]:
    if not settings.ANTHROPIC_API_KEY:
        return None
    try:
        r = req.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 256,
                "messages": [{"role": "user", "content": _PROMPT.format(ticker=ticker, text=text[:2000])}],
            },
            timeout=15,
        )
        r.raise_for_status()
        content = r.json()["content"][0]["text"].strip()
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            return _parse(json.loads(match.group()), "claude-haiku")
    except Exception as e:
        logger.debug("Claude composite error: %s", e)
    return None


def _call_groq(text: str, ticker: str) -> Optional[Dict[str, Any]]:
    if not settings.GROQ_API_KEY:
        return None
    try:
        r = req.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [{"role": "user", "content": _PROMPT.format(ticker=ticker, text=text[:2000])}],
                "temperature": 0.1,
                "max_tokens": 256,
                "response_format": {"type": "json_object"},
            },
            timeout=15,
        )
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"].strip()
        return _parse(json.loads(content), "groq-llama3.3-70b")
    except Exception as e:
        logger.debug("Groq composite error: %s", e)
    return None


def score_article(text: str, ticker: str) -> Dict[str, Any]:
    """
    Score a single article for a given ticker.
    Uses Claude if ANTHROPIC_API_KEY is set, otherwise falls back to Groq.
    """
    result = _call_claude(text, ticker) or _call_groq(text, ticker)
    if result is None:
        return {
            "score": 0.0,
            "confidence": 0.0,
            "catalysts": [],
            "impact_horizon": "short-term",
            "reasoning": "No LLM scorer available.",
            "model_used": "none",
        }
    return result


def aggregate_composite(
    article_results: List[Dict[str, Any]],
    lunarcrush_sentiment: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Aggregate per-article scores into a ticker-level composite.
    Blends news (85%) + LunarCrush social (15%) when social data is available.
    """
    scored = [a for a in article_results if a.get("model_used") != "none" and a.get("score") is not None]

    if not scored:
        return {
            "composite_score": None,
            "news_score": None,
            "social_score": lunarcrush_sentiment,
            "confidence": 0.0,
            "all_catalysts": [],
            "dominant_horizon": None,
        }

    scores = [a["score"] for a in scored]
    confidences = [a["confidence"] for a in scored]

    seen: set = set()
    all_catalysts: List[str] = []
    for a in scored:
        for c in (a.get("catalysts") or []):
            if c not in seen:
                seen.add(c)
                all_catalysts.append(c)

    horizons = [a.get("impact_horizon", "short-term") for a in scored]
    dominant_horizon = max(set(horizons), key=horizons.count)

    news_score = sum(scores) / len(scores)
    avg_conf = sum(confidences) / len(confidences)

    composite = (
        news_score * 0.85 + lunarcrush_sentiment * 0.15
        if lunarcrush_sentiment is not None
        else news_score
    )

    return {
        "composite_score": round(composite, 4),
        "news_score": round(news_score, 4),
        "social_score": round(lunarcrush_sentiment, 4) if lunarcrush_sentiment is not None else None,
        "confidence": round(avg_conf, 3),
        "all_catalysts": all_catalysts[:8],
        "dominant_horizon": dominant_horizon,
    }
