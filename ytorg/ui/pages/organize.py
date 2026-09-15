"""자동 분류 페이지 — 좋아요 영상을 주제별 재생목록으로."""

from __future__ import annotations

from PySide6.QtWidgets import (
    QComboBox, QLabel, QPushButton, QSpinBox, QVBoxLayout,
)

from ...features import organize as feature
from ..dialogs import PlanDialog, error_box, info_box
from .base import CheckTable, Page, button_row, header


class OrganizePage(Page):
    def __init__(self, ctx, parent=None):
        super().__init__(ctx, parent)
        self.result = None

        layout = QVBoxLayout(self)
        layout.addWidget(header(
            "자동 분류",
            "영상을 주제별 재생목록으로 나눠. 영상 하나 넣을 때마다 50유닛이라 "
            "수백 개를 분류하면 며칠에 걸쳐 나눠서 처리돼 (자동으로 이어서 함).",
        ))

        self.source = QComboBox()
        self.source.addItem("좋아요 표시한 동영상 전부", "likes")
        self.source.addItem("좋아요 중 재생목록에 없는 것만", "uncategorized")

        self.min_group = QSpinBox()
        self.min_group.setRange(1, 50)
        self.min_group.setValue(ctx.settings.min_group_size)
        self.min_group.setPrefix("최소 ")
        self.min_group.setSuffix("개")
        self.min_group.setToolTip("이보다 적게 모이는 주제는 재생목록으로 만들지 않아")

        self.analyze_button = QPushButton("분류해보기 (0유닛)")
        self.analyze_button.clicked.connect(self._analyze)

        layout.addWidget(button_row(
            QLabel("대상:"), self.source, QLabel("그룹 크기:"), self.min_group,
            None, self.analyze_button,
        ))

        self.engine_label = QLabel()
        self.engine_label.setStyleSheet("color: #666;")
        layout.addWidget(self.engine_label)

        self.table = CheckTable(["영상", "→ 재생목록", "근거"])
        layout.addWidget(self.table, 1)

        self.summary_label = QLabel("아직 분류하지 않았어.")
        self.apply_button = QPushButton("재생목록 만들기")
        self.apply_button.clicked.connect(self._apply)
        self.apply_button.setEnabled(False)

        layout.addWidget(button_row(self.summary_label, None, self.apply_button))

    def refresh(self) -> None:
        engine = "AI (Claude)" if self._ai_active() else "규칙 기반"
        liked = len(feature.liked_videos(self.ctx.db))
        stray = len(feature.uncategorized_videos(self.ctx.db))
        self.engine_label.setText(
            f"분류 엔진: {engine} · 좋아요 {liked}개 (재생목록에 없는 것 {stray}개)"
        )

    def _ai_active(self) -> bool:
        if not self.ctx.settings.use_ai:
            return False
        from ...ai.classifier import is_available

        return is_available()

    def set_enabled_for_write(self, enabled: bool) -> None:
        self.apply_button.setEnabled(enabled and self.result is not None
                                     and bool(self.result.assignments))
        self.analyze_button.setEnabled(enabled)

    def _videos(self) -> list:
        source = self.source.currentData()
        if source == "likes":
            return feature.liked_videos(self.ctx.db)
        return feature.uncategorized_videos(self.ctx.db)

    def _analyze(self) -> None:
        videos = self._videos()
        if not videos:
            info_box(self, "영상 없음",
                     "분류할 영상이 없어. 먼저 동기화(새로고침)를 해줘.")
            return

        self.ctx.settings.min_group_size = self.min_group.value()
        classifier = self.ctx.classifier()
        is_ai = hasattr(classifier, "settings")

        def classify(progress=None):
            if is_ai:
                return classifier.classify(videos)
            return classifier.classify(videos, min_group_size=self.min_group.value())

        # AI는 네트워크를 타므로 백그라운드로, 규칙은 즉시 끝나므로 그 자리에서.
        if is_ai:
            self.run_in_background(
                classify, label="AI가 분류하는 중", wants_progress=False,
                on_done=self._show_result,
            )
        else:
            try:
                self._show_result(classify())
            except Exception as exc:  # noqa: BLE001
                error_box(self, "분류 실패", str(exc))

    def _show_result(self, result) -> None:
        self.result = result
        rows = [(a.title or a.video_id, a.playlist, a.reason) for a in result.assignments]
        self.table.load(rows, list(result.assignments))
        self.table.set_all(True)   # 분류 결과는 기본 전체 선택 (되돌릴 수 있으므로)

        self.summary_label.setText(result.summary())
        self.apply_button.setEnabled(bool(result.assignments))
        if result.notes:
            self.engine_label.setText(" · ".join(result.notes[:2]))

    def _apply(self) -> None:
        if not self.result:
            return

        selected = set(self.table.checked_keys())
        if not selected:
            info_box(self, "선택 없음", "재생목록에 넣을 영상을 체크해줘.")
            return

        # 체크한 것만 반영한 결과로 계획을 만든다
        from ...rules.engine import ClassificationResult

        filtered = ClassificationResult(
            assignments=[a for a in self.result.assignments if a in selected],
            unmatched=self.result.unmatched,
            source=self.result.source,
            notes=self.result.notes,
        )
        plan = feature.plan_organize(
            self.ctx.db, filtered, self.ctx.settings.new_playlist_privacy,
            self.source.currentText(),
        )
        if not PlanDialog.confirm(plan, self.ctx.ledger, self):
            return

        job_id = self.ctx.queue.enqueue(plan)
        self.run_in_background(
            self.ctx.executor.run, job_id, label="재생목록 만드는 중",
            on_done=lambda report: info_box(self, "완료", report.summary()),
        )
