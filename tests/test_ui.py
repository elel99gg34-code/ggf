"""GUI 스모크 테스트.

헤드리스(offscreen)에서 페이지를 만들고 새로고침해 크래시가 없는지 본다.
클릭 시나리오까지는 못 하지만, '캐시가 비었을 때', '연결이 안 됐을 때' 같은
경계 상황에서 화면이 죽지 않는지는 여기서 잡힌다.
"""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

pytest.importorskip("PySide6")

from PySide6.QtWidgets import QApplication  # noqa: E402

from ytorg.app import AppContext  # noqa: E402
from ytorg.core.api import YouTubeAPI  # noqa: E402
from ytorg.jobs.queue import JobQueue  # noqa: E402


@pytest.fixture(scope="session")
def qapp():
    app = QApplication.instance() or QApplication([])
    yield app


@pytest.fixture(autouse=True)
def no_modals(monkeypatch):
    """모달 대화상자를 자동으로 막는다.

    QMessageBox.information/critical/question은 사람이 누를 때까지 블로킹하므로
    헤드리스 테스트에서 그대로 두면 스위트 전체가 멈춘다. 실수로 모달을 띄우는
    코드가 들어와도 테스트가 멎지 않게 여기서 일괄 차단한다.
    """
    from PySide6.QtWidgets import QMessageBox

    monkeypatch.setattr(QMessageBox, "information", staticmethod(lambda *a, **k: None))
    monkeypatch.setattr(QMessageBox, "critical", staticmethod(lambda *a, **k: None))
    monkeypatch.setattr(QMessageBox, "warning", staticmethod(lambda *a, **k: None))
    monkeypatch.setattr(QMessageBox, "question",
                        staticmethod(lambda *a, **k: QMessageBox.No))


@pytest.fixture
def ui_ctx(db, ledger, tmp_path, monkeypatch):
    monkeypatch.setenv("YTORG_DATA_DIR", str(tmp_path))
    ctx = AppContext.create()
    ctx.db = db
    ctx.ledger = ledger
    ctx.queue = JobQueue(db)
    return ctx


def test_window_opens_with_empty_cache(qapp, ui_ctx):
    """처음 켰을 때 — 로그인도 안 됐고 캐시도 비어 있다."""
    from ytorg.ui.main_window import MainWindow

    window = MainWindow(ui_ctx)

    assert window.stack.count() == 5
    # 연결이 안 됐으면 쓰기 버튼이 잠겨 있어야 한다
    window._on_busy(False, "")
    subs_page = window.pages[0]
    assert not subs_page.unsubscribe_button.isEnabled()
    window.close()


def test_every_page_refreshes_without_data(qapp, ui_ctx):
    from ytorg.ui.main_window import PAGES

    for _, page_class in PAGES:
        page = page_class(ui_ctx)
        page.refresh()      # 빈 DB에서도 죽으면 안 된다
        page.deleteLater()


def test_pages_populate_from_cache(qapp, ui_ctx, fake, account):
    ui_ctx.attach(YouTubeAPI(fake, ui_ctx.ledger, rate_limit_per_sec=0))
    ui_ctx.syncer.full_sync()

    from ytorg.ui.pages.playlists import PlaylistsPage
    from ytorg.ui.pages.subscriptions import SubscriptionsPage

    subs = SubscriptionsPage(ui_ctx)
    subs.refresh()
    assert "구독 3개" in subs.count_label.text()

    playlists = PlaylistsPage(ui_ctx)
    playlists.refresh()
    assert playlists.playlist_list.count() >= 2   # 사용자 목록 + 좋아요


def test_quota_bar_reflects_spending(qapp, ui_ctx):
    from ytorg.ui.widgets.quota_bar import QuotaBar

    bar = QuotaBar(ui_ctx.ledger)
    assert "10,000" in bar.label.text()

    ui_ctx.ledger.record("subscriptions.delete", 100)   # 5,000유닛
    bar.refresh()
    assert "5,000" in bar.label.text()

    ui_ctx.ledger.mark_exhausted()
    bar.refresh()
    assert "소진" in bar.label.text()


def test_plan_dialog_refuses_empty_plan(qapp, ui_ctx):
    """빈 계획으로 확인 창을 띄우면 안 된다 — 누를 게 없는 창이 된다."""
    from ytorg.jobs.queue import JobPlan
    from ytorg.ui.dialogs import PlanDialog

    empty = JobPlan(kind="test", title="빈 계획")
    assert PlanDialog.confirm(empty, ui_ctx.ledger) is False


def test_plan_dialog_lists_every_row(qapp, ui_ctx):
    from ytorg.jobs.queue import JobPlan
    from ytorg.ui.dialogs import PlanDialog

    plan = JobPlan(kind="test", title="확인")
    for i in range(3):
        plan.add("unsubscribe", {"subscription_id": f"s{i}", "channel_id": f"c{i}"})
        plan.rows.append((f"채널{i}", "구독 취소", "테스트"))

    dialog = PlanDialog(plan, ui_ctx.ledger)

    from PySide6.QtWidgets import QLabel, QTableWidget

    tables = dialog.findChildren(QTableWidget)
    assert tables and tables[0].rowCount() == 3

    # 비용이 어딘가에는 분명히 적혀 있어야 한다 — 이게 승인의 근거다
    texts = " ".join(label.text() for label in dialog.findChildren(QLabel))
    assert "150유닛" in texts
