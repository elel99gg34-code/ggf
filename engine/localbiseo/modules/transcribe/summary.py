"""요약: 로컬 AI 모델이 있으면 그걸 쓰고, 없으면 핵심 문장 추출."""
from __future__ import annotations

import math
from collections import Counter

from ...core import llm
from ...core.korean import content_words, split_sentences

KEY_HINTS = ("결정", "합의", "결론", "중요", "요약", "마감", "까지", "확정", "문제", "이슈", "목표", "다음", "예산", "일정")


def extractive(text: str, max_sentences: int = 5) -> list[str]:
    sentences = [s for _, _, s in split_sentences(text) if len(s) >= 8]
    if len(sentences) <= max_sentences:
        return sentences
    freq = Counter(w for s in sentences for w in content_words(s))
    if not freq:
        return sentences[:max_sentences]
    top = freq.most_common(1)[0][1]
    scores = []
    for i, s in enumerate(sentences):
        words = set(content_words(s))
        if not words:
            scores.append(0.0)
            continue
        score = sum(freq[w] / top for w in words) / math.sqrt(len(words) + 1)
        if any(h in s for h in KEY_HINTS):
            score *= 1.3
        if i < len(sentences) * 0.1:
            score *= 1.1
        scores.append(score)
    picked = sorted(sorted(range(len(sentences)), key=lambda i: scores[i], reverse=True)[:max_sentences])
    return [sentences[i] for i in picked]


def summarize(text: str, max_sentences: int = 5) -> dict:
    if llm.available() and len(text) > 200:
        prompt = (
            "다음은 회의/강의 녹취록이야. 핵심 내용을 한국어 글머리표 3~6개로 요약해. "
            "결정된 사항과 해야 할 일이 있으면 꼭 포함해. 녹취록에 없는 내용은 쓰지 마.\n\n" + text[:12000]
        )
        try:
            out = llm.complete(prompt, max_tokens=600)
            lines = [l.strip(" -•*\t") for l in out.splitlines() if l.strip(" -•*\t")]
            if lines:
                return {"method": "llm", "points": lines}
        except Exception:  # noqa: BLE001 - 모델 실패 시 규칙 기반으로 넘어간다
            pass
    return {"method": "extractive", "points": extractive(text, max_sentences)}
