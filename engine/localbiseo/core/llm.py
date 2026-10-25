"""선택 기능: 로컬 GGUF 모델(llama.cpp)로 문장 생성.

모델 파일이 models/llm/*.gguf 에 있고 llama-cpp-python이 설치돼 있을 때만 켜진다.
없으면 각 기능은 규칙 기반 처리로 동작한다.
"""
from __future__ import annotations

import threading
from pathlib import Path

from . import optional
from .config import sub_dir

_lock = threading.Lock()
_model = None
_model_path: str | None = None


def model_file() -> Path | None:
    files = sorted(sub_dir("llm", sub_dir("models")).glob("*.gguf"))
    return files[0] if files else None


def available() -> bool:
    return optional.has_module("llama_cpp") and model_file() is not None


def complete(prompt: str, max_tokens: int = 512, temperature: float = 0.3) -> str:
    global _model, _model_path
    path = model_file()
    if not optional.has_module("llama_cpp") or path is None:
        raise RuntimeError("로컬 AI 모델이 없어요.")
    with _lock:
        if _model is None or _model_path != str(path):
            from llama_cpp import Llama

            _model = Llama(model_path=str(path), n_ctx=4096, verbose=False)
            _model_path = str(path)
        out = _model.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
    return out["choices"][0]["message"]["content"].strip()
