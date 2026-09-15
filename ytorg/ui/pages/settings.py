"""설정 페이지.

여기서 가장 중요한 항목은 '내 API 설정 쓰기'다. 할당량은 Google Cloud
프로젝트 단위로 하루 10,000유닛이라, 같은 앱을 여러 사람이 쓰면 그 10,000을
나눠 쓰게 된다. 자기 프로젝트를 등록하면 온전한 10,000유닛을 혼자 쓴다.
"""

from __future__ import annotations

from PySide6.QtWidgets import (
    QCheckBox, QComboBox, QDoubleSpinBox, QFileDialog, QFormLayout, QGroupBox,
    QLabel, QLineEdit, QPushButton, QSpinBox, QVBoxLayout,
)

from ...core import auth, paths
from ..dialogs import error_box, info_box
from .base import Page, button_row, header


class SettingsPage(Page):
    def __init__(self, ctx, parent=None):
        super().__init__(ctx, parent)

        layout = QVBoxLayout(self)
        layout.addWidget(header("설정"))

        layout.addWidget(self._account_group())
        layout.addWidget(self._quota_group())
        layout.addWidget(self._ai_group())
        layout.addWidget(self._rules_group())

        self.usage_label = QLabel()
        self.usage_label.setStyleSheet("color: #666;")
        layout.addWidget(self.usage_label)
        layout.addStretch()

    # ---- 계정 -----------------------------------------------------------

    def _account_group(self) -> QGroupBox:
        box = QGroupBox("계정과 API")
        layout = QVBoxLayout(box)

        self.account_label = QLabel()
        layout.addWidget(self.account_label)

        self.login_button = QPushButton("유튜브 계정 연결")
        self.login_button.clicked.connect(self._login)
        self.logout_button = QPushButton("연결 끊기")
        self.logout_button.clicked.connect(self._logout)
        layout.addWidget(button_row(self.login_button, self.logout_button, None))

        hint = QLabel(
            "<b>할당량이 부족하면:</b> 유튜브 API는 Google Cloud 프로젝트마다 "
            "하루 10,000유닛이야. 이 앱을 여러 사람이 쓰면 그 10,000을 나눠 써. "
            "직접 만든 프로젝트의 client_secret.json을 등록하면 온전히 혼자 쓸 수 있어."
        )
        hint.setWordWrap(True)
        hint.setStyleSheet("color: #666;")
        layout.addWidget(hint)

        self.client_label = QLabel()
        layout.addWidget(self.client_label)

        self.pick_client = QPushButton("내 client_secret.json 등록")
        self.pick_client.clicked.connect(self._pick_client_secret)
        self.reset_client = QPushButton("기본 설정으로 되돌리기")
        self.reset_client.clicked.connect(self._reset_client_secret)
        layout.addWidget(button_row(self.pick_client, self.reset_client, None))

        return box

    def _login(self) -> None:
        try:
            if self.ctx.connect(interactive=True):
                info_box(self, "연결됨", "유튜브 계정에 연결했어. 이제 새로고침을 눌러봐.")
            else:
                error_box(self, "실패", "로그인이 취소됐거나 실패했어.")
        except auth.AuthError as exc:
            error_box(self, "설정 문제", str(exc))
        self.refresh()

    def _logout(self) -> None:
        self.ctx.disconnect()
        info_box(self, "연결 끊음", "저장된 토큰을 지웠어. 캐시는 그대로 남아 있어.")
        self.refresh()

    def _pick_client_secret(self) -> None:
        path, _ = QFileDialog.getOpenFileName(
            self, "client_secret.json 고르기", "", "JSON (*.json)"
        )
        if not path:
            return
        import json
        import shutil

        try:
            data = json.loads(open(path, encoding="utf-8").read())
            if "installed" not in data:
                error_box(self, "형식이 달라",
                          "'데스크톱 앱' 유형으로 만든 client_secret.json이어야 해.\n"
                          "웹 애플리케이션 유형은 이 앱에서 쓸 수 없어.")
                return
            shutil.copy(path, auth.user_client_secret_path())
        except (OSError, json.JSONDecodeError) as exc:
            error_box(self, "읽기 실패", str(exc))
            return

        info_box(self, "등록됨",
                 "내 API 설정을 등록했어. 연결을 끊고 다시 로그인하면 적용돼.")
        self.refresh()

    def _reset_client_secret(self) -> None:
        path = auth.user_client_secret_path()
        if path.exists():
            path.unlink()
        info_box(self, "되돌림", "기본 설정으로 돌아갔어. 다시 로그인해줘.")
        self.refresh()

    # ---- 할당량 ----------------------------------------------------------

    def _quota_group(self) -> QGroupBox:
        box = QGroupBox("할당량")
        layout = QFormLayout(box)

        self.reserve = QSpinBox()
        self.reserve.setRange(0, 5000)
        self.reserve.setSingleStep(100)
        self.reserve.setValue(self.ctx.settings.quota_reserve)
        self.reserve.setSuffix(" 유닛")
        self.reserve.setToolTip(
            "쓰기 작업이 다 써버리지 않게 남겨두는 몫. "
            "이게 없으면 다음 날 현황 파악조차 못 한다."
        )
        self.reserve.valueChanged.connect(self._save)
        layout.addRow("읽기용으로 남길 몫:", self.reserve)

        self.rate = QDoubleSpinBox()
        self.rate.setRange(0.5, 10.0)
        self.rate.setSingleStep(0.5)
        self.rate.setValue(self.ctx.settings.rate_limit_per_sec)
        self.rate.setSuffix(" 건/초")
        self.rate.setToolTip("너무 빠르면 유튜브 스팸 필터에 걸릴 수 있어")
        self.rate.valueChanged.connect(self._save)
        layout.addRow("요청 속도 제한:", self.rate)

        self.auto_resume = QCheckBox("앱을 켤 때 멈춰 있던 작업을 이어서 하기")
        self.auto_resume.setChecked(self.ctx.settings.auto_resume_jobs)
        self.auto_resume.stateChanged.connect(self._save)
        layout.addRow(self.auto_resume)

        self.scan_uploads = QCheckBox(
            "동기화할 때 채널별 최신 업로드도 확인 (채널당 1유닛)"
        )
        self.scan_uploads.setChecked(self.ctx.settings.scan_uploads_on_sync)
        self.scan_uploads.setToolTip("휴면 채널 판정에 필요해. 끄면 동기화가 훨씬 싸져.")
        self.scan_uploads.stateChanged.connect(self._save)
        layout.addRow(self.scan_uploads)

        return box

    # ---- AI -------------------------------------------------------------

    def _ai_group(self) -> QGroupBox:
        box = QGroupBox("AI 분류 (선택)")
        layout = QFormLayout(box)

        self.use_ai = QCheckBox("AI로 분류하기 (끄면 규칙 기반으로 동작)")
        self.use_ai.setChecked(self.ctx.settings.use_ai)
        self.use_ai.stateChanged.connect(self._save)
        layout.addRow(self.use_ai)

        self.api_key = QLineEdit()
        self.api_key.setEchoMode(QLineEdit.Password)
        self.api_key.setPlaceholderText("sk-ant-...")
        save_key = QPushButton("키 저장")
        save_key.clicked.connect(self._save_api_key)
        layout.addRow("Claude API 키:", button_row(self.api_key, save_key))

        self.ai_model = QComboBox()
        for model, label in [
            ("claude-opus-5", "Opus 5 (품질 우선)"),
            ("claude-sonnet-5", "Sonnet 5 (균형)"),
            ("claude-haiku-4-5", "Haiku 4.5 (저렴)"),
        ]:
            self.ai_model.addItem(label, model)
        index = self.ai_model.findData(self.ctx.settings.ai_model)
        if index >= 0:
            self.ai_model.setCurrentIndex(index)
        self.ai_model.currentIndexChanged.connect(self._save)
        layout.addRow("모델:", self.ai_model)

        self.ai_status = QLabel()
        self.ai_status.setStyleSheet("color: #666;")
        layout.addRow(self.ai_status)

        return box

    def _save_api_key(self) -> None:
        from ...ai.classifier import save_api_key

        key = self.api_key.text().strip()
        if not key:
            error_box(self, "빈 값", "API 키를 입력해줘.")
            return
        save_api_key(key)
        self.api_key.clear()
        info_box(self, "저장됨", "API 키를 안전한 저장소에 넣었어.")
        self.refresh()

    # ---- 규칙 -----------------------------------------------------------

    def _rules_group(self) -> QGroupBox:
        box = QGroupBox("분류 규칙")
        layout = QVBoxLayout(box)

        self.rules_label = QLabel()
        self.rules_label.setWordWrap(True)
        layout.addWidget(self.rules_label)

        export = QPushButton("기본 규칙을 파일로 내보내기")
        export.clicked.connect(self._export_rules)
        open_folder = QPushButton("설정 폴더 열기")
        open_folder.clicked.connect(self._open_folder)
        layout.addWidget(button_row(export, open_folder, None))

        self.min_group = QSpinBox()
        self.min_group.setRange(1, 50)
        self.min_group.setValue(self.ctx.settings.min_group_size)
        self.min_group.setPrefix("최소 ")
        self.min_group.setSuffix("개 모여야 재생목록으로 만듦")
        self.min_group.valueChanged.connect(self._save)
        layout.addWidget(self.min_group)

        self.privacy = QComboBox()
        for value, label in [("private", "비공개"), ("unlisted", "일부 공개"),
                             ("public", "공개")]:
            self.privacy.addItem(label, value)
        index = self.privacy.findData(self.ctx.settings.new_playlist_privacy)
        if index >= 0:
            self.privacy.setCurrentIndex(index)
        self.privacy.currentIndexChanged.connect(self._save)
        layout.addWidget(button_row(QLabel("새 재생목록 공개 범위:"), self.privacy, None))

        return box

    def _export_rules(self) -> None:
        from ...rules.schema import write_default_rules_file

        path = write_default_rules_file()
        info_box(self, "내보냄",
                 f"기본 규칙을 저장했어:\n{path}\n\n"
                 "이 파일을 고치면 다음 분류부터 반영돼.")
        self.refresh()

    def _open_folder(self) -> None:
        from PySide6.QtGui import QDesktopServices
        from PySide6.QtCore import QUrl

        QDesktopServices.openUrl(QUrl.fromLocalFile(str(paths.data_dir())))

    # ---- 공통 -----------------------------------------------------------

    def _save(self) -> None:
        settings = self.ctx.settings
        settings.quota_reserve = self.reserve.value()
        settings.rate_limit_per_sec = self.rate.value()
        settings.auto_resume_jobs = self.auto_resume.isChecked()
        settings.scan_uploads_on_sync = self.scan_uploads.isChecked()
        settings.use_ai = self.use_ai.isChecked()
        settings.ai_model = self.ai_model.currentData()
        settings.min_group_size = self.min_group.value()
        settings.new_playlist_privacy = self.privacy.currentData()
        settings.save()

        # 원장에 바로 반영해야 할당량 표시가 맞는다
        self.ctx.ledger.reserve = settings.quota_reserve
        self.quota_changed.emit()

    def refresh(self) -> None:
        connected = self.ctx.is_connected
        channel = self.ctx.db.get_meta("my_channel_title", "")
        self.account_label.setText(
            f"연결됨 — <b>{channel}</b>" if connected and channel
            else "연결됨" if connected else "아직 연결 안 됨"
        )
        self.login_button.setEnabled(not connected)
        self.logout_button.setEnabled(connected)

        try:
            config = auth.load_client_config()
            source = "내 프로젝트" if config.is_user_supplied else "앱 기본 설정 (공유)"
            project = f" · {config.project_hint}" if config.project_hint else ""
            self.client_label.setText(f"API 설정: <b>{source}</b>{project}")
        except auth.AuthError:
            self.client_label.setText("API 설정: <b>없음</b> — client_secret.json을 등록해줘")

        from ...ai.classifier import is_available

        self.ai_status.setText(
            "API 키가 저장돼 있어" if is_available()
            else "키가 없어서 규칙 기반으로 동작해"
        )

        from ...rules.schema import rules_path

        path = rules_path()
        engine = self.ctx.rule_engine()
        self.rules_label.setText(
            f"규칙 {len(engine.rules)}개 · "
            + (f"내 파일 사용 중 ({path.name})" if path.exists() else "기본 규칙 사용 중")
        )

        usage = self.ctx.ledger.usage_by_method()
        if usage:
            top = " · ".join(f"{m} {c:,}유닛" for m, _, c in usage[:4])
            self.usage_label.setText(f"오늘 사용처: {top}")
        else:
            self.usage_label.setText("오늘은 아직 API를 쓰지 않았어.")
