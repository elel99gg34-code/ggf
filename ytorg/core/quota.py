"""할당량 원장.

YouTube Data API는 프로젝트당 하루 10,000유닛으로 고정돼 있고 돈을 내고 늘릴
방법이 없다. 읽기(*.list)는 1유닛인데 쓰기(insert/update/delete)는 전부
50유닛이라, 하루에 가능한 쓰기 작업은 200번이 물리적 상한이다.

그래서 이 모듈이 앱 전체의 속도 제한기 역할을 한다. 모든 API 호출은 호출
'전에' 여기에 기록되고, 모든 대량 작업은 여기서 오늘 몫과 내일 몫으로 쪼개진다.

주의 - 원장은 '이 컴퓨터가 쓴 양'만 안다:
    여러 사람이 같은 Cloud 프로젝트를 공유하면 남은 유닛은 로컬 기록보다 적다.
    그래서 서버가 quotaExceeded를 돌려주면 그것을 권위 있는 신호로 받아
    mark_exhausted()로 그날을 닫는다. 로컬 추정치는 낙관적 힌트일 뿐이다.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .models import now_utc

# 할당량은 태평양시 자정에 리셋된다.
PACIFIC = ZoneInfo("America/Los_Angeles")

DAILY_LIMIT = 10_000

# 동기화와 미리보기(읽기)용으로 늘 남겨두는 몫. 쓰기 작업이 할당량을 전부
# 먹어치우면 다음 날 현황 파악조차 못 하게 되므로 기본값을 넉넉히 둔다.
DEFAULT_RESERVE = 600

# 메서드별 비용. 공식 표를 그대로 옮겼다.
# 규칙은 단순하다: list/조회 = 1, 쓰기 = 50, search = 100.
COSTS: dict[str, int] = {
    "activities.list": 1,
    "channels.list": 1,
    "playlistItems.list": 1,
    "playlists.list": 1,
    "subscriptions.list": 1,
    "videos.list": 1,
    "playlistItems.insert": 50,
    "playlistItems.update": 50,
    "playlistItems.delete": 50,
    "playlists.insert": 50,
    "playlists.update": 50,
    "playlists.delete": 50,
    "subscriptions.insert": 50,
    "subscriptions.delete": 50,
    "videos.rate": 50,
    # 100유닛짜리. 이 앱은 쓰지 않지만, 실수로 호출했을 때 비용이 0으로 잡히면
    # 안 되므로 표에는 남겨둔다.
    "search.list": 100,
}

WRITE_COST = 50


def cost_of(method: str) -> int:
    """모르는 메서드는 쓰기로 간주한다(50). 비용을 낮게 잡는 쪽이 더 위험하다."""
    return COSTS.get(method, WRITE_COST)


def quota_day(moment: datetime | None = None) -> str:
    """태평양시 기준 할당량 날짜(YYYY-MM-DD).

    사용자가 한국에 있어도 리셋 시각은 태평양시 자정이다. 로컬 날짜로 계산하면
    한국 시간 오후 4~5시에 일어나는 리셋을 놓친다.
    """
    moment = moment or now_utc()
    return moment.astimezone(PACIFIC).strftime("%Y-%m-%d")


def next_reset(moment: datetime | None = None) -> datetime:
    """다음 리셋 시각(UTC). '몇 시간 뒤에 재개됩니다' 표시에 쓴다."""
    moment = moment or now_utc()
    local = moment.astimezone(PACIFIC)
    tomorrow = (local + timedelta(days=1)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    return tomorrow.astimezone(now_utc().tzinfo)


@dataclass
class Budget:
    """대량 작업을 오늘 몫과 나중 몫으로 나눈 결과."""

    total_ops: int
    total_cost: int
    affordable_ops: int
    affordable_cost: int
    remaining_before: int
    days_needed: int
    per_op_cost: int = 0

    @property
    def deferred_ops(self) -> int:
        return self.total_ops - self.affordable_ops

    @property
    def fits_today(self) -> bool:
        return self.deferred_ops == 0

    def describe(self) -> str:
        """사용자에게 그대로 보여줄 한 줄 요약."""
        if self.total_ops == 0:
            return "할 작업이 없어."
        if self.fits_today:
            return (
                f"작업 {self.total_ops}개 · {self.total_cost:,}유닛 "
                f"(오늘 남은 {self.remaining_before:,}유닛으로 전부 처리 가능)"
            )
        return (
            f"작업 {self.total_ops}개 · {self.total_cost:,}유닛 — 오늘은 "
            f"{self.affordable_ops}개까지만 처리되고 나머지 {self.deferred_ops}개는 "
            f"다음 날 자동으로 이어서 해. 전부 끝나는 데 약 {self.days_needed}일."
        )


class QuotaExceeded(Exception):
    """할당량이 바닥났을 때. 작업을 실패가 아니라 '일시정지'로 만든다."""

    def __init__(self, message: str = "오늘 할당량을 다 썼어", server_reported: bool = False):
        super().__init__(message)
        self.server_reported = server_reported


class QuotaLedger:
    def __init__(self, db, daily_limit: int = DAILY_LIMIT, reserve: int = DEFAULT_RESERVE):
        self.db = db
        self.daily_limit = daily_limit
        self.reserve = reserve

    # ---- 조회 ----------------------------------------------------------

    def spent(self, day: str | None = None) -> int:
        day = day or quota_day()
        row = self.db.one(
            "SELECT COALESCE(SUM(cost), 0) AS total FROM quota_ledger WHERE quota_day=?",
            (day,),
        )
        return int(row["total"]) if row else 0

    def remaining(self, day: str | None = None) -> int:
        """남은 유닛(예비분 제외 안 함). 서버가 소진을 통보했으면 0."""
        day = day or quota_day()
        if self.is_exhausted(day):
            return 0
        return max(0, self.daily_limit - self.spent(day))

    def spendable(self, day: str | None = None) -> int:
        """쓰기 작업에 실제로 할당할 수 있는 유닛(예비분을 뺀 값)."""
        return max(0, self.remaining(day) - self.reserve)

    def is_exhausted(self, day: str | None = None) -> bool:
        day = day or quota_day()
        return self.db.get_meta(f"quota_exhausted:{day}") is not None

    def mark_exhausted(self, day: str | None = None, reason: str = "") -> None:
        """서버가 quotaExceeded를 돌려줬을 때 호출한다.

        로컬 추정이 아직 여유롭다고 말해도 이쪽이 진실이다(프로젝트 공유 등).
        """
        day = day or quota_day()
        self.db.set_meta(f"quota_exhausted:{day}", reason or now_utc().isoformat())

    def usage_by_method(self, day: str | None = None) -> list[tuple[str, int, int]]:
        """(메서드, 횟수, 총비용). 어디서 유닛이 샜는지 보여주는 설정 화면용."""
        day = day or quota_day()
        rows = self.db.query(
            "SELECT method, COUNT(*) AS n, SUM(cost) AS total FROM quota_ledger "
            "WHERE quota_day=? GROUP BY method ORDER BY total DESC",
            (day,),
        )
        return [(r["method"], int(r["n"]), int(r["total"])) for r in rows]

    # ---- 기록 ----------------------------------------------------------

    def record(self, method: str, count: int = 1, job_id: int | None = None,
               note: str = "") -> int:
        """API 호출을 원장에 남긴다. 반드시 호출 '전에' 부른다.

        호출 후에 기록하면 앱이 중간에 죽었을 때 이미 소모된 유닛을 잃어버려
        다음 실행에서 할당량을 초과하게 된다.
        """
        unit = cost_of(method)
        total = unit * count
        self.db.execute(
            "INSERT INTO quota_ledger(quota_day, method, cost, job_id, at, note) "
            "VALUES(?,?,?,?,?,?)",
            (quota_day(), method, total, job_id, now_utc().isoformat(), note),
        )
        return total

    def check(self, method: str, count: int = 1, use_reserve: bool = False) -> None:
        """예산이 부족하면 QuotaExceeded를 던진다.

        use_reserve=True는 동기화 같은 읽기 작업용으로, 예비분까지 쓸 수 있다.
        """
        need = cost_of(method) * count
        available = self.remaining() if use_reserve else self.spendable()
        if need > available:
            raise QuotaExceeded(
                f"{method} {count}회에 {need:,}유닛이 필요한데 {available:,}유닛 남았어"
            )

    # ---- 예산 분할 ------------------------------------------------------

    def plan(self, op_count: int, method: str = "playlistItems.insert") -> Budget:
        """같은 종류의 작업 N개를 오늘 몫/나중 몫으로 나눈다."""
        return self.plan_mixed([(method, op_count)])

    def plan_mixed(self, ops: list[tuple[str, int]]) -> Budget:
        """섞인 작업의 예산 계획.

        ops는 (메서드, 횟수) 목록. 예: 재생목록 10개 생성 + 항목 500개 추가.
        작업은 들어온 순서대로 처리된다고 가정하고 오늘 몇 개까지 가능한지 센다.
        """
        total_ops = sum(n for _, n in ops)
        total_cost = sum(cost_of(m) * n for m, n in ops)
        available = self.spendable()

        affordable_ops, affordable_cost, budget_left = 0, 0, available
        for method, count in ops:
            unit = cost_of(method)
            if unit <= 0:
                affordable_ops += count
                continue
            can_do = min(count, budget_left // unit)
            affordable_ops += can_do
            affordable_cost += can_do * unit
            budget_left -= can_do * unit
            if can_do < count:
                break

        # 이후 날짜에는 하루 꼬박 (limit - reserve)만큼 쓸 수 있다.
        per_day = max(1, self.daily_limit - self.reserve)
        leftover = total_cost - affordable_cost
        days_needed = 1 + math.ceil(leftover / per_day) if leftover > 0 else 1

        per_op = total_cost // total_ops if total_ops else 0
        return Budget(
            total_ops=total_ops,
            total_cost=total_cost,
            affordable_ops=affordable_ops,
            affordable_cost=affordable_cost,
            remaining_before=available,
            days_needed=days_needed,
            per_op_cost=per_op,
        )
