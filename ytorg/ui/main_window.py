"""메인 윈도우."""

from __future__ import annotations

import logging

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QHBoxLayout, QLabel, QListWidget, QListWidgetItem, QMainWindow,
    QMessageBox, QProgressBar, QPushButton, QStackedWidget, QStatusBar,
    QVBoxLayout, QWidget,
)

from ..core.quota import QuotaExceeded
from ..jobs import queue as q
from .dialogs import error_box, info_box
from .pages.jobs import JobsPage
from .pages.organize import OrganizePage
from .pages.playlists import PlaylistsPage
from .pages.settings import SettingsPage
from .pages.subscriptions import SubscriptionsPage
from .widgets.quota_bar import QuotaBar

log = logging.getLogger(__name__)

PAGES = [
    ("구독 정리", SubscriptionsPage),
    ("재생목록", PlaylistsPage),
    ("자동 분류", OrganizePage),
    ("작업", JobsPage),
    ("설정", SettingsPage),
]


class MainWindow(QMainWindow):
    def __init__(self, ctx):
        super().__init__()
        self.ctx = ctx
        self.setWindowTitle("YTOrganizer — 유튜브 정리")
        self.resize(1080, 720)

        central = QWidget()
        self.setCentralWidget(central)
        outer = QVBoxLayout(central)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        outer.addWidget(self._top_bar())

        body = QWidget()
        body_layout = QHBoxLayout(body)
        body_layout.setContentsMargins(0, 0, 0, 0)

        self.nav = QListWidget()
        self.nav.setMaximumWidth(160)
        self.nav.setStyleSheet("QListWidget { border: none; padding: 8px; }"
                               "QListWidget::item { padding: 10px 8px; }")
        body_layout.addWidget(self.nav)

        self.stack = QStackedWidget()
        self.stack.setContentsMargins(16, 8, 16, 8)
        body_layout.addWidget(self.stack, 1)
        outer.addWidget(body, 1)

        self.pages = []
        for title, page_class in PAGES:
            page = page_class(ctx)
            page.busy.connect(self._on_busy)
            page.quota_changed.connect(self._refresh_quota)
            self.pages.append(page)
            self.stack.addWidget(page)
            self.nav.addItem(QListWidgetItem(title))

        self.nav.currentRowChanged.connect(self._switch_page)
        self.nav.setCurrentRow(0)

        self.setStatusBar(QStatusBar())
        self.progress = QProgressBar()
        self.progress.setMaximumWidth(180)
        self.progress.setVisible(False)
        self.statusBar().addPermanentWidget(self.progress)

        # 첫 화면을 그린 직후에 연결을 시도한다 (창이 뜨기 전에 하면 멈춘 것처럼 보인다)
        QTimer.singleShot(100, self._startup)

    # ---- 상단 ------------------------------------------------------------

    def _top_bar(self) -> QWidget:
        bar = QWidget()
        bar.setStyleSheet("background: #fafafa; border-bottom: 1px solid #ddd;")
        layout = QHBoxLayout(bar)
        layout.setContentsMargins(12, 6, 12, 6)

        self.quota_bar = QuotaBar(self.ctx.ledger)
        layout.addWidget(self.quota_bar)

        self.connection_label = QLabel()
        layout.addWidget(self.connection_label)

        self.sync_button = QPushButton("새로고침")
        self.sync_button.setToolTip("유튜브에서 최신 상태를 받아와 (읽기라 저렴해)")
        self.sync_button.clicked.connect(self._sync)
        layout.addWidget(self.sync_button)

        return bar

    # ---- 시작 ------------------------------------------------------------

    def _startup(self) -> None:
        for warning in self.ctx.settings.warnings:
            self.statusBar().showMessage(warning, 8000)

        try:
            connected = self.ctx.connect(interactive=False)
        except Exception as exc:  # noqa: BLE001
            log.warning("자동 연결 실패: %s", exc)
            connected = False

        self._update_connection_label()

        if not connected:
            self.statusBar().showMessage(
                "유튜브 계정에 연결되지 않았어. 설정에서 연결해줘.", 0
            )
            self.nav.setCurrentRow(len(PAGES) - 1)  # 설정 페이지로
        else:
            self._refresh_all()
            if self.ctx.settings.auto_resume_jobs:
                self._auto_resume()

    def _auto_resume(self) -> None:
        pending = self.ctx.queue.resumable_jobs()
        if not pending:
            return

        total_remaining = sum(
            len(self.ctx.queue.pending_ops(int(j["job_id"]))) for j in pending
        )
        if not total_remaining:
            return

        answer = QMessageBox.question(
            self, "이어서 할 작업이 있어",
            f"지난번에 끝내지 못한 작업이 {len(pending)}개 있어 "
            f"(남은 항목 {total_remaining}개).\n\n지금 이어서 할까?",
            QMessageBox.Yes | QMessageBox.No,
        )
        if answer == QMessageBox.Yes:
            self.nav.setCurrentRow(3)  # 작업 페이지
            self.pages[3]._resume()

    # ---- 동작 ------------------------------------------------------------

    def _switch_page(self, index: int) -> None:
        if 0 <= index < len(self.pages):
            self.stack.setCurrentIndex(index)
            self.pages[index].refresh()

    def _sync(self) -> None:
        if self.ctx.syncer is None:
            info_box(self, "연결 필요", "먼저 설정에서 유튜브 계정을 연결해줘.")
            self.nav.setCurrentRow(len(PAGES) - 1)
            return

        page = self.stack.currentWidget()
        page.run_in_background(
            self.ctx.syncer.full_sync,
            label="동기화 중",
            scan_uploads=self.ctx.settings.scan_uploads_on_sync,
            on_done=self._on_synced,
        )

    def _on_synced(self, result) -> None:
        self._refresh_all()
        message = result.summary()
        if result.stopped_early:
            error_box(self, "동기화가 중간에 멈췄어",
                      f"{message}\n\n" + "\n".join(result.notes))
        else:
            self.statusBar().showMessage(message, 8000)

    def _on_busy(self, busy: bool, message: str) -> None:
        self.progress.setVisible(busy)
        self.progress.setRange(0, 0)  # 불확정 진행바
        self.sync_button.setEnabled(not busy)
        for page in self.pages:
            page.set_enabled_for_write(not busy and self.ctx.is_connected)
        if message:
            self.statusBar().showMessage(message)
        elif not busy:
            self.statusBar().clearMessage()

    def _refresh_quota(self) -> None:
        self.quota_bar.refresh()

    def _update_connection_label(self) -> None:
        if self.ctx.is_connected:
            channel = self.ctx.db.get_meta("my_channel_title", "")
            self.connection_label.setText(f"  {channel}  " if channel else "  연결됨  ")
            self.connection_label.setStyleSheet("color: #27ae60;")
        else:
            self.connection_label.setText("  연결 안 됨  ")
            self.connection_label.setStyleSheet("color: #c0392b;")

    def _refresh_all(self) -> None:
        self._refresh_quota()
        self._update_connection_label()
        for page in self.pages:
            page.set_enabled_for_write(self.ctx.is_connected)
        self.stack.currentWidget().refresh()

    def closeEvent(self, event) -> None:  # noqa: N802 - Qt 이름
        # 실행 중인 작업에 중단을 알린다. 진행 중인 연산 하나는 끝까지 가고,
        # 나머지는 pending으로 남아 다음 실행에서 이어진다.
        if self.ctx.executor:
            self.ctx.executor.request_stop()
        self.ctx.close()
        event.accept()
