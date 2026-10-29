"""요약: 로컬 AI 모델이 있으면 그걸 쓰고, 없으면 핵심 문장 추출."""
from __future__ import annotations

import math
import re
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


DECIDED_RE = re.compile(r"(정했|정하기로|정해졌|확정|결정|합의|승인|채택|하기로\s?했|가기로\s?했|으?로\s?(?:했|하겠|갑니다|가겠|가죠|하죠)|최종)")
UNDECIDED_RE = re.compile(r"(못\s?했|안\s?했|보류|미정|아직|다음에\s?(?:결정|정하)|정해지지|결정되지|할까요|할지|\?)")


def decisions(text: str, actions: list[dict] | None = None) -> list[str]:
    """'~로 결정했다', '~하기로 했다' 같은 결정 사항 문장. 할 일로 뽑힌 문장은 뺀다."""
    action_texts = [a["text"] for a in actions or []]
    out: list[str] = []
    for _, _, s in split_sentences(text):
        s = s.strip(" -•*")
        if len(s) < 6 or not DECIDED_RE.search(s) or UNDECIDED_RE.search(s):
            continue
        if any(a in s or s in a for a in action_texts) or s in out:
            continue
        out.append(s)
    return out[:10]


# 동사·형용사로 끝나는 말은 주요 낱말에서 뺀다.
_VERB_ENDINGS = (
    "니다", "어요", "아요", "해요", "에요", "예요", "했어", "했고", "하고", "하는", "해서", "어서", "아서", "했다", "한다",
    "하면", "하자", "겠습", "겠어", "겠다", "네요", "세요", "는데", "지만", "면서", "니까", "거든", "기로", "도록", "려고",
    "했던", "하던", "되는", "되면", "됐", "시죠", "다", "요", "죠", "까", "며",
)


# 회의마다 나오는 말이라 주요 낱말로는 쓸모가 없다.
_COMMON_WORDS = {"다음", "오늘", "내일", "어제", "지금", "나중", "정도", "여기", "거기", "확인", "진행", "관련", "내용", "얘기", "이야기", "회의"}


def keywords(text: str, top: int = 8) -> list[dict]:
    """여러 번 나온 명사 위주의 주요 낱말."""
    words = [
        w for w in content_words(text)
        if not w[0].isdigit() and not w.endswith(_VERB_ENDINGS) and w not in _COMMON_WORDS
    ]
    return [{"word": w, "count": n} for w, n in Counter(words).most_common(top) if n >= 2]
