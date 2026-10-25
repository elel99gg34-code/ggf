"""문장 속 한국어 날짜·시간 표현을 일정으로 바꾸고 .ics로 내보낸다."""
from __future__ import annotations

import calendar
import re
import uuid
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from ..core.config import sub_dir
from ..core.korean import split_sentences

router = APIRouter(prefix="/schedule", tags=["일정 추출"])

WEEKDAY = {"월": 0, "화": 1, "수": 2, "목": 3, "금": 4, "토": 5, "일": 6}
REL_DAY = {"오늘": 0, "금일": 0, "당일": 0, "내일": 1, "명일": 1, "모레": 2, "내일모레": 2, "글피": 3, "어제": -1, "그제": -2, "그저께": -2}
WEEK_OFFSET = {"이번": 0, "이번주": 0, "금주": 0, "다음": 1, "다음주": 1, "차주": 1, "다다음": 2, "다다음주": 2, "지난": -1, "지난주": -1, "저번": -1, "저번주": -1}

_DOW = r"(?:\s*\(?\s*[월화수목금토일](?:요일)?\s*\)?)?"
DATE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("iso", re.compile(r"(?<!\d)(20\d{2})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})(?!\d)\.?" + _DOW)),
    ("ymd", re.compile(r"(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일" + _DOW)),
    ("md_slash", re.compile(r"(?<![\d/])(\d{1,2})/(\d{1,2})(?![\d/])" + _DOW)),
    ("in_days", re.compile(r"(\d{1,3})\s*(일|주|개월|달)\s*(?:후|뒤)")),
    ("week_dow", re.compile(r"(이번\s?주|금주|다음\s?주|차주|다다음\s?주|지난\s?주|저번\s?주)\s*([월화수목금토일])(?:요일|(?![가-힣]))")),
    ("dow", re.compile(r"(?<![가-힣])([월화수목금토일])요일")),
    ("rel", re.compile(r"(?<![가-힣])(내일모레|오늘|금일|당일|내일|명일|모레|글피|어제|그저께|그제)(?!날)")),
    ("month_day", re.compile(r"(이번\s?달|이달|다음\s?달|담달)\s*(\d{1,2})\s*일")),
    ("day", re.compile(r"(?<![\d월년매])(\d{1,2})\s*일(?!\s*(?:후|뒤|전|간|동안|째|치|분|내|이내|마다))")),
    ("week_end", re.compile(r"(이번\s?주|다음\s?주)?\s*(주말|주중)")),
    ("month_end", re.compile(r"(이번\s?달|다음\s?달)?\s*(월말|월초)")),
    ("week_only", re.compile(r"(이번\s?주|다음\s?주|차주)\s*(?:중|안|내)?(?=\s*(?:까지|에|중|안|내|$))")),
]

_AMPM = r"(오전|오후|아침|점심|낮|저녁|밤|새벽)?\s*"
TIME_RE = re.compile(_AMPM + r"(\d{1,2})\s*시(?!간)\s*(?:(\d{1,2})\s*분|(반))?|" + _AMPM + r"(?<!\d)(\d{1,2}):(\d{2})(?!\d)|(정오|자정)")
RANGE_SEP_RE = re.compile(r"^\s*(?:~|-|–|부터|에서)\s*")
DURATION_RE = re.compile(r"(\d{1,2})\s*시간(?:\s*(\d{1,2})\s*분)?\s*(?:동안|정도|간)?")


@dataclass
class Match:
    start: int
    end: int
    value: object


def _norm(s: str | None) -> str:
    return re.sub(r"\s", "", s or "")


def _safe_date(y: int, m: int, d: int) -> date | None:
    try:
        return date(y, m, d)
    except ValueError:
        return None


def _future_year(m: int, d: int, today: date) -> date | None:
    cand = _safe_date(today.year, m, d)
    if cand and (today - cand).days > 60:
        cand = _safe_date(today.year + 1, m, d)
    return cand


def _week_monday(today: date, offset: int) -> date:
    return today - timedelta(days=today.weekday()) + timedelta(weeks=offset)


def find_date(text: str, today: date) -> Match | None:
    best: Match | None = None
    for kind, rx in DATE_PATTERNS:
        for m in rx.finditer(text):
            d = _resolve(kind, m, today)
            if d is None:
                continue
            cand = Match(m.start(), m.end(), d)
            # 가장 먼저 나오는 표현, 같으면 더 긴 표현
            if best is None or cand.start < best.start or (cand.start == best.start and cand.end > best.end):
                best = cand
            break
    return best


def _resolve(kind: str, m: re.Match, today: date) -> date | None:
    g = m.groups()
    if kind == "iso":
        return _safe_date(int(g[0]), int(g[1]), int(g[2]))
    if kind == "ymd":
        if g[0]:
            return _safe_date(int(g[0]), int(g[1]), int(g[2]))
        return _future_year(int(g[1]), int(g[2]), today)
    if kind == "md_slash":
        mo, d = int(g[0]), int(g[1])
        return _future_year(mo, d, today) if 1 <= mo <= 12 else None
    if kind == "in_days":
        n, unit = int(g[0]), g[1]
        if unit == "일":
            return today + timedelta(days=n)
        if unit == "주":
            return today + timedelta(weeks=n)
        return _add_months(today, n)
    if kind == "week_dow":
        return _week_monday(today, WEEK_OFFSET.get(_norm(g[0]), 0)) + timedelta(days=WEEKDAY[g[1]])
    if kind == "dow":
        delta = (WEEKDAY[g[0]] - today.weekday()) % 7 or 7
        return today + timedelta(days=delta)
    if kind == "rel":
        return today + timedelta(days=REL_DAY[g[0]])
    if kind == "month_day":
        base = today if _norm(g[0]) in ("이번달", "이달") else _add_months(today.replace(day=1), 1)
        return _safe_date(base.year, base.month, int(g[1]))
    if kind == "day":
        d = int(g[0])
        if not 1 <= d <= 31:
            return None
        cand = _safe_date(today.year, today.month, d)
        if cand and cand < today:
            nxt = _add_months(today.replace(day=1), 1)
            cand = _safe_date(nxt.year, nxt.month, d)
        return cand
    if kind == "week_end":
        offset = 1 if _norm(g[0]) == "다음주" else 0
        monday = _week_monday(today, offset)
        return monday + timedelta(days=5 if g[1] == "주말" else 2)
    if kind == "month_end":
        base = _add_months(today.replace(day=1), 1) if _norm(g[0]) == "다음달" else today
        if g[1] == "월초":
            return base.replace(day=1) if _norm(g[0]) == "다음달" else _add_months(today.replace(day=1), 1)
        return base.replace(day=calendar.monthrange(base.year, base.month)[1])
    if kind == "week_only":
        # "이번 주까지" → 그 주 금요일
        return _week_monday(today, WEEK_OFFSET.get(_norm(g[0]), 0)) + timedelta(days=4)
    return None


def _add_months(d: date, n: int) -> date:
    y, mo = divmod(d.month - 1 + n, 12)
    y += d.year
    mo += 1
    return date(y, mo, min(d.day, calendar.monthrange(y, mo)[1]))


def _hour(ampm: str | None, h: int) -> int | None:
    if h > 24:
        return None
    if ampm in ("오후", "저녁", "밤"):
        if ampm == "밤" and h == 12:
            return 0
        return h + 12 if h < 12 else h
    if ampm in ("오전", "아침", "새벽"):
        return 0 if h == 12 else h
    if ampm in ("점심", "낮"):
        return h + 12 if h <= 5 else h
    # 오전/오후 표시가 없으면 업무 시간 기준으로 본다: 1~7시는 오후.
    if 1 <= h <= 7:
        return h + 12
    return 0 if h == 24 else h


def find_times(text: str) -> list[Match]:
    out = []
    for m in TIME_RE.finditer(text):
        g = m.groups()
        if g[7]:
            t = time(12, 0) if g[7] == "정오" else time(0, 0)
        elif g[1] is not None:
            h = _hour(g[0], int(g[1]))
            minute = 30 if g[3] else int(g[2] or 0)
            if h is None or minute > 59:
                continue
            t = time(h % 24, minute)
        else:
            h = _hour(g[4], int(g[5]))
            minute = int(g[6])
            if h is None or minute > 59:
                continue
            t = time(h % 24, minute)
        out.append(Match(m.start(), m.end(), t))
    return out


@dataclass
class Event:
    title: str
    start: datetime | date
    end: datetime | date | None
    all_day: bool
    source: str

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "start": self.start.isoformat(),
            "end": self.end.isoformat() if self.end else None,
            "all_day": self.all_day,
            "source": self.source,
        }


_PARTICLE_EDGE = re.compile(r"^[\s,.~\-·:에까지부터는은도의]+|[\s,.~\-·:]+$")
_TRAIL_WORDS = re.compile(r"(에|까지|부터|에는|으로|로)\s*$")


def _title(sentence: str, spans: list[tuple[int, int]]) -> str:
    chars = list(sentence)
    for s, e in spans:
        for i in range(s, e):
            chars[i] = " "
    t = re.sub(r"\s+", " ", "".join(chars)).strip()
    t = re.sub(r"^(?:에는|에|까지|부터|은|는)\s+", "", t)
    t = _PARTICLE_EDGE.sub("", t)
    t = _TRAIL_WORDS.sub("", t).strip()
    return (t[:60] or "일정").strip()


def parse_events(text: str, now: datetime | None = None) -> list[Event]:
    now = now or datetime.now()
    today = now.date()
    events = []
    for _, _, sentence in split_sentences(text):
        dm = find_date(sentence, today)
        times = [t for t in find_times(sentence) if not dm or not (dm.start <= t.start < dm.end)]
        if not dm and not times:
            continue
        day = dm.value if dm else today
        spans = [(dm.start, dm.end)] if dm else []
        if not times:
            events.append(Event(_title(sentence, spans), day, None, True, sentence))
            continue
        start_t = times[0]
        spans.append((start_t.start, start_t.end))
        start = datetime.combine(day, start_t.value)
        end = None
        if len(times) > 1 and RANGE_SEP_RE.match(sentence[start_t.end : times[1].start] + " "):
            end_t = times[1]
            spans.append((start_t.end, end_t.end))
            end = datetime.combine(day, end_t.value)
            # "3시~5시"에서 끝 시각이 오전으로 해석되면 시작과 같은 오후로 맞춘다.
            if end <= start and end_t.value.hour < 12:
                end += timedelta(hours=12)
            if end <= start:
                end += timedelta(days=1)
        dur = DURATION_RE.search(sentence, start_t.end)
        if end is None and dur:
            spans.append((dur.start(), dur.end()))
            end = start + timedelta(hours=int(dur.group(1)), minutes=int(dur.group(2) or 0))
        events.append(Event(_title(sentence, spans), start, end or start + timedelta(hours=1), False, sentence))
    return events


def _ics_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line: str) -> str:
    # RFC 5545: 한 줄 75바이트 넘으면 접는다.
    out, cur = [], b""
    for ch in line:
        b = ch.encode("utf-8")
        if len(cur) + len(b) > 73:
            out.append(cur.decode("utf-8"))
            cur = b" "
        cur += b
    out.append(cur.decode("utf-8"))
    return "\r\n".join(out)


VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:Asia/Seoul", "BEGIN:STANDARD", "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0900", "TZOFFSETTO:+0900", "TZNAME:KST", "END:STANDARD", "END:VTIMEZONE",
]


def to_ics(events: list[dict]) -> str:
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LocalBiseo//KO", "CALSCALE:GREGORIAN", *VTIMEZONE]
    stamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    for ev in events:
        lines += ["BEGIN:VEVENT", f"UID:{uuid.uuid4()}@localbiseo", f"DTSTAMP:{stamp}"]
        if ev.get("all_day"):
            d = date.fromisoformat(ev["start"][:10])
            lines.append(f"DTSTART;VALUE=DATE:{d:%Y%m%d}")
            lines.append(f"DTEND;VALUE=DATE:{d + timedelta(days=1):%Y%m%d}")
        else:
            s = datetime.fromisoformat(ev["start"])
            e = datetime.fromisoformat(ev["end"]) if ev.get("end") else s + timedelta(hours=1)
            lines.append(f"DTSTART;TZID=Asia/Seoul:{s:%Y%m%dT%H%M%S}")
            lines.append(f"DTEND;TZID=Asia/Seoul:{e:%Y%m%dT%H%M%S}")
        lines.append(f"SUMMARY:{_ics_escape(ev.get('title') or '일정')}")
        if ev.get("source"):
            lines.append(f"DESCRIPTION:{_ics_escape(ev['source'])}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"


class ParseIn(BaseModel):
    text: str
    now: str | None = None


class IcsIn(BaseModel):
    events: list[dict]
    out_path: str | None = None


@router.post("/parse")
def parse_api(body: ParseIn):
    now = datetime.fromisoformat(body.now) if body.now else None
    return {"events": [e.to_dict() for e in parse_events(body.text, now)]}


@router.post("/ics")
def ics_api(body: IcsIn):
    path = Path(body.out_path) if body.out_path else sub_dir("exports") / f"일정_{datetime.now():%Y%m%d_%H%M%S}.ics"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(to_ics(body.events), encoding="utf-8", newline="")
    return {"path": str(path), "count": len(body.events)}
