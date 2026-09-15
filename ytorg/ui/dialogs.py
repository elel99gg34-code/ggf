"""미리보기 → 승인 다이얼로그.

이 앱에서 쓰기는 절대 즉시 실행되지 않는다. 무엇이 바뀌는지, 유닛이 얼마나
드는지, 며칠 걸리는지를 먼저 보여주고 사용자가 동의해야 큐에 들어간다.
구독 300개를 잘못 날리면 되돌릴 방법이 마땅치 않기 때문이다.
"""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QAbstractItemView, QDialog, QDialogButtonBox, QHBoxLayout, QLabel,
    QMessageBox, QTableWidget, QTableWidgetItem, QVBoxLayout,
)


class PlanDialog(QDialog):
    """계획을 표로 보여주고 승인을 받는다."""

    def __init__(self, plan, ledger, parent=None):
        super().__init__(parent)
        self.plan = plan
        self.setWindowTitle(f"확인 — {plan.title}")
        self.resize(760, 520)

        layout = QVBoxLayout(self)

        summary = QLabel(plan.describe())
        summary.setStyleSheet("font-size: 14px; font-weight: bold;")
        layout.addWidget(summary)

        budget = plan.budget(ledger)
        budget_label = QLabel(budget.describe())
        budget_label.setWordWrap(True)
        if not budget.fits_today:
            budget_label.setStyleSheet("color: #e67e22;")
        layout.addWidget(budget_label)

        table = QTableWidget(len(plan.rows), 3)
        table.setHorizontalHeaderLabels(["대상", "동작", "사유"])
        table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        table.setSelectionMode(QAbstractItemView.NoSelection)
        table.verticalHeader().setVisible(False)
        for row, cells in enumerate(plan.rows):
            for col, value in enumerate(cells):
                table.setItem(row, col, QTableWidgetItem(str(value)))
        table.resizeColumnsToContents()
        table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(table, 1)

        for warning in plan.warnings:
            label = QLabel(f"⚠  {warning}")
            label.setWordWrap(True)
            label.setStyleSheet("color: #b9770e;")
            layout.addWidget(label)

        buttons = QDialogButtonBox()
        self.ok_button = buttons.addButton("실행", QDialogButtonBox.AcceptRole)
        buttons.addButton("취소", QDialogButtonBox.RejectRole)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    @classmethod
    def confirm(cls, plan, ledger, parent=None) -> bool:
        if plan.is_empty:
            QMessageBox.information(parent, "할 게 없어",
                                    "바꿀 내용이 없어.\n\n" + "\n".join(plan.warnings))
            return False
        return cls(plan, ledger, parent).exec() == QDialog.Accepted


class UndoDialog(QDialog):
    """되돌리기 확인. 되돌리기도 유닛을 쓴다는 걸 분명히 알린다."""

    def __init__(self, job_title: str, count: int, cost: int, parent=None):
        super().__init__(parent)
        self.setWindowTitle("되돌리기")
        layout = QVBoxLayout(self)

        layout.addWidget(QLabel(f"<b>{job_title}</b>"))
        layout.addWidget(QLabel(f"{count}건을 되돌려."))

        cost_label = QLabel(
            f"되돌리기도 API 쓰기라 <b>{cost:,}유닛</b>이 들어.\n"
            f"취소가 아니라 '반대 작업을 한 번 더 하는 것'이야."
        )
        cost_label.setWordWrap(True)
        cost_label.setStyleSheet("color: #b9770e;")
        layout.addWidget(cost_label)

        buttons = QDialogButtonBox()
        buttons.addButton("되돌리기", QDialogButtonBox.AcceptRole)
        buttons.addButton("그대로 두기", QDialogButtonBox.RejectRole)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)


def error_box(parent, title: str, message: str) -> None:
    QMessageBox.critical(parent, title, message)


def info_box(parent, title: str, message: str) -> None:
    QMessageBox.information(parent, title, message)
