"""한국 개인정보 탐지와 가리기 (순수 텍스트 처리)."""
from __future__ import annotations

import re
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Callable, Iterable, Iterator

from ...core.korean import looks_like_name

KIND_LABELS = {
    "rrn": "주민등록번호",
    "phone": "전화번호",
    "card": "카드번호",
    "account": "계좌번호",
    "email": "이메일",
    "passport": "여권번호",
    "driver": "운전면허번호",
    "plate": "차량번호",
    "name": "이름",
    "address": "주소",
    "bizno": "사업자번호",
    "ip": "IP 주소",
    "custom": "지정한 말",
}
DEFAULT_KINDS = [k for k in KIND_LABELS if k not in ("bizno", "ip", "custom")]
# 겹칠 때 먼저 차지하는 순서
PRIORITY = ["custom", "rrn", "card", "driver", "passport", "bizno", "phone", "account", "email", "plate", "address", "name", "ip"]
MODES = ("partial", "full", "tag")


@dataclass(frozen=True)
class Finding:
    kind: str
    start: int
    end: int
    value: str

    def to_dict(self) -> dict:
        return {"kind": self.kind, "label": KIND_LABELS[self.kind], "start": self.start, "end": self.end, "value": self.value}


ND = r"(?<!\d)"  # 앞이 숫자가 아님 (\b는 한글 옆에서 동작하지 않는다)
NA = r"(?!\d)"

RRN_RE = re.compile(ND + r"(\d{2})(\d{2})(\d{2})(\s?[-–]\s?|\s?)([1-8])(\d{6})" + NA)
MOBILE_RE = re.compile(ND + r"(?:(?:\+82|0082)[-.\s]?0?|0)1[016789][-.\s)]?\d{3,4}[-.\s]?\d{4}" + NA)
LANDLINE_RE = re.compile(ND + r"(?:(?:\+82|0082)[-.\s]?0?|0)(?:2|[3-6][1-5]|70|50[2-8])[-.\s)]{0,2}\d{3,4}[-.\s]?\d{4}" + NA)
CARD_RE = re.compile(ND + r"\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}" + NA)
AMEX_RE = re.compile(ND + r"3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}" + NA)
ACCOUNT_HYPHEN_RE = re.compile(r"(?<![\d-])\d{2,6}(?:-\d{2,7}){1,3}(?![\d-])")
ACCOUNT_PLAIN_RE = re.compile(ND + r"\d{10,14}" + NA)
ACCOUNT_CONTEXT_RE = re.compile(
    r"(계좌|입금|송금|이체|예금주|은행|뱅크|농협|국민|신한|우리|하나|기업|카카오|토스|우체국|새마을|수협|신협|씨티|SC제일|케이뱅크|부산|대구|경남|광주|전북|제주)"
)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PASSPORT_RE = re.compile(r"(?<![A-Za-z0-9])[MSRODG](?:\d{8}|\d{3}[A-Z]\d{4})(?![A-Za-z0-9])")
DRIVER_RE = re.compile(ND + r"\d{2}-\d{2}-\d{6}-\d{2}" + NA)
PLATE_RE = re.compile(
    r"(?<![\d가-힣])(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s?)?"
    r"\d{2,3}\s?[가나다라마거너더러머버서어저고노도로모보소오조구누두루무부수우주아바사자배하허호]\s?\d{4}" + NA
)
BIZNO_RE = re.compile(ND + r"\d{3}-\d{2}-\d{5}" + NA)
IP_RE = re.compile(r"(?<![\d.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\d.])")

NAME_LABEL_RE = re.compile(
    r"(?:성명|이름|성함|담당자|보호자|신청인|대표자|작성자|수령인|받는\s?분|예금주|환자명|고객명|피보험자|계약자)\s*[:：]?\s*([가-힣]{2,4})(?![가-힣])"
)
NAME_HONORIFIC_RE = re.compile(
    r"(?<![가-힣])([가-힣]{2,4})\s?(?:님|씨|고객님|환자분|선생님|과장님|대리님|부장님|팀장님|사장님|대표님|교수님|원장님|실장님|주임님)"
)
NAME_STOP = {
    "선생", "고객", "여러", "환자", "회원", "학생", "손님", "사장", "부장", "과장", "대리", "팀장", "실장", "이사",
    "대표", "교수", "기사", "주인", "담당", "작가", "의사", "직원", "상담", "관리", "원장", "형님", "누님", "따님",
    "아드", "부모", "어머", "아버", "할머", "할아", "고모", "이모", "삼촌", "선배", "후배", "동생", "마음", "주임",
    "전문", "신청", "보호", "수강", "구독", "시청", "청취", "사용", "이용", "방문", "정회", "임원", "조합", "강사",
}

# '담당자 연락처'처럼 라벨 뒤에 이름 대신 오는 낱말
LABEL_NOUNS = {
    "연락처", "전화", "전화번호", "번호", "주소", "이메일", "메일", "확인", "변경", "정보", "없음", "미정", "본인", "대리인",
    "담당", "부서", "직위", "직급", "서명", "날인", "인적", "기재", "정정", "작성", "제출", "지정", "배정", "선정", "교체",
}

_PROVINCES = (
    "서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|"
    "충청북도|충청남도|전북특별자치도|전라북도|전라남도|경상북도|경상남도|제주특별자치도|"
    "서울시?|부산시?|대구시?|인천시?|광주시?|대전시?|울산시?|세종시?|경기|강원|충북|충남|전북|전남|경북|경남|제주"
)
ADDRESS_RE = re.compile(
    rf"(?<![가-힣])(?:{_PROVINCES})\s+[가-힣]+(?:시|군|구)(?:\s+[가-힣]+(?:구|읍|면))?\s+"
    r"(?:[가-힣0-9]+(?:로|길)(?:\s?\d+(?:번)?길)?\s?\d+(?:-\d+)?|[가-힣0-9]+(?:동|리|가)\s?\d+(?:-\d+)?(?:번지)?)"
    r"(?:\s*,?\s*(?:[가-힣A-Za-z]+\s?)?\d+동)?(?:\s*\d+층)?(?:\s*\d+호)?"
)


# 사용자가 정한 '항상 가릴 말'과 '가리지 않을 말'. 작업 스레드마다 따로 잡힌다.
_CUSTOM: ContextVar[tuple[tuple[str, ...], tuple[str, ...]]] = ContextVar("mask_custom", default=((), ()))


def clean_words(words: Iterable[str] | None) -> tuple[str, ...]:
    """두 글자 이상인 말만, 긴 것부터 (짧은 말이 긴 말의 일부를 먼저 차지하지 않도록)."""
    return tuple(sorted({w.strip() for w in words or [] if len(w.strip()) >= 2}, key=len, reverse=True))


@contextmanager
def custom_words(always: Iterable[str] | None = None, never: Iterable[str] | None = None) -> Iterator[None]:
    token = _CUSTOM.set((clean_words(always), clean_words(never)))
    try:
        yield
    finally:
        _CUSTOM.reset(token)


def _digits(s: str) -> str:
    return re.sub(r"\D", "", s)


def luhn_ok(number: str) -> bool:
    digits = [int(c) for c in _digits(number)]
    total = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def rrn_checksum_ok(number: str) -> bool:
    d = [int(c) for c in _digits(number)]
    if len(d) != 13:
        return False
    weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5]
    return (11 - sum(a * b for a, b in zip(d, weights)) % 11) % 10 == d[12]


def bizno_checksum_ok(number: str) -> bool:
    d = [int(c) for c in _digits(number)]
    if len(d) != 10:
        return False
    w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    total = sum(a * b for a, b in zip(d, w)) + (d[8] * 5) // 10
    return (10 - total % 10) % 10 == d[9]


def _candidates(text: str) -> Iterable[Finding]:
    for word in _CUSTOM.get()[0]:
        for m in re.finditer(re.escape(word), text):
            yield Finding("custom", m.start(), m.end(), m.group(0))
    for m in RRN_RE.finditer(text):
        month, day, sep = int(m.group(2)), int(m.group(3)), m.group(4)
        if not (1 <= month <= 12 and 1 <= day <= 31):
            continue
        # 2020년 10월 이후 번호는 체크섬을 따르지 않아서, 구분자가 있으면 날짜만 본다.
        context = text[max(0, m.start() - 20) : m.start()]
        if sep.strip() or rrn_checksum_ok(m.group(0)) or "주민" in context or "외국인" in context:
            yield Finding("rrn", m.start(), m.end(), m.group(0))
    for rx in (MOBILE_RE, LANDLINE_RE):
        for m in rx.finditer(text):
            yield Finding("phone", m.start(), m.end(), m.group(0))
    for rx in (CARD_RE, AMEX_RE):
        for m in rx.finditer(text):
            if luhn_ok(m.group(0)):
                yield Finding("card", m.start(), m.end(), m.group(0))
    for m in BIZNO_RE.finditer(text):
        yield Finding("bizno", m.start(), m.end(), m.group(0))
    for m in ACCOUNT_HYPHEN_RE.finditer(text):
        value = m.group(0)
        n = len(_digits(value))
        groups = value.count("-") + 1
        if not 10 <= n <= 14 or re.fullmatch(r"\d{3}-\d{2}-\d{5}", value):
            continue
        context = text[max(0, m.start() - 20) : m.start()]
        if groups >= 3 or ACCOUNT_CONTEXT_RE.search(context):
            yield Finding("account", m.start(), m.end(), value)
    for m in ACCOUNT_PLAIN_RE.finditer(text):
        context = text[max(0, m.start() - 20) : m.start()]
        if ACCOUNT_CONTEXT_RE.search(context):
            yield Finding("account", m.start(), m.end(), m.group(0))
    for m in EMAIL_RE.finditer(text):
        yield Finding("email", m.start(), m.end(), m.group(0))
    for m in PASSPORT_RE.finditer(text):
        yield Finding("passport", m.start(), m.end(), m.group(0))
    for m in DRIVER_RE.finditer(text):
        yield Finding("driver", m.start(), m.end(), m.group(0))
    for m in PLATE_RE.finditer(text):
        yield Finding("plate", m.start(), m.end(), m.group(0))
    for m in ADDRESS_RE.finditer(text):
        yield Finding("address", m.start(), m.end(), m.group(0))
    for m in NAME_LABEL_RE.finditer(text):
        if looks_like_name(m.group(1)) and m.group(1) not in LABEL_NOUNS:
            yield Finding("name", m.start(1), m.end(1), m.group(1))
    for m in NAME_HONORIFIC_RE.finditer(text):
        word = m.group(1)
        if word[:2] not in NAME_STOP and looks_like_name(word):
            yield Finding("name", m.start(1), m.end(1), word)
    for m in IP_RE.finditer(text):
        yield Finding("ip", m.start(), m.end(), m.group(0))


def detect(text: str, kinds: Iterable[str] | None = None) -> list[Finding]:
    enabled = set(kinds) if kinds is not None else set(DEFAULT_KINDS)
    always, never = _CUSTOM.get()
    if always:
        enabled.add("custom")
    # '가리지 않을 말'과 겹치는 후보는 처음부터 뺀다. (다른 종류로 다시 잡히지 않도록)
    keep_out = [(m.start(), m.end()) for w in never for m in re.finditer(re.escape(w), text)]
    found = [f for f in set(_candidates(text)) if not any(f.start < e and s < f.end for s, e in keep_out)]
    rank = {k: i for i, k in enumerate(PRIORITY)}
    cands = sorted(found, key=lambda f: (rank[f.kind], -(f.end - f.start), f.start))
    taken: list[Finding] = []
    for f in cands:
        if any(f.start < t.end and t.start < f.end for t in taken):
            continue
        taken.append(f)
    # 전부 탐지하고 겹침을 정리한 다음에 거른다. (예: 전화번호를 끈 경우 계좌로 오인하지 않도록)
    return sorted((f for f in taken if f.kind in enabled), key=lambda f: f.start)


def _star_range(value: str, keep: Callable[[int, int], bool]) -> str:
    """숫자/글자 순번(i, 전체 n)에 대해 keep이 False인 것만 *로 바꾼다. 구분자는 그대로."""
    idxs = [i for i, c in enumerate(value) if c.isalnum() or "가" <= c <= "힣"]
    n = len(idxs)
    chars = list(value)
    for order, i in enumerate(idxs):
        if not keep(order, n):
            chars[i] = "*"
    return "".join(chars)


def _star_groups(value: str, which: Callable[[int, int], bool]) -> str:
    groups = list(re.finditer(r"\d+", value))
    chars = list(value)
    for gi, g in enumerate(groups):
        if which(gi, len(groups)):
            for i in range(g.start(), g.end()):
                chars[i] = "*"
    return "".join(chars)


def mask_value(f: Finding, mode: str = "partial") -> str:
    v = f.value
    if mode == "tag":
        return f"[{KIND_LABELS[f.kind]}]"
    if mode == "full":
        return re.sub(r"[0-9A-Za-z가-힣]", "*", v)
    k = f.kind
    if k == "rrn":
        return _star_range(v, lambda i, n: i < 7)
    if k == "phone":
        return _star_groups(v, lambda gi, n: n >= 3 and gi == n - 2) if len(re.findall(r"\d+", v)) >= 3 else _star_range(v, lambda i, n: i < 3 or i >= n - 4)
    if k == "card":
        return _star_range(v, lambda i, n: i < 4 or i >= n - 4)
    if k in ("account", "bizno"):
        return _star_range(v, lambda i, n: i >= n - 4)
    if k == "email":
        local, _, domain = v.partition("@")
        keep = 0 if len(local) <= 1 else max(1, min(2, len(local) // 3))
        return local[:keep] + "*" * (len(local) - keep) + "@" + domain
    if k in ("passport", "driver"):
        return _star_range(v, lambda i, n: i < 2)
    if k == "plate":
        return _star_range(v, lambda i, n: i < n - 4)
    if k == "name":
        if len(v) == 2:
            return v[0] + "*"
        return v[0] + "*" * (len(v) - 2) + v[-1]
    if k == "address":
        parts = re.split(r"(\s+)", v)
        out, words = [], 0
        for p in parts:
            if p.strip():
                words += 1
                out.append(p if words <= 2 else re.sub(r"[0-9A-Za-z가-힣]", "*", p))
            else:
                out.append(p)
        return "".join(out)
    if k == "ip":
        return _star_groups(v, lambda gi, n: gi == n - 1)
    if k == "custom":
        return v[0] + re.sub(r"[0-9A-Za-z가-힣]", "*", v[1:])
    return re.sub(r"\S", "*", v)


def mask_text(text: str, kinds: Iterable[str] | None = None, mode: str = "partial") -> tuple[str, list[Finding]]:
    findings = detect(text, kinds)
    out = text
    for f in reversed(findings):
        out = out[: f.start] + mask_value(f, mode) + out[f.end :]
    return out, findings


def remap_runs(runs: list[str], findings: list[Finding], mode: str) -> list[str]:
    """여러 조각(run)으로 나뉜 문단에 마스킹을 적용한다.

    가린 값의 길이가 원래와 같으면 글자 단위로 원래 조각에 돌려놔서 서식이 유지된다.
    길이가 다르면(태그 모드) 시작 조각에 넣고 나머지 조각에서는 지운다.
    """
    owner: list[int] = []
    for ri, r in enumerate(runs):
        owner.extend([ri] * len(r))
    full = "".join(runs)
    out: list[list[str]] = [[] for _ in runs]
    pos = 0
    for f in findings:
        for i in range(pos, f.start):
            out[owner[i]].append(full[i])
        rep = mask_value(f, mode)
        if len(rep) == f.end - f.start:
            for i, ch in enumerate(rep):
                out[owner[f.start + i]].append(ch)
        else:
            out[owner[f.start]].append(rep)
        pos = f.end
    for i in range(pos, len(full)):
        out[owner[i]].append(full[i])
    return ["".join(o) for o in out]


def summarize_findings(findings: Iterable[Finding]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for f in findings:
        counts[f.kind] = counts.get(f.kind, 0) + 1
    return counts
