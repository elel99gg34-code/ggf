"""공용 픽스처. 테스트는 모두 임시 DB와 가짜 유튜브 위에서 돈다."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.fakes import FakeYouTube  # noqa: E402
from ytorg.core.api import YouTubeAPI  # noqa: E402
from ytorg.core.cache import Database  # noqa: E402
from ytorg.core.quota import QuotaLedger  # noqa: E402
from ytorg.core.sync import Syncer  # noqa: E402


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setenv("YTORG_DATA_DIR", str(tmp_path))
    database = Database(tmp_path / "test.db")
    yield database
    database.close()


@pytest.fixture
def ledger(db):
    return QuotaLedger(db)


@pytest.fixture
def fake():
    return FakeYouTube()


@pytest.fixture
def api(fake, ledger):
    # rate_limit 0 = 테스트에서 sleep 없음
    return YouTubeAPI(fake, ledger, rate_limit_per_sec=0)


@pytest.fixture
def syncer(api, db, ledger):
    return Syncer(api, db, ledger)


@pytest.fixture
def account(fake):
    """구독 3개, 재생목록 2개, 좋아요 4개가 있는 평범한 계정."""
    fake.add_channel("UC1", "요리 채널", uploads=["v1", "v2"])
    fake.add_channel("UC2", "코딩 채널", uploads=["v3"])
    fake.add_channel("UC3", "휴면 채널", uploads=["v4"])

    fake.add_video("v1", "김치찌개 끓이기", "UC1", "PT12M", "2026-08-01T00:00:00Z",
                   tags=["요리", "한식"])
    fake.add_video("v2", "된장찌개 레시피", "UC1", "PT8M", "2026-09-01T00:00:00Z",
                   tags=["요리"])
    fake.add_video("v3", "파이썬 입문 강의", "UC2", "PT45M", "2026-07-15T00:00:00Z",
                   tags=["프로그래밍", "python"])
    fake.add_video("v4", "옛날 브이로그", "UC3", "PT5M", "2019-01-01T00:00:00Z")
    fake.add_video("v5", "쇼츠 영상", "UC1", "PT45S", "2026-09-05T00:00:00Z")

    fake.add_playlist("PL_A", "나중에 볼 것", ["v1", "v3"])
    fake.add_playlist("PL_B", "빈 목록", [])
    fake.like("v2", "v3", "v4", "v5")
    return fake


@pytest.fixture
def drain_budget(ledger):
    """쓸 수 있는 예산을 정확히 N유닛만 남기고 태운다.

    테스트가 "앞에서 동기화로 몇 유닛 썼더라"를 직접 세지 않아도 되게 한다.
    1유닛짜리 메서드로 태우므로 단위 오차 없이 정확히 맞는다.
    """

    def _drain(target_spendable: int) -> int:
        excess = ledger.spendable() - target_spendable
        if excess > 0:
            ledger.record("videos.list", excess)
        return ledger.spendable()

    return _drain
