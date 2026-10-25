"""한글 처리 유틸: 자모 분해/조합, 문장 분리, 조사 떼기, 성씨."""
from __future__ import annotations

import re

HANGUL_BASE = 0xAC00
HANGUL_LAST = 0xD7A3

# 종성 인덱스
JONG_NONE, JONG_M, JONG_B, JONG_SS = 0, 16, 17, 20
# 중성 인덱스
JUNG_A, JUNG_AE, JUNG_EO, JUNG_E, JUNG_YEO, JUNG_O, JUNG_WA, JUNG_U, JUNG_WO, JUNG_EU, JUNG_I = 0, 1, 4, 5, 6, 8, 9, 13, 14, 18, 20

SURNAMES_1 = set(
    "김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경사부가복태목형피두감음빈동온호범좌팽승간상갈시화견당라"
)
SURNAMES_2 = {"남궁", "황보", "제갈", "선우", "독고", "사공", "서문", "동방", "어금", "망절"}


def is_hangul(ch: str) -> bool:
    return len(ch) == 1 and HANGUL_BASE <= ord(ch) <= HANGUL_LAST


def decompose(ch: str) -> tuple[int, int, int]:
    code = ord(ch) - HANGUL_BASE
    return code // 588, (code % 588) // 28, code % 28


def compose(cho: int, jung: int, jong: int = 0) -> str:
    return chr(HANGUL_BASE + cho * 588 + jung * 28 + jong)


def jong_of(ch: str) -> int:
    return decompose(ch)[2] if is_hangul(ch) else -1


def has_jong(ch: str) -> bool:
    return jong_of(ch) > 0


def with_jong(ch: str, jong: int) -> str:
    cho, jung, _ = decompose(ch)
    return compose(cho, jung, jong)


def with_jung(ch: str, jung: int) -> str:
    cho, _, jong = decompose(ch)
    return compose(cho, jung, jong)


def looks_like_name(word: str) -> bool:
    if not 2 <= len(word) <= 4 or not all(is_hangul(c) for c in word):
        return False
    if len(word) == 4:
        return word[:2] in SURNAMES_2
    return word[0] in SURNAMES_1 or word[:2] in SURNAMES_2


_SENT_RE = re.compile(r"[^\n.!?。]*(?:[.!?。]+|\n|$)")


def split_sentences(text: str) -> list[tuple[int, int, str]]:
    """(시작, 끝, 문장) 목록. 빈 문장은 뺀다."""
    out = []
    for m in _SENT_RE.finditer(text):
        raw = m.group(0)
        if not raw.strip():
            continue
        lead = len(raw) - len(raw.lstrip())
        s = m.start() + lead
        sentence = raw.strip()
        out.append((s, s + len(sentence), sentence))
    return out


JOSA = sorted(
    [
        "이었습니다", "였습니다", "입니다", "합니다", "했습니다", "됩니다", "에서는", "으로는", "에게서", "한테서",
        "에서", "으로", "에게", "한테", "께서", "부터", "까지", "처럼", "보다", "이라", "라고", "이고", "하고",
        "에는", "와는", "과는", "이나", "든지", "마다", "조차", "밖에", "만큼", "이다", "했다", "한다", "하는",
        "해서", "하면", "하여", "되어", "되는", "된다", "은", "는", "이", "가", "을", "를", "에", "의", "도",
        "만", "와", "과", "로", "고", "요",
    ],
    key=len,
    reverse=True,
)

STOPWORDS = {
    "그리고", "그런데", "그래서", "하지만", "그러나", "그러면", "이제", "일단", "근데", "그냥", "진짜", "정말",
    "약간", "조금", "많이", "너무", "이번", "저희", "우리", "제가", "저는", "그거", "이거", "저거", "그게",
    "이게", "뭔가", "어떤", "이런", "그런", "저런", "다시", "또한", "그래", "네네", "아니", "있는", "없는",
    "있습니다", "없습니다", "그렇죠", "그렇게", "이렇게", "같은", "같습니다", "말씀", "생각", "부분", "경우",
}

_WORD_RE = re.compile(r"[가-힣A-Za-z0-9]+")


def strip_josa(word: str) -> str:
    if len(word) <= 1 or not is_hangul(word[-1]):
        return word
    for j in JOSA:
        if word.endswith(j) and len(word) - len(j) >= 2:
            return word[: -len(j)]
    return word


def content_words(text: str) -> list[str]:
    words = []
    for raw in _WORD_RE.findall(text):
        w = strip_josa(raw)
        if len(w) >= 2 and w not in STOPWORDS and not w.isdigit():
            words.append(w.lower())
    return words
