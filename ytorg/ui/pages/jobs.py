"""작업 목록 — 진행 중·멈춘 작업과 되돌리기."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QAbstractItemView, QHeaderView, QLabel, QPushButton, QTableWidget,
    QTableWidgetItem, QVBoxLayout,
)

from ...jobs import queue as q
from ..dialogs import UndoDialog, info_box
from .base import Page, button_row, header

STATUS_LABELS = {
    q.PENDING: "대기 중", q.RUNNING: "실행 중", q.PAUSED: "할당량 대기",
    q.DONE: "완료", q.FAILED: "실패", q.CANCELLED: "취소됨",
}


class JobsPage(Page):
    def __init__(self, ctx, parent=None):
        super().__init__(ctx, parent)
        self.jobs: list = []

        layout = QVBoxLayout(self)
        layout.addWidget(header(
            "작업",
            "할당량이 떨어져 멈춘 작업은 실패가 아니야. 리셋되면 남은 것부터 "
            "이어서 돌아가.",
        ))

        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(
            ["#", "작업", "상태", "진행", "쓴 유닛", "시각"]
        )
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.verticalHeader().setVisible(False)
        self.table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(self.table, 1)

        self.resume_button = QPushButton("멈춘 작업 이어서 하기")
        self.resume_button.clicked.connect(self._resume)
        self.undo_button = QPushButton("선택한 작업 되돌리기")
        self.undo_button.clicked.connect(self._undo)
        self.cancel_button = QPushButton("남은 작업 취소")
        self.cancel_button.clicked.connect(self._cancel)

        self.status_label = QLabel()
        layout.addWidget(button_row(
            self.status_label, None, self.cancel_button, self.undo_button,
            self.resume_button,
        ))

    def refresh(self) -> None:
        self.jobs = self.ctx.queue.jobs(limit=50)
        self.table.setRowCount(len(self.jobs))

        for row, job in enumerate(self.jobs):
            values = [
                job["job_id"], job["title"],
                STATUS_LABELS.get(job["status"], job["status"]),
                f"{job['done_ops']}/{job['total_ops']}",
                f"{job['spent_cost']:,}",
                (job["finished_at"] or job["started_at"] or job["created_at"] or "")[:16]
                .replace("T", " "),
            ]
            for col, value in enumerate(values):
                item = QTableWidgetItem(str(value))
                if col == 2 and job["status"] == q.PAUSED:
                    item.setForeground(Qt.darkYellow)
                elif col == 2 and job["status"] == q.FAILED:
                    item.setForeground(Qt.red)
                self.table.setItem(row, col, item)
        self.table.resizeColumnsToContents()
        self.table.horizontalHeader().setStretchLastSection(True)

        paused = [j for j in self.jobs if j["status"] in (q.PAUSED, q.PENDING)]
        self.resume_button.setEnabled(bool(paused))
        self.status_label.setText(
            f"이어서 할 작업 {len(paused)}개" if paused else "멈춰 있는 작업 없음"
        )

    def set_enabled_for_write(self, enabled: bool) -> None:
        for button in (self.resume_button, self.undo_button, self.cancel_button):
            button.setEnabled(enabled)
        if enabled:
            self.refresh()

    def _selected_job(self):
        row = self.table.currentRow()
        return self.jobs[row] if 0 <= row < len(self.jobs) else None

    def _resume(self) -> None:
        self.run_in_background(
            self.ctx.executor.run_all_resumable, label="이어서 실행 중",
            on_done=lambda reports: info_box(
                self, "완료",
                "\n".join(f"#{r.job_id}: {r.summary()}" for r in reports) or "할 게 없었어",
            ),
        )

    def _undo(self) -> None:
        job = self._selected_job()
        if job is None:
            info_box(self, "선택 없음", "되돌릴 작업을 표에서 골라줘.")
            return

        count, cost = self.ctx.undo.estimate(job["job_id"])
        if count == 0:
            info_box(self, "되돌릴 게 없어",
                     "이 작업은 되돌릴 항목이 없어.\n"
                     "(재생목록 삭제처럼 복원이 불가능한 작업일 수 있어)")
            return

        if UndoDialog(job["title"], count, cost, self).exec():
            self.run_in_background(
                self.ctx.undo.undo_job, job["job_id"], label="되돌리는 중",
                on_done=lambda report: info_box(self, "완료", report.summary()),
            )

    def _cancel(self) -> None:
        job = self._selected_job()
        if job is None:
            return
        removed = self.ctx.queue.cancel(job["job_id"])
        info_box(self, "취소됨", f"남은 작업 {removed}개를 취소했어.\n"
                                 "이미 실행된 건 '되돌리기'로 처리해줘.")
        self.refresh()
