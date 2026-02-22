"""
Sentiment scoring using FinBERT and Llama 3.
Scores news/social content and produces a normalized sentiment score for the intelligence layer.
"""

from typing import Any, Dict, Optional

from utils.logger import setup_logger

logger = setup_logger(__name__)


class SentimentEngine:
    """
    Scores text (news headline/summary or social post) using FinBERT and optionally Llama 3.
    Returns a score in [-1, 1] and optional metadata (model_used, confidence).
    """

    def __init__(self, use_finbert: bool = True, use_llama: bool = False):
        self.use_finbert = use_finbert
        self.use_llama = use_llama
        self._finbert_pipeline = None

    def _get_finbert(self):
        if self._finbert_pipeline is None and self.use_finbert:
            try:
                from transformers import pipeline
                self._finbert_pipeline = pipeline(
                    "sentiment-analysis",
                    model="ProsusAI/finbert",
                    truncation=True,
                    max_length=512,
                )
            except Exception as e:
                logger.warning("FinBERT load failed: %s", e)
        return self._finbert_pipeline

    def score_finbert(self, text: str) -> Optional[Dict[str, Any]]:
        """Run FinBERT on text. Returns { 'score': float, 'label': str } or None."""
        pipe = self._get_finbert()
        if not pipe or not text or not text.strip():
            return None
        try:
            out = pipe(text[:4000], top_k=None)
            if not out:
                return None
            # FinBERT returns positive/negative/neutral with scores
            by_label = {x["label"].lower(): x["score"] for x in out}
            pos = by_label.get("positive", 0.0)
            neg = by_label.get("negative", 0.0)
            neu = by_label.get("neutral", 0.0)
            # Normalize to [-1, 1]
            score = pos - neg
            return {"score": score, "label": max(by_label, key=by_label.get), "model": "finbert"}
        except Exception as e:
            logger.debug("FinBERT score error: %s", e)
            return None

    def score_llama(self, text: str) -> Optional[Dict[str, Any]]:
        """Optional: Llama 3 via API (e.g. Groq). Returns { 'score': float } or None."""
        # Placeholder: integrate with Groq Llama 3 or local Llama when implemented
        logger.debug("Llama 3 scoring not yet implemented")
        return None

    def score(self, text: str) -> Dict[str, Any]:
        """
        Combined sentiment score. Uses FinBERT; can blend with Llama 3 later.
        Returns dict with keys: score (float in [-1,1]), model_used, raw (optional).
        """
        result = {"score": 0.0, "model_used": "none", "raw": {}}
        fin = self.score_finbert(text)
        if fin is not None:
            result["score"] = fin.get("score", 0.0)
            result["model_used"] = "finbert"
            result["raw"]["finbert"] = fin
        llama = self.score_llama(text) if self.use_llama else None
        if llama is not None:
            # Simple average if both available; else keep FinBERT
            result["score"] = (result["score"] + llama.get("score", 0.0)) / 2
            result["model_used"] = "finbert+llama3"
            result["raw"]["llama3"] = llama
        return result
