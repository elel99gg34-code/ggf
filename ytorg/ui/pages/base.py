"""페이지 공통 뼈대."""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QAbstractItemView, QCheckBox, QHBoxLayout, QHeaderView, QLabel,
    QPushButton, QTableWidget, QTableWidgetItem, QVBoxLayout, QWidget,
)


class Page(QWidget):
    """모든 페이지의 공통 동작.

    busy 시그널로 메인 윈도우에 '지금 백그라운드 작업 중'을 알린다.
    작업 중에는 다른 페이지의 쓰기 버튼이 잠긴다 — 같은 할당량을 두 작업이
    동시에 쓰면 원장 계산이 어긋나기 때문이다.
    """

    busy = Signal(bool, str)
    quota_changed = Signal()

    def __init__(self, ctx, parent=None):
        super().__init__(parent)
        self.ctx = ctx
        self._worker = None

    def refresh(self) -> None:
        """캐시에서 화면을 다시 그린다. API를 부르지 않는다."""

    def set_enabled_for_write(self, enabled: bool) -> None:
        """쓰기 버튼 잠금/해제. 페이지마다 재정의한다."""

    def run_in_background(self, fn, *args, on_done=None, label: str = "처리 중",
                          wants_progress: bool = True, **kwargs) -> None:
        from ..worker import Worker
        from ..dialogs import error_box

        if self._worker is not None and self._worker.isRunning():
            return

        self.busy.emit(True, label)
        worker = Worker(fn, *args, wants_progress=wants_progress, **kwargs)
        self._worker = worker

        def finish():
            self.busy.emit(False, "")
            self.quota_changed.emit()
            self._worker = None

        def on_success(result):
            finish()
            if on_done:
                on_done(result)
            self.refresh()

        def on_error(message):
            finish()
            error_box(self, "작업 실패", message)
            self.refresh()

        worker.succeeded.connect(on_success)
        worker.failed.connect(on_error)
        worker.progressed.connect(
            lambda done, total, msg: self.busy.emit(
                True, f"{label} — {msg} ({done}/{total})" if total else f"{label} — {msg}"
            )
        )
        worker.start()


class CheckTable(QTableWidget):
    """첫 열이 체크박스인 표.

    '전부 선택 후 실행'이 기본이 되면 사고가 나므로, 선택은 항상 사용자가
    명시적으로 한다.
    """

    def __init__(self, headers: list[str], parent=None):
        super().__init__(0, len(headers) + 1, parent)
        self.setHorizontalHeaderLabels(["", *headers])
        self.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.verticalHeader().setVisible(False)
        self.setAlternatingRowColors(True)
        self.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeToContents)
        self._keys: list = []

    def load(self, rows: list[tuple], keys: list) -> None:
        self.setRowCount(len(rows))
        self._keys = keys
        for row, cells in enumerate(rows):
            check = QTableWidgetItem()
            check.setFlags(Qt.ItemIsUserCheckable | Qt.ItemIsEnabled)
            check.setCheckState(Qt.Unchecked)
            self.setItem(row, 0, check)
            for col, value in enumerate(cells, start=1):
                self.setItem(row, col, QTableWidgetItem(str(value)))
        self.resizeColumnsToContents()
        if self.columnCount() > 1:
            self.horizontalHeader().setStretchLastSection(True)

    def checked_keys(self) -> list:
        return [
            self._keys[row] for row in range(self.rowCount())
            if self.item(row, 0) and self.item(row, 0).checkState() == Qt.Checked
        ]

    def set_all(self, checked: bool) -> None:
        state = Qt.Checked if checked else Qt.Unchecked
        for row in range(self.rowCount()):
            item = self.item(row, 0)
            if item:
                item.setCheckState(state)


def header(text: str, hint: str = "") -> QWidget:
    box = QWidget()
    layout = QVBoxLayout(box)
    layout.setContentsMargins(0, 0, 0, 8)
    title = QLabel(f"<h2>{text}</h2>")
    layout.addWidget(title)
    if hint:
        label = QLabel(hint)
        label.setWordWrap(True)
        label.setStyleSheet("color: #666;")
        layout.addWidget(label)
    return box


def button_row(*widgets) -> QWidget:
    box = QWidget()
    layout = QHBoxLayout(box)
    layout.setContentsMargins(0, 0, 0, 0)
    for widget in widgets:
        if widget is None:
            layout.addStretch()
        else:
            layout.addWidget(widget)
    return box
