"""할당량 표시줄.

앱 어디에 있든 '오늘 얼마나 남았나'가 보여야 한다. 이 숫자가 곧 오늘
무엇을 할 수 있는지를 결정하기 때문이다.
"""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QHBoxLayout, QLabel, QProgressBar, QWidget


class QuotaBar(QWidget):
    def __init__(self, ledger, parent=None):
        super().__init__(parent)
        self.ledger = ledger

        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 6, 12, 6)
        layout.setSpacing(12)

        self.label = QLabel()
        self.label.setTextFormat(Qt.PlainText)

        self.bar = QProgressBar()
        self.bar.setMaximumWidth(220)
        self.bar.setMaximumHeight(14)
        self.bar.setTextVisible(False)

        self.detail = QLabel()
        self.detail.setStyleSheet("color: #666;")

        layout.addWidget(self.label)
        layout.addWidget(self.bar)
        layout.addWidget(self.detail)
        layout.addStretch()
        self.refresh()

    def refresh(self) -> None:
        limit = self.ledger.daily_limit
        spent = self.ledger.spent()
        remaining = self.ledger.remaining()
        writes = self.ledger.spendable() // 50

        self.bar.setMaximum(limit)
        self.bar.setValue(min(spent, limit))

        if self.ledger.is_exhausted():
            self.label.setText("오늘 할당량 소진")
            self.detail.setText("태평양시 자정에 리셋되면 멈춘 작업이 이어서 돌아가")
            color = "#c0392b"
        else:
            self.label.setText(f"남은 유닛 {remaining:,} / {limit:,}")
            self.detail.setText(f"쓰기 작업 약 {writes}건 가능")
            ratio = spent / limit if limit else 0
            color = "#c0392b" if ratio > 0.9 else "#e67e22" if ratio > 0.7 else "#27ae60"

        self.bar.setStyleSheet(
            f"QProgressBar {{ border: 1px solid #ccc; border-radius: 6px; }}"
            f"QProgressBar::chunk {{ background-color: {color}; border-radius: 5px; }}"
        )
