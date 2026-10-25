"""회의록·메모 문장에서 할 일(액션아이템) 뽑기."""
from __future__ import annotations

import re
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from ..core.context import Ctx
from ..core.korean import looks_like_name, split_sentences
from .notes import add_todo
from .schedule import find_date

router = APIRouter(prefix="/actions", tags=["액션아이템"])

ACTION_PATTERNS = [re.compile(p) for p in [
    r"기로\s?(?:했|함|하였|합의|결정|정했|정함)",
    r"(?:해야|돼야|되어야|드려야|보내야|받아야|가야|봐야|챙겨야)\s?(?:함|한다|합니다|해요|하고|할|겠|돼|된다|됩니다)?",
    r"(?:할 것|하실 것|해 주세요|해주세요|해 주시기|해주시기|부탁드립니다|부탁드려요|부탁해요|바랍니다|요청드립니다|요청합니다|해 주십시오|해주십시오)",
    r"(?:까지|전까지)\s?(?:\S+\s?){0,3}(?:제출|보고|공유|전달|완료|마감|회신|보내|올려|업로드|정리|확인|준비|작성|검토)",
    r"(?:하겠습니다|드리겠습니다|할게요|할께요|드릴게요|드릴께요|보겠습니다|진행하겠|챙기겠|맡겠|처리하겠)",
    r"(?:제가|저희가|내가|우리가|제 쪽에서)\s.*(?:하겠|할게|할께|드리겠|드릴게|볼게|보겠|맡을|챙길)",
]]
PREFIX_RE = re.compile(r"^\s*(?:[-*•·]\s*)?(?:\[\s?\]\s*)?(?:TODO|To-?do|할\s?일|액션|Action\s?Item|AI)\s*[:：]\s*", re.I)
CHECKBOX_RE = re.compile(r"^\s*[-*•]?\s*\[\s?\]\s+")
TITLES = r"(?:님|씨|팀장님?|과장님?|대리님?|부장님?|차장님?|매니저님?|선임님?|책임님?|실장님?|이사님?|대표님?|주임님?|사원)"
ASSIGNEE_RE = re.compile(rf"(?<![가-힣])([가-힣]{{2,4}}?)\s?({TITLES})?\s?(?:이|가|은|는|께서|께|에게|한테)\s")
ASSIGNEE_LABEL_RE = re.compile(r"(?:담당|담당자|책임)\s*[:：]\s*([가-힣]{2,4})|@([가-힣A-Za-z]{2,10})")
SELF_RE = re.compile(r"^(?:제가|저희가|내가|제 쪽에서)\s")


def _assignee(sentence: str) -> str | None:
    m = ASSIGNEE_LABEL_RE.search(sentence)
    if m:
        return m.group(1) or m.group(2)
    m = ASSIGNEE_RE.search(sentence[:30])
    if m and looks_like_name(m.group(1)) and (m.group(2) or len(m.group(1)) == 3):
        title = m.group(2) or ""
        # '홍길동님'은 붙이고 '김민수 대리'는 띄운다.
        return m.group(1) + (title if title in ("님", "씨") else f" {title}" if title else "")
    if SELF_RE.search(sentence):
        return "나"
    return None


def _clean(sentence: str) -> str:
    t = PREFIX_RE.sub("", sentence)
    t = CHECKBOX_RE.sub("", t)
    return t.strip(" .。!\t")


def extract_actions(text: str, now: datetime | None = None) -> list[dict]:
    today = (now or datetime.now()).date()
    items = []
    seen = set()
    for _, _, sentence in split_sentences(text):
        explicit = bool(PREFIX_RE.match(sentence) or CHECKBOX_RE.match(sentence))
        if not explicit and not any(p.search(sentence) for p in ACTION_PATTERNS):
            continue
        clean = _clean(sentence)
        if len(clean) < 4 or clean in seen:
            continue
        seen.add(clean)
        dm = find_date(clean, today)
        items.append({"text": clean, "assignee": _assignee(clean), "due": dm.value.isoformat() if dm else None})
    return items


class ExtractIn(BaseModel):
    text: str
    now: str | None = None


class SaveIn(BaseModel):
    items: list[dict]
    source: str | None = None


@router.post("/extract")
def extract_api(body: ExtractIn):
    now = datetime.fromisoformat(body.now) if body.now else None
    return {"items": extract_actions(body.text, now)}


@router.post("/save")
def save_api(body: SaveIn, ctx: Ctx):
    ids = [add_todo(ctx.db, i["text"], i.get("due"), i.get("assignee"), body.source) for i in body.items if i.get("text")]
    return {"ids": ids}
