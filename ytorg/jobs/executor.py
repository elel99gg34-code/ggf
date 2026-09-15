"""작업 실행기와 되돌리기.

실행기의 가장 중요한 성질: 할당량 소진은 '실패'가 아니라 '일시정지'다.
200개짜리 작업이 40개에서 멈췄다면 그건 정상이고, 다음 날 41번째부터 이어서
하면 된다. 그래서 실패 경로와 정지 경로를 엄격히 구분한다.
"""

from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field
from typing import Callable

from ..core.models import now_utc
from ..core.quota import QuotaExceeded
from . import queue as q
from .ops import HANDLERS, OP_LABELS, OpContext, OpDependencyError, UndoEntry

log = logging.getLogger(__name__)

# (완료 수, 전체 수, 지금 한 일)
ProgressFn = Callable[[int, int, str], None]


def _noop(done: int, total: int, message: str) -> None:
    pass


@dataclass
class RunReport:
    job_id: int
    status: str = q.PENDING
    completed: int = 0
    failed: int = 0
    remaining: int = 0
    units_spent: int = 0
    paused_reason: str = ""
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        if self.status == q.DONE:
            return f"작업 완료 — {self.completed}개 처리 · {self.units_spent:,}유닛 사용"
        if self.status == q.PAUSED:
            return (
                f"{self.completed}개 처리하고 잠시 멈췄어 (남은 {self.remaining}개는 "
                f"할당량이 리셋되면 이어서 해). {self.paused_reason}"
            )
        if self.status == q.FAILED:
            return f"{self.completed}개 처리, {self.failed}개 실패"
        if self.status == q.CANCELLED:
            return f"중단됨 — {self.completed}개까지 처리됨"
        return f"{self.completed}/{self.completed + self.remaining} 처리"


class JobExecutor:
    def __init__(self, api, db, ledger, queue: q.JobQueue | None = None):
        self.api = api
        self.db = db
        self.ledger = ledger
        self.queue = queue or q.JobQueue(db)
        self._stop = threading.Event()

    def request_stop(self) -> None:
        """사용자가 '중단'을 눌렀을 때. 진행 중인 연산 하나는 끝까지 간다."""
        self._stop.set()

    def clear_stop(self) -> None:
        self._stop.clear()

    def run(self, job_id: int, progress: ProgressFn = _noop,
            max_ops: int | None = None) -> RunReport:
        report = RunReport(job_id=job_id)
        job = self.queue.job(job_id)
        if job is None:
            report.status = q.FAILED
            report.errors.append(f"작업 {job_id}을 찾을 수 없어")
            return report

        self.queue.set_status(job_id, q.RUNNING)
        context = self.queue.context(job_id)
        spent_before = self.ledger.spent()
        done_count, total_count = self.queue.progress(job_id)

        pending = self.queue.pending_ops(job_id)
        if max_ops:
            pending = pending[:max_ops]

        for row in pending:
            if self._stop.is_set():
                self.queue.set_status(job_id, q.CANCELLED)
                report.status = q.CANCELLED
                break

            op_id = int(row["op_id"])
            op_type = row["op_type"]
            params = json.loads(row["params"] or "{}")

            # 할당량 가드. 여기서 멈추면 '실패'가 아니라 '정지'다.
            try:
                self.ledger.check(q.method_for_op(op_type), 1)
            except QuotaExceeded as exc:
                report.paused_reason = str(exc)
                break

            handler = HANDLERS.get(op_type)
            if handler is None:
                self.queue.mark_op(op_id, "failed", error=f"알 수 없는 연산: {op_type}")
                self.queue.bump_job_counters(job_id, failed=1)
                report.failed += 1
                report.errors.append(f"알 수 없는 연산: {op_type}")
                continue

            ctx = OpContext(self.api, self.db, params, job_id, context)
            try:
                result = handler(ctx)
            except QuotaExceeded as exc:
                # 서버가 소진을 통보했다. 이 연산은 실행되지 않았으므로
                # pending으로 남겨 다음 날 그대로 이어간다.
                report.paused_reason = str(exc)
                break
            except OpDependencyError as exc:
                self.queue.mark_op(op_id, "failed", error=str(exc))
                self.queue.bump_job_counters(job_id, failed=1)
                report.failed += 1
                report.errors.append(str(exc))
                continue
            except Exception as exc:  # noqa: BLE001 - 한 연산의 실패가 작업 전체를 죽이면 안 된다
                log.exception("연산 실패 op_id=%s type=%s", op_id, op_type)
                self.queue.mark_op(op_id, "failed", error=str(exc))
                self.queue.bump_job_counters(job_id, failed=1)
                report.failed += 1
                report.errors.append(f"{OP_LABELS.get(op_type, op_type)}: {exc}")
                continue

            cost = int(row["cost"] or 0)
            self.queue.mark_op(
                op_id, "skipped" if result.skipped else "done",
                cost=cost, result=json.dumps(result.result, ensure_ascii=False),
            )
            self.queue.bump_job_counters(job_id, done=1, spent=cost)

            if result.context_updates:
                context.update(result.context_updates)
                self.queue.update_context(job_id, result.context_updates)

            if result.undo:
                self._record_undo(job_id, op_id, op_type, result.undo)

            report.completed += 1
            done_count += 1
            progress(done_count, total_count,
                     result.note or OP_LABELS.get(op_type, op_type))

        # 마무리: 남은 게 있으면 정지, 없으면 완료
        remaining = len(self.queue.pending_ops(job_id))
        report.remaining = remaining
        report.units_spent = self.ledger.spent() - spent_before

        if report.status == q.CANCELLED:
            return report

        if remaining > 0:
            self.queue.set_status(job_id, q.PAUSED)
            report.status = q.PAUSED
            if not report.paused_reason:
                report.paused_reason = "남은 작업이 있어"
        else:
            report.status = self.queue.finalize(job_id)
        return report

    def run_all_resumable(self, progress: ProgressFn = _noop) -> list[RunReport]:
        """앱 시작 시 또는 할당량 리셋 후 호출. 멈춰 있던 작업을 전부 이어서 한다."""
        reports = []
        for job in self.queue.resumable_jobs():
            if self._stop.is_set():
                break
            report = self.run(int(job["job_id"]), progress)
            reports.append(report)
            if report.status == q.PAUSED and report.paused_reason:
                # 할당량이 없으면 다음 작업도 마찬가지다. 더 돌 이유가 없다.
                break
        return reports

    def _record_undo(self, job_id: int, op_id: int, op_type: str,
                     undo: UndoEntry) -> None:
        self.db.execute(
            "INSERT INTO undo_journal(job_id, op_id, op_type, inverse_type, "
            "inverse_params, label, created_at, status) VALUES(?,?,?,?,?,?,?,?)",
            (job_id, op_id, op_type, undo.inverse_type,
             json.dumps(undo.inverse_params, ensure_ascii=False), undo.label,
             now_utc().isoformat(), "available"),
        )


class UndoManager:
    """되돌리기.

    되돌리기도 API 쓰기라서 연산당 50유닛이 든다. 그래서 '무료로 취소'가
    아니라 '같은 비용을 한 번 더 쓰는 별도 작업'으로 취급하고, UI가 비용을
    명시한다.
    """

    def __init__(self, api, db, ledger, queue: q.JobQueue | None = None):
        self.api = api
        self.db = db
        self.ledger = ledger
        self.queue = queue or q.JobQueue(db)

    def undoable(self, job_id: int) -> list:
        return self.db.query(
            "SELECT * FROM undo_journal WHERE job_id=? AND status='available' "
            "ORDER BY undo_id DESC",
            (job_id,),
        )

    def undoable_jobs(self, limit: int = 20) -> list:
        return self.db.query(
            "SELECT j.job_id, j.kind, j.title, j.finished_at, "
            "       COUNT(u.undo_id) AS undo_count "
            "FROM jobs j JOIN undo_journal u ON u.job_id = j.job_id "
            "WHERE u.status='available' "
            "GROUP BY j.job_id ORDER BY j.job_id DESC LIMIT ?",
            (limit,),
        )

    def estimate(self, job_id: int) -> tuple[int, int]:
        """(되돌릴 연산 수, 드는 유닛)."""
        entries = self.undoable(job_id)
        cost = sum(q.cost_for_op(e["inverse_type"]) for e in entries)
        return len(entries), cost

    def undo_job(self, job_id: int, progress: ProgressFn = _noop) -> RunReport:
        """한 작업을 통째로 되돌린다. 실행의 역순으로 처리한다.

        역순이 중요한 이유: 재생목록을 만들고 영상을 넣었다면, 재생목록부터
        지우면 안 되고 영상을 먼저 빼야 순서가 맞다.
        """
        report = RunReport(job_id=job_id)
        entries = self.undoable(job_id)  # 이미 undo_id DESC = 역순
        report.remaining = len(entries)
        spent_before = self.ledger.spent()
        context: dict = {}

        for index, entry in enumerate(entries, 1):
            inverse_type = entry["inverse_type"]
            params = json.loads(entry["inverse_params"] or "{}")

            try:
                self.ledger.check(q.method_for_op(inverse_type), 1)
            except QuotaExceeded as exc:
                report.paused_reason = str(exc)
                report.status = q.PAUSED
                break

            handler = HANDLERS.get(inverse_type)
            if handler is None:
                report.errors.append(f"되돌릴 수 없는 연산: {inverse_type}")
                report.failed += 1
                continue

            ctx = OpContext(self.api, self.db, params, job_id, context)
            try:
                handler(ctx)
            except QuotaExceeded as exc:
                report.paused_reason = str(exc)
                report.status = q.PAUSED
                break
            except Exception as exc:  # noqa: BLE001
                log.exception("되돌리기 실패 undo_id=%s", entry["undo_id"])
                report.errors.append(str(exc))
                report.failed += 1
                continue

            self.db.execute(
                "UPDATE undo_journal SET status='undone', undone_at=? WHERE undo_id=?",
                (now_utc().isoformat(), entry["undo_id"]),
            )
            report.completed += 1
            progress(index, len(entries), entry["label"] or inverse_type)

        report.units_spent = self.ledger.spent() - spent_before
        report.remaining = len(self.undoable(job_id))
        if report.status != q.PAUSED:
            report.status = q.FAILED if report.failed else q.DONE
        return report
