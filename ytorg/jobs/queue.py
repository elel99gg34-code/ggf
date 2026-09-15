"""작업 계획과 재개 가능한 큐.

쓰기 작업은 절대 즉시 실행되지 않는다. 먼저 JobPlan(무슨 연산을 몇 개 할지,
몇 유닛이 들지)을 만들어 사용자에게 보여주고, 승인을 받아야 큐에 들어간다.

큐에 들어간 뒤로는 연산 하나하나가 DB에 상태로 남는다. 앱을 꺼도, 할당량이
바닥나도, 인터넷이 끊겨도, 다음에 켰을 때 pending인 것부터 이어서 한다.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from ..core.models import now_utc
from ..core.quota import Budget, QuotaLedger, cost_of
from .ops import OP_LABELS, OP_METHODS

# 작업 상태
PENDING = "pending"
RUNNING = "running"
PAUSED = "paused"     # 할당량 소진 — 실패가 아니라 대기
DONE = "done"
FAILED = "failed"
CANCELLED = "cancelled"


@dataclass
class PlannedOp:
    op_type: str
    params: dict
    label: str = ""

    @property
    def method(self) -> str:
        return OP_METHODS.get(self.op_type, "playlistItems.insert")

    @property
    def cost(self) -> int:
        return cost_of(self.method)


@dataclass
class JobPlan:
    """실행 전 사용자에게 보여줄 변경 계획.

    이 객체가 '미리보기' 화면의 데이터 원본이다. 여기까지는 API를 한 번도
    호출하지 않으므로 0유닛이다.
    """

    kind: str
    title: str
    ops: list[PlannedOp] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    # UI 표에 뿌릴 행: (대상 이름, 동작, 사유)
    rows: list[tuple[str, str, str]] = field(default_factory=list)

    def add(self, op_type: str, params: dict, label: str = "") -> None:
        self.ops.append(PlannedOp(op_type, params, label))

    @property
    def total_cost(self) -> int:
        return sum(op.cost for op in self.ops)

    @property
    def is_empty(self) -> bool:
        return not self.ops

    def counts_by_type(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for op in self.ops:
            counts[op.op_type] = counts.get(op.op_type, 0) + 1
        return counts

    def budget(self, ledger: QuotaLedger) -> Budget:
        grouped: list[tuple[str, int]] = []
        for op in self.ops:
            if grouped and grouped[-1][0] == op.method:
                grouped[-1] = (op.method, grouped[-1][1] + 1)
            else:
                grouped.append((op.method, 1))
        return ledger.plan_mixed(grouped)

    def describe(self) -> str:
        if self.is_empty:
            return "바꿀 게 없어."
        parts = [
            f"{OP_LABELS.get(op_type, op_type)} {count}개"
            for op_type, count in self.counts_by_type().items()
        ]
        return " · ".join(parts) + f" (총 {self.total_cost:,}유닛)"


class JobQueue:
    def __init__(self, db):
        self.db = db

    # ---- 등록 -----------------------------------------------------------

    def enqueue(self, plan: JobPlan) -> int:
        """승인된 계획을 큐에 넣는다. 여기서도 API는 안 부른다."""
        if plan.is_empty:
            raise ValueError("빈 계획은 큐에 넣을 수 없어")

        with self.db.write() as conn:
            cursor = conn.execute(
                "INSERT INTO jobs(kind, title, status, created_at, total_ops, "
                "estimated_cost, payload) VALUES(?,?,?,?,?,?,?)",
                (plan.kind, plan.title, PENDING, now_utc().isoformat(),
                 len(plan.ops), plan.total_cost, json.dumps({"context": {}})),
            )
            job_id = int(cursor.lastrowid)
            conn.executemany(
                "INSERT INTO job_ops(job_id, seq, op_type, params, status, cost, updated_at) "
                "VALUES(?,?,?,?,?,?,?)",
                [
                    (job_id, seq, op.op_type, json.dumps(op.params, ensure_ascii=False),
                     PENDING, op.cost, now_utc().isoformat())
                    for seq, op in enumerate(plan.ops)
                ],
            )
        return job_id

    # ---- 조회 -----------------------------------------------------------

    def job(self, job_id: int):
        return self.db.one("SELECT * FROM jobs WHERE job_id=?", (job_id,))

    def jobs(self, statuses: tuple[str, ...] | None = None, limit: int = 50) -> list:
        if statuses:
            placeholders = ",".join("?" * len(statuses))
            return self.db.query(
                f"SELECT * FROM jobs WHERE status IN ({placeholders}) "
                f"ORDER BY job_id DESC LIMIT ?",
                (*statuses, limit),
            )
        return self.db.query("SELECT * FROM jobs ORDER BY job_id DESC LIMIT ?", (limit,))

    def resumable_jobs(self) -> list:
        """앱 시작 시 이어서 할 작업들. 할당량이 리셋됐으면 자동으로 재개된다."""
        return self.db.query(
            "SELECT * FROM jobs WHERE status IN (?,?,?) ORDER BY job_id",
            (PENDING, PAUSED, RUNNING),
        )

    def pending_ops(self, job_id: int, limit: int | None = None) -> list:
        sql = ("SELECT * FROM job_ops WHERE job_id=? AND status=? ORDER BY seq")
        if limit:
            sql += f" LIMIT {int(limit)}"
        return self.db.query(sql, (job_id, PENDING))

    def progress(self, job_id: int) -> tuple[int, int]:
        row = self.db.one(
            "SELECT COUNT(*) AS total, "
            "SUM(CASE WHEN status IN ('done','skipped') THEN 1 ELSE 0 END) AS done "
            "FROM job_ops WHERE job_id=?",
            (job_id,),
        )
        return (int(row["done"] or 0), int(row["total"] or 0)) if row else (0, 0)

    def context(self, job_id: int) -> dict:
        row = self.job(job_id)
        if not row:
            return {}
        try:
            return json.loads(row["payload"] or "{}").get("context", {})
        except json.JSONDecodeError:
            return {}

    def update_context(self, job_id: int, updates: dict) -> None:
        if not updates:
            return
        with self.db.write() as conn:
            row = conn.execute("SELECT payload FROM jobs WHERE job_id=?", (job_id,)).fetchone()
            payload = json.loads(row["payload"] or "{}") if row else {}
            payload.setdefault("context", {}).update(updates)
            conn.execute("UPDATE jobs SET payload=? WHERE job_id=?",
                         (json.dumps(payload, ensure_ascii=False), job_id))

    # ---- 상태 변경 -------------------------------------------------------

    def set_status(self, job_id: int, status: str) -> None:
        stamp = now_utc().isoformat()
        if status == RUNNING:
            self.db.execute(
                "UPDATE jobs SET status=?, started_at=COALESCE(started_at, ?) WHERE job_id=?",
                (status, stamp, job_id),
            )
        elif status in (DONE, FAILED, CANCELLED):
            self.db.execute(
                "UPDATE jobs SET status=?, finished_at=? WHERE job_id=?",
                (status, stamp, job_id),
            )
        else:
            self.db.execute("UPDATE jobs SET status=? WHERE job_id=?", (status, job_id))

    def mark_op(self, op_id: int, status: str, cost: int = 0, result: str = "",
                error: str = "") -> None:
        self.db.execute(
            "UPDATE job_ops SET status=?, result=?, error=?, updated_at=?, "
            "attempts=attempts+1 WHERE op_id=?",
            (status, result, error, now_utc().isoformat(), op_id),
        )

    def bump_job_counters(self, job_id: int, done: int = 0, failed: int = 0,
                          spent: int = 0) -> None:
        self.db.execute(
            "UPDATE jobs SET done_ops=done_ops+?, failed_ops=failed_ops+?, "
            "spent_cost=spent_cost+? WHERE job_id=?",
            (done, failed, spent, job_id),
        )

    def cancel(self, job_id: int) -> int:
        """남은 연산을 취소한다. 이미 실행된 것은 되돌리기로 처리해야 한다."""
        with self.db.write() as conn:
            cursor = conn.execute(
                "UPDATE job_ops SET status=? WHERE job_id=? AND status=?",
                (CANCELLED, job_id, PENDING),
            )
            removed = cursor.rowcount
            conn.execute("UPDATE jobs SET status=?, finished_at=? WHERE job_id=?",
                         (CANCELLED, now_utc().isoformat(), job_id))
        return removed

    def finalize(self, job_id: int) -> str:
        """남은 연산이 없으면 작업을 완료(또는 실패)로 닫는다."""
        row = self.db.one(
            "SELECT "
            " SUM(CASE WHEN status=? THEN 1 ELSE 0 END) AS pending, "
            " SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END) AS failed "
            "FROM job_ops WHERE job_id=?",
            (PENDING, job_id),
        )
        pending = int(row["pending"] or 0)
        failed = int(row["failed"] or 0)
        if pending > 0:
            return PAUSED
        status = FAILED if failed else DONE
        self.set_status(job_id, status)
        return status



def method_for_op(op_type: str) -> str:
    """연산 종류에 대응하는 API 메서드 이름. 비용 조회에 쓴다."""
    return OP_METHODS.get(op_type, "playlistItems.insert")


def cost_for_op(op_type: str) -> int:
    """연산 하나에 드는 유닛."""
    return cost_of(method_for_op(op_type))
