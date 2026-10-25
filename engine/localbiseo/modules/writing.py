"""맞춤법 교정(자주 틀리는 표현), 문체 바꾸기(해요체/합니다체/공문체), 이메일 틀."""
from __future__ import annotations

import re
from typing import Callable

from fastapi import APIRouter
from pydantic import BaseModel

from ..core import llm
from ..core.errors import AppError
from ..core.korean import (
    JONG_B, JONG_M, JONG_NONE, JONG_SS, JUNG_A, JUNG_AE, JUNG_E, JUNG_EO, JUNG_EU, JUNG_I, JUNG_O, JUNG_U, JUNG_WA, JUNG_WO,
    JUNG_YEO, compose, decompose, has_jong, is_hangul, jong_of, with_jong,
)

router = APIRouter(prefix="/writing", tags=["글다듬기"])

JONG_L = 8
JUNG_WAE, JUNG_OE = 10, 11

# (정규식, 바꿀 말, 이유)
SPELL_RULES: list[tuple[str, str | Callable[[re.Match], str], str]] = [
    (r"몇\s?일", "며칠", "'몇 일'이 아니라 '며칠'이 맞아요."),
    (r"어의\s?없", "어이없", "'어의없다'가 아니라 '어이없다'예요."),
    (r"금새", "금세", "'금시에'의 준말이라 '금세'예요."),
    (r"왠(만|일)", r"웬\1", "'웬만하다·웬일'이 맞아요. ('왠지'만 '왠')"),
    (r"왠(?=\s)", "웬", "'어찌 된'의 뜻이면 '웬'이에요."),
    (r"오랫만", "오랜만", "'오래간만'의 준말이라 '오랜만'이에요."),
    (r"(?<=[할갈볼줄올될쓸릴낼칠울])께(?=요|[\s.!?,]|$)", "게", "'-ㄹ게'가 맞아요. ('-ㄹ께' ×)"),
    (r"안\s?되(?=요|[.!?]|$)", "안 돼", "'되어'의 준말이라 '돼'예요."),
    (r"(?<![가-힣])되(?=요|서|야|[.!?]|$)", "돼", "'되어'의 준말이라 '돼'예요."),
    (r"(?<=[가-힣])되(?=요(?:[\s.!?,]|$)|서\s)", "돼", "'되어'의 준말이라 '돼'예요."),
    (r"됬", "됐", "'되었'의 준말이라 '됐'이에요."),
    (r"않\s?(하|되|돼)", r"안 \1", "뒤에 동사가 오면 '안'을 써요. ('않'은 '-지 않다')"),
    (r"일부로", "일부러", "'일부러'가 맞아요."),
    (r"설겆이", "설거지", "'설거지'가 표준어예요."),
    (r"희안", "희한", "'희한하다'가 맞아요."),
    (r"(깨끗|틈틈|일일|곰곰|번번|깊숙|따뜻|느긋)히", r"\1이", "'-이'로 적는 말이에요."),
    (r"(솔직|꼼꼼|열심|조용|급)이(?=[\s.,!?]|$)", r"\1히", "'-히'로 적는 말이에요."),
    (r"역활", "역할", "'역할(役割)'이 맞아요."),
    (r"어떻해", "어떡해", "'어떻게 해'의 준말은 '어떡해'예요."),
    (r"뵈요", "봬요", "'뵈어요'의 준말이라 '봬요'예요."),
    (r"문안하", "무난하", "'무난하다(無難)'가 맞아요."),
    (r"구지(?=\s)", "굳이", "'굳이'가 맞아요."),
    (r"요세(?=\s|[.,!?]|$)", "요새", "'요사이'의 준말이라 '요새'예요."),
    (r"제작년", "재작년", "'재작년(再昨年)'이 맞아요."),
    (r"내노라", "내로라", "'내로라하다'가 맞아요."),
    (r"짜집기", "짜깁기", "'짜깁기'가 맞아요."),
    (r"얼만큼", "얼마큼", "'얼마만큼'의 준말은 '얼마큼'이에요."),
    (r"넓직", "널찍", "'널찍하다'가 맞아요."),
    (r"(?<=[있었했겠없])슴(?=[\s.!?,]|$)", "음", "'-음'으로 적어요. ('-슴' ×)"),
    (r"바래(요|서|야)", r"바라\1", "'바라다(희망)'의 활용은 '바라요'예요."),
    (r"바랬", "바랐", "'바라다'의 과거는 '바랐다'예요."),
    (r"\s+([.,!?])", r"\1", "문장부호 앞은 띄우지 않아요."),
    (r"[ \t]{2,}", " ", "빈칸이 두 번 이상 들어갔어요."),
]


SPACING_TAILS = ("수", "때", "것", "줄", "뿐", "만큼")


def _fix_spacing(text: str, changes: list[dict]) -> str:
    """'할수있다' → '할 수 있다'처럼 ㄹ 받침 뒤 의존명사를 띄운다."""
    out = []
    i = 0
    count = 0
    while i < len(text):
        ch = text[i]
        out.append(ch)
        if is_hangul(ch) and jong_of(ch) == JONG_L and i + 1 < len(text):
            for tail in SPACING_TAILS:
                if text.startswith(tail, i + 1):
                    after = text[i + 1 + len(tail) : i + 2 + len(tail)]
                    # '할수록', '갈때기'처럼 붙여 쓰는 말은 빼고, 뒤가 빈칸·조사·용언일 때만
                    if tail == "수" and text.startswith("수록", i + 1):
                        break
                    if after and after not in " 있없도는가를이에.,!?\n":
                        break
                    out.append(" ")
                    count += 1
                    break
        if ch == "수" and i + 1 < len(text) and text[i + 1] in "있없" and out[-2:-1] == [" "]:
            out.append(" ")
        i += 1
    if count:
        changes.append({"before": "할수", "after": "할 수", "reason": "의존명사(수·때·것·줄)는 띄어 써요.", "count": count})
    return "".join(out)


def spellcheck(text: str) -> dict:
    changes: list[dict] = []
    out = text
    for pattern, repl, reason in SPELL_RULES:
        rx = re.compile(pattern)
        found = list(rx.finditer(out))
        if not found:
            continue
        m0 = found[0]
        context = out[max(0, m0.start() - 2) : m0.end() + 2]
        before = context
        after = rx.sub(repl, context)
        out, n = rx.subn(repl, out)
        if before != after:
            changes.append({"before": before.strip() or "␣␣", "after": after.strip() or "␣", "reason": reason, "count": n})
    # ㄹ 받침 + 려고: 할려고 → 하려고
    rx = re.compile(r"([가-힣])려고")
    def _ryeo(m: re.Match) -> str:
        c = m.group(1)
        return (with_jong(c, JONG_NONE) if jong_of(c) == JONG_L and c not in "갈멀알열걸들살놀만" else c) + "려고"
    new = rx.sub(_ryeo, out)
    if new != out:
        changes.append({"before": "할려고", "after": "하려고", "reason": "'-려고' 앞에 ㄹ을 덧붙이지 않아요.", "count": 1})
        out = new
    out = _fix_spacing(out, changes)
    return {"text": out, "changes": changes}


# ---------------- 문체 ----------------
END_RE = re.compile(r"([가-힣]+)([.!?…~]*)(?=\s|$|[\"')\]])")

POLITE_TO_FORMAL_WORDS = {
    "아니에요": "아닙니다", "아녜요": "아닙니다", "거예요": "것입니다", "거에요": "것입니다", "해요": "합니다", "돼요": "됩니다",
    "아파요": "아픕니다", "바빠요": "바쁩니다", "나빠요": "나쁩니다", "기뻐요": "기쁩니다", "슬퍼요": "슬픕니다", "예뻐요": "예쁩니다",
    "써요": "씁니다", "꺼요": "끕니다", "떠요": "뜹니다", "커요": "큽니다", "몰라요": "모릅니다", "달라요": "다릅니다", "빨라요": "빠릅니다",
    "골라요": "고릅니다", "불러요": "부릅니다", "도와요": "돕습니다", "들어요": "듣습니다", "걸어요": "걷습니다", "지어요": "짓습니다",
    "나아요": "낫습니다", "그래요": "그렇습니다", "이래요": "이렇습니다", "저래요": "저렇습니다", "어때요": "어떻습니까", "줘요": "줍니다",
}


# 합니다체로 바꾸면 뜻이 달라지는 어미는 그대로 둔다.
KEEP_ENDINGS = ("지요", "죠", "네요", "데요", "군요", "거든요", "까요", "래요", "대요", "잖아요", "던데요", "는걸요")


def _polite_word_to_formal(word: str, question: bool) -> str | None:
    """해요체 어절 하나를 합니다체로. 바꿀 수 없으면 None."""
    tail = "니까" if question else "니다"
    for k, v in POLITE_TO_FORMAL_WORDS.items():
        if word.endswith(k):
            v = v[:-2] + "니까" if question and v.endswith("니다") else v
            return word[: -len(k)] + v
    for k, v in (("이에요", "입"), ("예요", "입"), ("에요", "입")):
        if word.endswith(k):
            return word[: -len(k)] + v + tail
    if word.endswith(("을게요", "을께요")):
        return word[:-3] + "겠습" + tail
    if word.endswith(("게요", "께요")) and len(word) > 2 and jong_of(word[-3]) == JONG_L:
        return word[:-3] + with_jong(word[-3], JONG_NONE) + "겠습" + tail
    if word.endswith("세요"):
        return word[:-2] + ("십니까" if question else "십시오")
    if word.endswith("나요") and len(word) > 2 and is_hangul(word[-3]):
        stem = word[:-2]
        if has_jong(stem[-1]):
            return stem + "습" + tail
        return stem[:-1] + with_jong(stem[-1], JONG_B) + tail
    if word.endswith(KEEP_ENDINGS):
        return None
    if not word.endswith("요") or len(word) < 2:
        return None
    stem = word[:-1]
    last = stem[-1]
    if not is_hangul(last):
        return None
    if stem.endswith(("어", "아")) and len(stem) >= 2 and is_hangul(stem[-2]):
        prev = stem[-2]
        j = jong_of(prev)
        if j == JONG_L:  # 알아요 → 압니다, 만들어요 → 만듭니다
            return stem[:-2] + with_jong(prev, JONG_B) + tail
        if j > 0:  # 있어요 → 있습니다
            return stem[:-1] + "습" + tail
        return None
    cho, jung, jong = decompose(last)
    if jong:
        return None
    if last == "워" and len(stem) >= 2:  # 어려워요 → 어렵습니다
        return stem[:-2] + with_jong(stem[-2], JONG_B) + "습" + tail
    new_jung = {JUNG_YEO: JUNG_I, JUNG_WA: JUNG_O, JUNG_WO: JUNG_U, JUNG_WAE: JUNG_OE}.get(jung, jung)
    if jung in (JUNG_A, JUNG_AE, JUNG_EO, JUNG_E, JUNG_YEO, JUNG_WA, JUNG_WO, JUNG_WAE, JUNG_I, JUNG_O, JUNG_U, JUNG_OE):
        return stem[:-1] + compose(cho, new_jung, JONG_B) + tail
    return None


def _formal_word_to_polite(word: str, question: bool) -> str | None:
    q = "?" if question else ""
    special = {"합니다": "해요", "합니까": "해요", "됩니다": "돼요", "됩니까": "돼요", "아닙니다": "아니에요", "아닙니까": "아니에요",
               "십시오": "세요", "십니다": "세요", "십니까": "세요", "것입니다": "거예요", "것입니까": "거예요",
               "겁니다": "거예요", "압니다": "알아요", "만듭니다": "만들어요", "엽니다": "열어요", "놉니다": "놀아요"}
    for k, v in special.items():
        if word.endswith(k):
            return word[: -len(k)] + v
    for k in ("입니다", "입니까"):
        if word.endswith(k):
            stem = word[: -len(k)]
            if not stem:
                return None
            return stem + ("이에요" if has_jong(stem[-1]) else "예요")
    for k in ("습니다", "습니까"):
        if word.endswith(k) and len(word) > 3:
            stem = word[: -len(k)]
            last = stem[-1]
            if not is_hangul(last):
                return None
            if stem.endswith(IRREGULAR_B):
                return stem[:-1] + with_jong(last, JONG_NONE) + "워요"
            if stem.endswith("돕"):
                return stem[:-1] + "도와요"
            _, jung, jong = decompose(last)
            if jong == JONG_SS:
                return stem + "어요"
            return stem + ("아요" if jung in (JUNG_A, JUNG_O, 2) else "어요")
    for k in ("니다", "니까"):
        if word.endswith(k) and len(word) > 2:
            stem = word[: -len(k)]
            last = stem[-1]
            if not is_hangul(last) or jong_of(last) != JONG_B:
                return None
            cho, jung, _ = decompose(last)
            base = stem[:-1]
            if jung == JUNG_O:
                return base + compose(cho, JUNG_WA) + "요"
            if jung == JUNG_U:
                return base + compose(cho, JUNG_WO) + "요"
            if jung == JUNG_OE:
                return base + compose(cho, JUNG_WAE) + "요"
            if jung == JUNG_I:
                return base + compose(cho, JUNG_YEO) + "요"
            if jung == JUNG_EU:
                prev_jung = decompose(base[-1])[1] if base and is_hangul(base[-1]) else JUNG_EO
                return base + compose(cho, JUNG_A if prev_jung in (JUNG_A, JUNG_O) else JUNG_EO) + "요"
            return base + compose(cho, jung) + "요"
    return None


IRREGULAR_B = ("어렵", "쉽", "고맙", "반갑", "덥", "춥", "가볍", "무겁", "귀엽", "즐겁", "아름답", "새롭", "어둡", "맵", "가깝", "아깝", "부럽", "그립", "더럽", "시끄럽")


def _formal_word_to_official(word: str) -> str | None:
    if word.endswith("습니다"):
        stem = word[:-3]
        if stem.endswith(IRREGULAR_B):  # 어렵습니다 → 어려움
            return stem[:-1] + with_jong(stem[-1], JONG_NONE) + "움"
        return stem + "음"
    if word.endswith("니다") and len(word) > 2 and jong_of(word[-3]) == JONG_B:
        return word[:-3] + with_jong(word[-3], JONG_M)
    if word.endswith("십시오"):
        return word[:-3] + "시기 바람"
    return None


def _convert(text: str, fn: Callable[[str, bool], str | None]) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        word, punct = m.group(1), m.group(2)
        # 문장 끝 어절만 바꾼다 (문장부호가 있거나 줄 끝).
        end = m.end()
        at_end = bool(punct) or end == len(text) or text[end] == "\n"
        if not at_end:
            return m.group(0)
        new = fn(word, "?" in punct)
        if new and new != word:
            count += 1
            return new + punct
        return m.group(0)

    return END_RE.sub(repl, text), count


STYLES = {"formal": "합니다체", "polite": "해요체", "official": "공문체(~함/~임)"}


def change_tone(text: str, style: str) -> dict:
    if style not in STYLES:
        raise AppError("문체는 formal, polite, official 중 하나예요.")
    if style == "polite":
        out, n = _convert(text, _formal_word_to_polite)
    else:
        out, n = _convert(text, _polite_word_to_formal)
        if style == "official":
            out, n2 = _convert(out, lambda w, q: _formal_word_to_official(w))
            n = max(n, n2)
            # 개조식은 '~함', '~음' 뒤에 마침표를 찍지 않는다.
            out = re.sub(r"([가-힣])\.(?=\s|$)", lambda m: m.group(1) if jong_of(m.group(1)) == JONG_M else m.group(0), out)
    return {"text": out, "changed": n, "style": STYLES[style]}


def email(body: str, recipient: str = "", sender: str = "", company: str = "", subject: str = "", style: str = "formal") -> dict:
    content = change_tone(body, "formal" if style == "formal" else "polite")["text"].strip()
    to = f"{recipient}님" if recipient and not recipient.endswith("님") else recipient
    me = f"{company} {sender}".strip()
    lines = []
    lines.append(f"안녕하세요, {to}." if to else "안녕하세요.")
    if me:
        lines.append(f"{me}입니다.")
    lines += ["", content, ""]
    lines.append("확인 부탁드립니다." if style == "formal" else "확인 부탁드려요.")
    lines.append("감사합니다.")
    if sender:
        lines += ["", f"{me} 드림"]
    return {"subject": subject or (content.splitlines()[0][:30] if content else ""), "text": "\n".join(lines)}


class TextIn(BaseModel):
    text: str


class ToneIn(BaseModel):
    text: str
    style: str = "formal"
    use_ai: bool = False


class EmailIn(BaseModel):
    body: str
    recipient: str = ""
    sender: str = ""
    company: str = ""
    subject: str = ""
    style: str = "formal"


@router.post("/spell")
def spell_api(body: TextIn):
    return spellcheck(body.text)


@router.post("/tone")
def tone_api(body: ToneIn):
    if body.use_ai and llm.available():
        prompt = f"다음 글의 내용은 그대로 두고 {STYLES.get(body.style, '합니다체')}로 자연스럽게 고쳐 써. 고친 글만 출력해.\n\n{body.text}"
        return {"text": llm.complete(prompt, max_tokens=1500), "changed": -1, "style": STYLES.get(body.style), "engine": "llm"}
    return change_tone(body.text, body.style)


@router.post("/email")
def email_api(body: EmailIn):
    return email(body.body, body.recipient, body.sender, body.company, body.subject, body.style)
