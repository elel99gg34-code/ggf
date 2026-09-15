"""동기화가 캐시를 정확히 채우는지, 그리고 그 비용이 예상대로인지."""

from __future__ import annotations

from ytorg.core.quota import QuotaExceeded


def test_full_sync_populates_cache(syncer, db, account):
    result = syncer.full_sync()

    assert result.subscriptions == 3
    channels = db.channels()
    assert {c.title for c in channels} == {"요리 채널", "코딩 채널", "휴면 채널"}

    # 업로드 재생목록 ID가 채워져야 휴면 판정을 할 수 있다
    assert all(c.uploads_playlist_id for c in channels)

    # 좋아요 목록은 my_playlists에 안 나오므로 따로 끌어와야 한다
    kinds = {p.kind for p in db.playlists()}
    assert "likes" in kinds
    likes = [p for p in db.playlists() if p.kind == "likes"][0]
    assert {i.video_id for i in db.playlist_items(likes.playlist_id)} == {"v2", "v3", "v4", "v5"}

    assert {i.video_id for i in db.playlist_items("PL_A")} == {"v1", "v3"}
    assert db.videos_by_ids(["v1"])["v1"].title == "김치찌개 끓이기"


def test_sync_cost_matches_estimate(syncer, ledger, account):
    """읽기는 싸다 — 이 계정 전체를 받는 데 드는 유닛을 고정해 둔다.

    이 값이 갑자기 뛰면 어딘가에서 비싼 호출(search.list 등)이 섞인 것이다.
    """
    syncer.full_sync()
    spent = ledger.spent()

    # 구독1 + 채널상세1 + 재생목록1 + 내채널1 + 항목(PL_A,PL_B,좋아요)3
    # + 영상메타1 + 업로드스캔3 = 11
    assert spent == 11, ledger.usage_by_method()

    methods = dict((m, total) for m, _, total in ledger.usage_by_method())
    assert "search.list" not in methods, "search.list는 100유닛이라 쓰면 안 된다"


def test_channel_rename_is_detected(syncer, db, account, fake):
    syncer.sync_subscriptions()

    # 채널이 이름을 바꿨다. API는 이 사실을 알려주지 않으므로 캐시 대조로만 안다.
    for sub in fake.sub_rows.values():
        if sub["channel_id"] == "UC1":
            sub["title"] = "요리 채널 (리브랜딩)"
    fake.channel_rows["UC1"]["title"] = "요리 채널 (리브랜딩)"

    _, renamed, _ = syncer.sync_subscriptions()
    assert renamed == 1

    channel = [c for c in db.channels() if c.channel_id == "UC1"][0]
    assert channel.title == "요리 채널 (리브랜딩)"
    assert channel.previous_title == "요리 채널"


def test_unsubscribed_channel_marked_gone(syncer, db, account, fake):
    syncer.sync_subscriptions()
    assert len(db.channels("active")) == 3

    # 웹에서 직접 구독을 끊었다
    target = [sid for sid, s in fake.sub_rows.items() if s["channel_id"] == "UC2"][0]
    del fake.sub_rows[target]

    _, _, gone = syncer.sync_subscriptions()
    assert gone == 1
    assert len(db.channels("active")) == 2
    assert len(db.channels("gone")) == 1


def test_deleted_video_is_marked(syncer, db, account, fake):
    """재생목록에 남아 있지만 영상이 사라진 경우."""
    syncer.full_sync()

    # v1이 유튜브에서 삭제됐다. 재생목록 항목은 남아 있다.
    del fake.video_rows["v1"]
    syncer.hydrate_videos(["v1"], force=True)

    assert db.videos_by_ids(["v1"])["v1"].availability == "deleted"

    syncer.sync_playlist_items("PL_A")
    dead = [i for i in db.playlist_items("PL_A") if i.is_dead]
    assert len(dead) == 1
    assert dead[0].video_id == "v1"


def test_sync_survives_quota_exhaustion(syncer, db, ledger, account):
    """할당량이 중간에 떨어져도 그때까지 받은 건 남아야 한다."""
    ledger.record("playlistItems.insert", 199)  # 9,950유닛 소모 → 예비분 아래로
    assert ledger.spendable() == 0

    result = syncer.full_sync()

    # 읽기는 예비분을 쓸 수 있으므로 여기서는 끝까지 간다
    assert result.subscriptions == 3
    assert not result.stopped_early


def test_read_stops_when_server_reports_exhaustion(syncer, db, ledger, account, fake):
    """서버가 quotaExceeded를 주면 로컬 추정과 무관하게 즉시 멈춘다.

    프로젝트를 여러 명이 공유하면 실제로 이 경로를 탄다.
    """
    fake.fail_always["playlists.list"] = (403, "quotaExceeded")

    result = syncer.full_sync()

    assert result.stopped_early
    assert ledger.is_exhausted()
    assert ledger.remaining() == 0
    # 그 전 단계(구독)는 정상적으로 캐시에 들어갔다
    assert result.subscriptions == 3


def test_transient_error_is_retried(api, fake, account, monkeypatch):
    monkeypatch.setattr(api, "_sleep", lambda _: None)
    fake.fail_once["subscriptions.list"] = (503, "backendError")

    subs = list(api.my_subscriptions())

    assert len(subs) == 3
    assert fake.call_count("subscriptions.list") == 2  # 실패 1 + 성공 1
