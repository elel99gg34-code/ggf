"""집중 타이머(뽀모도로) 기록과 주간 리포트. 타이머 자체는 화면에서 돌고, 시작/끝만 기록한다."""
from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter
from pydantic import BaseModel

from ..core.context import Ctx
from ..core.db import Database, now_iso
from ..core.errors import NotFound

router = APIRouter(prefix="/focus", tags=["집중 타이머"])

WEEKDAYS = "월화수목금토일"


class StartIn(BaseModel):
    label: str = ""
    kind: str = "focus"  # focus | break
    planned_minutes: int = 25


class StopIn(BaseModel):
    completed: bool = True


def _minutes(row: dict) -> float:
    if not row["ended_at"]:
        return 0.0
    return (datetime.fromisoformat(row["ended_at"]) - datetime.fromisoformat(row["started_at"])).total_seconds() / 60


def weekly_report(db: Database, week_of: date) -> dict:
    monday = week_of - timedelta(days=week_of.weekday())
    sunday = monday + timedelta(days=6)
    rows = db.query(
        "SELECT * FROM focus_sessions WHERE kind='focus' AND ended_at IS NOT NULL AND date(started_at) BETWEEN ? AND ?",
        (monday.isoformat(), sunday.isoformat()),
    )
    days = [{"date": (monday + timedelta(days=i)).isoformat(), "label": WEEKDAYS[i], "minutes": 0.0, "sessions": 0} for i in range(7)]
    labels: dict[str, float] = {}
    for r in rows:
        d = datetime.fromisoformat(r["started_at"]).date()
        m = _minutes(r)
        slot = days[(d - monday).days]
        slot["minutes"] += m
        slot["sessions"] += 1 if r["completed"] else 0
        key = r["label"] or "(이름 없음)"
        labels[key] = labels.get(key, 0) + m
    done_todos = db.query("SELECT text FROM todos WHERE done=1 AND date(done_at) BETWEEN ? AND ? ORDER BY done_at", (monday.isoformat(), sunday.isoformat()))
    total = sum(d["minutes"] for d in days)
    for d in days:
        d["minutes"] = round(d["minutes"])
    top = sorted(labels.items(), key=lambda x: x[1], reverse=True)
    best = max(days, key=lambda d: d["minutes"])
    md = [f"# 주간 리포트 ({monday:%m/%d} ~ {sunday:%m/%d})", "", f"- 집중 시간: **{int(total // 60)}시간 {int(total % 60)}분**", f"- 완료한 집중 세션: {sum(d['sessions'] for d in days)}회"]
    if total:
        md.append(f"- 가장 많이 집중한 날: {best['label']}요일 ({best['minutes']}분)")
    if top:
        md += ["", "## 작업별", *[f"- {k}: {round(v)}분" for k, v in top[:10]]]
    if done_todos:
        md += ["", f"## 끝낸 일 ({len(done_todos)}개)", *[f"- {t['text']}" for t in done_todos[:30]]]
    return {
        "week_start": monday.isoformat(),
        "days": days,
        "labels": [{"label": k, "minutes": round(v)} for k, v in top],
        "total_minutes": round(total),
        "done_todos": len(done_todos),
        "markdown": "\n".join(md),
    }


@router.post("/start")
def start(body: StartIn, ctx: Ctx):
    # 끝나지 않은 세션이 있으면 먼저 닫는다.
    ctx.db.execute("UPDATE focus_sessions SET ended_at=?, completed=0 WHERE ended_at IS NULL", (now_iso(),))
    sid = ctx.db.insert(
        "INSERT INTO focus_sessions(label, kind, planned_minutes, started_at) VALUES(?,?,?,?)",
        (body.label, body.kind, body.planned_minutes, now_iso()),
    )
    return ctx.db.one("SELECT * FROM focus_sessions WHERE id=?", (sid,))


@router.post("/{sid}/stop")
def stop(sid: int, body: StopIn, ctx: Ctx):
    cur = ctx.db.execute("UPDATE focus_sessions SET ended_at=?, completed=? WHERE id=? AND ended_at IS NULL", (now_iso(), int(body.completed), sid))
    if cur.rowcount == 0:
        raise NotFound("진행 중인 세션이 없어요.")
    return ctx.db.one("SELECT * FROM focus_sessions WHERE id=?", (sid,))


@router.get("/today")
def today(ctx: Ctx):
    rows = ctx.db.query("SELECT * FROM focus_sessions WHERE date(started_at)=date('now','localtime') ORDER BY id DESC")
    focus = [r for r in rows if r["kind"] == "focus"]
    return {"sessions": rows, "minutes": round(sum(_minutes(r) for r in focus)), "completed": sum(1 for r in focus if r["completed"])}


@router.get("/report")
def report(ctx: Ctx, week: str | None = None):
    return weekly_report(ctx.db, date.fromisoformat(week) if week else date.today())
