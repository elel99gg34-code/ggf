"""재생목록 청소·정렬·병합 페이지."""

from __future__ import annotations

from PySide6.QtWidgets import (
    QComboBox, QLabel, QListWidget, QListWidgetItem, QPushButton, QSplitter,
    QVBoxLayout, QWidget,
)
from PySide6.QtCore import Qt

from ...features import playlists as feature
from ..dialogs import PlanDialog, info_box
from .base import CheckTable, Page, button_row, header


class PlaylistsPage(Page):
    def __init__(self, ctx, parent=None):
        super().__init__(ctx, parent)

        layout = QVBoxLayout(self)
        layout.addWidget(header(
            "재생목록 정리",
            "삭제·비공개된 영상과 중복 항목을 치우고, 순서를 정렬해. "
            "순서 변경은 항목당 50유닛이라 이미 제자리인 건 건드리지 않아.",
        ))

        splitter = QSplitter(Qt.Horizontal)

        self.playlist_list = QListWidget()
        self.playlist_list.currentItemChanged.connect(self._on_select)
        self.playlist_list.setMaximumWidth(280)
        splitter.addWidget(self.playlist_list)

        right = QWidget()
        right_layout = QVBoxLayout(right)
        right_layout.setContentsMargins(8, 0, 0, 0)

        self.findings_label = QLabel("재생목록을 골라줘.")
        right_layout.addWidget(self.findings_label)

        self.table = CheckTable(["영상", "문제", "위치"])
        right_layout.addWidget(self.table, 1)

        self.clean_button = QPushButton("선택한 항목 빼기")
        self.clean_button.clicked.connect(self._clean)

        self.sort_key = QComboBox()
        for key, label in feature.SORT_KEYS.items():
            self.sort_key.addItem(label, key)
        self.sort_key.setCurrentIndex(1)
        self.sort_button = QPushButton("정렬")
        self.sort_button.clicked.connect(self._sort)

        right_layout.addWidget(button_row(
            self.clean_button, None, QLabel("정렬 기준:"), self.sort_key, self.sort_button,
        ))
        splitter.addWidget(right)
        splitter.setStretchFactor(1, 1)
        layout.addWidget(splitter, 1)

    @property
    def current_playlist_id(self) -> str | None:
        item = self.playlist_list.currentItem()
        return item.data(Qt.UserRole) if item else None

    def refresh(self) -> None:
        current = self.current_playlist_id
        self.playlist_list.blockSignals(True)
        self.playlist_list.clear()
        for playlist in self.ctx.db.playlists():
            suffix = " (좋아요)" if playlist.kind == "likes" else ""
            item = QListWidgetItem(f"{playlist.title}{suffix} · {playlist.item_count}개")
            item.setData(Qt.UserRole, playlist.playlist_id)
            self.playlist_list.addItem(item)
            if playlist.playlist_id == current:
                self.playlist_list.setCurrentItem(item)
        self.playlist_list.blockSignals(False)
        self._on_select()

    def set_enabled_for_write(self, enabled: bool) -> None:
        self.clean_button.setEnabled(enabled)
        self.sort_button.setEnabled(enabled)

    def _on_select(self, *args) -> None:
        playlist_id = self.current_playlist_id
        if not playlist_id:
            self.table.load([], [])
            return

        findings = feature.inspect(self.ctx.db, playlist_id)
        items = self.ctx.db.playlist_items(playlist_id)
        videos = self.ctx.db.videos_by_ids([i.video_id for i in items])

        rows, keys = [], []
        for item in findings.dead:
            rows.append((item.title_snapshot or item.video_id, "삭제·비공개", item.position + 1))
            keys.append(item)
        for item in findings.duplicates:
            video = videos.get(item.video_id)
            rows.append(((video.title if video else item.title_snapshot) or item.video_id,
                         "중복", item.position + 1))
            keys.append(item)

        self.table.load(rows, keys)
        self.findings_label.setText(
            f"항목 {len(items)}개 · {findings.describe()}"
        )

    def _clean(self) -> None:
        playlist_id = self.current_playlist_id
        selected = self.table.checked_keys()
        if not playlist_id or not selected:
            info_box(self, "선택 없음", "뺄 항목을 먼저 체크해줘.")
            return

        findings = feature.CleanupFindings(
            dead=[i for i in selected if i.is_dead],
            duplicates=[i for i in selected if not i.is_dead],
        )
        plan = feature.plan_cleanup(self.ctx.db, playlist_id, findings)
        if not PlanDialog.confirm(plan, self.ctx.ledger, self):
            return

        job_id = self.ctx.queue.enqueue(plan)
        self.run_in_background(
            self.ctx.executor.run, job_id, label="항목 빼는 중",
            on_done=lambda report: info_box(self, "완료", report.summary()),
        )

    def _sort(self) -> None:
        playlist_id = self.current_playlist_id
        if not playlist_id:
            return
        plan = feature.plan_sort(self.ctx.db, playlist_id, self.sort_key.currentData())
        if not PlanDialog.confirm(plan, self.ctx.ledger, self):
            return

        job_id = self.ctx.queue.enqueue(plan)
        self.run_in_background(
            self.ctx.executor.run, job_id, label="정렬 중",
            on_done=lambda report: info_box(self, "완료", report.summary()),
        )
