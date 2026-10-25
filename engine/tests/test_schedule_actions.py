from __future__ import annotations

from datetime import date, datetime

import pytest

from localbiseo.modules.actions import extract_actions
from localbiseo.modules.schedule import find_date, parse_events, to_ics

NOW = datetime(2026, 10, 21, 9, 0)  # 수요일
TODAY = NOW.date()


@pytest.mark.parametrize(
    "text, expected",
    [
        ("내일 보자", date(2026, 10, 22)),
        ("모레까지", date(2026, 10, 23)),
        ("내일까지 제출", date(2026, 10, 22)),
        ("다음 주 화요일", date(2026, 10, 27)),
        ("다음주 월요일", date(2026, 10, 26)),
        ("이번 주 금요일", date(2026, 10, 23)),
        ("금요일까지", date(2026, 10, 23)),
        ("수요일에", date(2026, 10, 28)),  # 같은 요일이면 다음 주
        ("11월 3일(화)", date(2026, 11, 3)),
        ("2027년 1월 5일", date(2027, 1, 5)),
        ("2026-12-01 출시", date(2026, 12, 1)),
        ("12/24 파티", date(2026, 12, 24)),
        ("3일 후", date(2026, 10, 24)),
        ("2주 뒤", date(2026, 11, 4)),
        ("15일까지", date(2026, 11, 15)),  # 이번 달 15일이 지났으면 다음 달
        ("25일 마감", date(2026, 10, 25)),
        ("다음 달 5일", date(2026, 11, 5)),
        ("이번 주까지", date(2026, 10, 23)),
        ("월말까지", date(2026, 10, 31)),
        ("1월 2일", date(2027, 1, 2)),  # 60일 넘게 지난 날짜는 내년
    ],
)
def test_find_date(text, expected):
    m = find_date(text, TODAY)
    assert m is not None and m.value == expected


@pytest.mark.parametrize("text", ["오늘날 기술", "3일 동안 진행", "2일간 교육", "매일 아침"])
def test_find_date_ignores(text):
    m = find_date(text, TODAY)
    assert m is None


def test_parse_events_times_and_titles():
    text = (
        "내일 오후 3시에 디자인 회의 합니다.\n"
        "다음 주 화요일 10시 반 고객 미팅\n"
        "11월 3일(화) 2시~4시 워크숍\n"
        "금요일까지 보고서 제출\n"
        "이번 주 금요일 저녁 7시 회식\n"
        "오후 2시에 2시간 동안 보안 교육\n"
        "그냥 잡담입니다."
    )
    ev = [e.to_dict() for e in parse_events(text, NOW)]
    assert len(ev) == 6
    assert ev[0]["start"] == "2026-10-22T15:00:00" and ev[0]["end"] == "2026-10-22T16:00:00"
    assert ev[0]["title"] == "디자인 회의 합니다"
    assert ev[1]["start"] == "2026-10-27T10:30:00" and ev[1]["title"] == "고객 미팅"
    assert ev[2]["start"] == "2026-11-03T14:00:00" and ev[2]["end"] == "2026-11-03T16:00:00" and ev[2]["title"] == "워크숍"
    assert ev[3]["all_day"] and ev[3]["start"] == "2026-10-23" and ev[3]["title"] == "보고서 제출"
    assert ev[4]["start"] == "2026-10-23T19:00:00"
    assert ev[5]["start"] == "2026-10-21T14:00:00" and ev[5]["end"] == "2026-10-21T16:00:00"


def test_time_variants():
    ev = parse_events("오전 9시 회의. 12시 점심. 정오 회의. 밤 11시 배포. 15:30 통화. 8시 출근", NOW)
    starts = [e.start.strftime("%H:%M") for e in ev]
    assert starts == ["09:00", "12:00", "12:00", "23:00", "15:30", "08:00"]


def test_ics_is_valid_shape():
    ev = [e.to_dict() for e in parse_events("내일 오후 3시 회의, 쉼표; 세미콜론\n금요일 휴가", NOW)]
    ics = to_ics(ev)
    assert ics.startswith("BEGIN:VCALENDAR\r\n") and ics.endswith("END:VCALENDAR\r\n")
    assert "DTSTART;TZID=Asia/Seoul:20261022T150000" in ics
    assert "DTSTART;VALUE=DATE:20261023" in ics and "DTEND;VALUE=DATE:20261024" in ics
    assert "회의\\, 쉼표\\; 세미콜론" in ics
    for line in ics.split("\r\n"):
        assert len(line.encode("utf-8")) <= 75


def test_extract_actions():
    text = (
        "오늘 회의에서 신제품 가격은 49,000원으로 정했습니다.\n"
        "김민수 대리가 금요일까지 상세페이지 시안을 공유하기로 했습니다.\n"
        "박지영님은 다음 주 화요일까지 견적서를 보내 주세요.\n"
        "제가 내일 거래처에 연락하겠습니다.\n"
        "TODO: 서버 비용 정리\n"
        "- [ ] 회의록 공유\n"
        "날씨가 좋네요."
    )
    items = extract_actions(text, NOW)
    texts = [i["text"] for i in items]
    assert len(items) == 5, texts
    assert items[0]["assignee"] == "김민수대리" and items[0]["due"] == "2026-10-23"
    assert items[1]["assignee"] == "박지영님" and items[1]["due"] == "2026-10-27"
    assert items[2]["assignee"] == "나" and items[2]["due"] == "2026-10-22"
    assert items[3]["text"] == "서버 비용 정리" and items[3]["due"] is None
    assert items[4]["text"] == "회의록 공유"


def test_actions_api_saves_todos(client):
    r = client.post("/actions/extract", json={"text": "이영희 과장이 내일까지 예산안을 보내기로 함.", "now": NOW.isoformat()})
    items = r.json()["items"]
    assert items[0]["assignee"] == "이영희과장"
    r = client.post("/actions/save", json={"items": items, "source": "test"})
    assert len(r.json()["ids"]) == 1
    todos = client.get("/todos").json()
    assert todos[0]["text"].startswith("이영희 과장이") and todos[0]["due"] == "2026-10-22"


def test_schedule_api_ics(client, tmp_path):
    ev = client.post("/schedule/parse", json={"text": "내일 오후 3시 회의", "now": NOW.isoformat()}).json()["events"]
    out = tmp_path / "a.ics"
    r = client.post("/schedule/ics", json={"events": ev, "out_path": str(out)})
    assert r.json()["count"] == 1 and out.read_text(encoding="utf-8").count("BEGIN:VEVENT") == 1
