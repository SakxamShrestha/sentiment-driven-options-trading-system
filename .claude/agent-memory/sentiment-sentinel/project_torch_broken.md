---
name: PyTorch broken install — libtorch_cpu.dylib missing
description: The torch 2.1.1 install in the project venv is missing libtorch_cpu.dylib, causing FinBERT to silently fail and return 0.0 for every article on /api/sentiment/by_ticker
type: project
---

The venv at `Stock-Tracker-by-Sakxam/venv` has `torch==2.1.1` installed but `libtorch_cpu.dylib` is absent from `torch/lib/`. The wheel that was installed is corrupt or was from a mismatched build (likely pulled via an older pip that fetched a pre-release or non-matching wheel for Apple Silicon Python 3.9). `libtorch_python.dylib` dynamically links to `@rpath/libtorch_cpu.dylib` via otool, so `import torch` raises `ImportError: dlopen ... Library not loaded: @rpath/libtorch_cpu.dylib` at runtime.

**Why:** `SentimentEngine._get_finbert()` catches `BaseException` (which includes `ImportError`), logs a warning at DEBUG level (not visible at default log level), sets `self.use_finbert = False`, and leaves `self._finbert_pipeline = None`. `score_finbert()` then short-circuits to `return None`. `score()` never overwrites the hardcoded `{"score": 0.0, "model_used": "none"}` default, so the API always returns 0.0 neutral.

**How to apply:** When FinBERT scores are all 0.0 and `model_used` is `"none"` instead of `"finbert"`, the first diagnostic step is `import torch` inside the venv. Fix requires reinstalling torch from the correct Apple Silicon wheel: `pip install --force-reinstall torch==2.1.2` (or newer) from the PyTorch official index for macOS arm64.
