"""구독 정리 페이지."""

from __future__ import annotations

from PySide6.QtWidgets import (
    QCheckBox, QLabel, QPushButton, QSpinBox, QVBoxLayout,
)

from ...features import subscriptions as feature
from ..dialogs import PlanDialog, info_box
from .base import CheckTable, Page, button_row, header


class SubscriptionsPage(Page):
    def __init__(self, ctx, parent=None):
        super().__init__(ctx, parent)
        self.candidates: list[feature.Candidate] = []

        layout = QVBoxLayout(self)
        layout.addWidget(header(
            "구독 채널 정리",
            "유튜브는 시청 기록이나 추천 피드백을 API로 열어주지 않아. "
            "추천을 바꾸는 가장 확실한 방법은 안 보는 채널을 끊는 거야.",
        ))

        self.months = QSpinBox()
        self.months.setRange(1, 120)
        self.months.setValue(ctx.settings.dormant_months)
        self.months.setSuffix("개월")
        self.months.valueChanged.connect(self.refresh)

        self.include_unused = QCheckBox("내 재생목록에 영상이 하나도 없는 채널도 포함")
        self.include_unused.setChecked(ctx.settings.include_unused_channels)
        self.include_unused.setToolTip(
            "시청 기록 API가 없어서 쓰는 우회 지표라 오탐이 있을 수 있어."
        )
        self.include_unused.stateChanged.connect(self.refresh)

        layout.addWidget(button_row(
            QLabel("이 기간 이상 새 영상이 없으면 후보:"), self.months, None,
        ))
        layout.addWidget(self.include_unused)

        self.table = CheckTable(["채널", "사유", "상세", "구독자"])
        layout.addWidget(self.table, 1)

        self.count_label = QLabel()
        self.select_all = QPushButton("전체 선택")
        self.select_all.clicked.connect(lambda: self.table.set_all(True))
        self.clear_all = QPushButton("선택 해제")
        self.clear_all.clicked.connect(lambda: self.table.set_all(False))
        self.unsubscribe_button = QPushButton("선택한 채널 구독 취소")
        self.unsubscribe_button.clicked.connect(self._unsubscribe)

        layout.addWidget(button_row(
            self.count_label, None, self.select_all, self.clear_all,
            self.unsubscribe_button,
        ))

    def refresh(self) -> None:
        self.candidates = feature.find_candidates(
            self.ctx.db, self.months.value(), self.include_unused.isChecked()
        )
        rows = [
            (c.channel.title,
             feature.REASON_LABELS.get(c.primary, c.primary),
             c.detail,
             f"{c.channel.subscriber_count:,}" if c.channel.subscriber_count else "-")
            for c in self.candidates
        ]
        self.table.load(rows, self.candidates)

        total = len(self.ctx.db.channels())
        self.count_label.setText(
            f"구독 {total}개 중 정리 후보 {len(self.candidates)}개"
        )

    def set_enabled_for_write(self, enabled: bool) -> None:
        self.unsubscribe_button.setEnabled(enabled)

    def _unsubscribe(self) -> None:
        selected = self.table.checked_keys()
        if not selected:
            info_box(self, "선택 없음", "구독을 취소할 채널을 먼저 체크해줘.")
            return

        plan = feature.plan_unsubscribe(selected)
        if not PlanDialog.confirm(plan, self.ctx.ledger, self):
            return

        job_id = self.ctx.queue.enqueue(plan)
        self.run_in_background(
            self.ctx.executor.run, job_id,
            label="구독 취소 중",
            on_done=lambda report: info_box(self, "완료", report.summary()),
        )
