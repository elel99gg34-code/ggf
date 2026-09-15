"""4대 기능의 계획 생성과 실제 실행 결과.

가짜 유튜브를 상대로 계획을 세우고, 실행하고, 계정 상태가 의도대로
바뀌었는지까지 확인한다.
"""

from __future__ import annotations

import pytest

from ytorg.features import organize, playlists as pl_feat, subscriptions as subs_feat
from ytorg.jobs import queue as q
from ytorg.jobs.executor import JobExecutor, UndoManager
from ytorg.jobs.queue import JobQueue
from ytorg.rules.engine import Rule, RuleEngine


@pytest.fixture
def jobq(db):
    return JobQueue(db)


@pytest.fixture
def executor(api, db, ledger, jobq):
    return JobExecutor(api, db, ledger, jobq)


# ---- 구독 정리 -----------------------------------------------------------

def test_dormant_channel_is_detected(syncer, db, account, fake):
    """3년 전에 마지막 영상을 올린 채널을 찾아낸다."""
    fake.video_rows["v4"]["published"] = "2019-01-01T00:00:00Z"
    syncer.full_sync()

    candidates = subs_feat.find_candidates(db, dormant_months=12)
    titles = {c.channel.title for c in candidates}

    assert "휴면 채널" in titles
    dormant = [c for c in candidates if c.channel.title == "휴면 채널"][0]
    assert subs_feat.DORMANT in dormant.reasons
    assert "개월 전" in dormant.detail


def test_active_channel_is_not_flagged(syncer, db, account):
    syncer.full_sync()
    candidates = subs_feat.find_candidates(db, dormant_months=12)

    flagged = {c.channel.title for c in candidates}
    assert "요리 채널" not in flagged      # 2주 전 업로드
    assert "코딩 채널" not in flagged      # 2개월 전 업로드
    assert "휴면 채널" in flagged          # 7년 전


def test_unsubscribe_plan_runs_end_to_end(syncer, db, account, fake, jobq, executor):
    syncer.full_sync()
    candidates = [c for c in subs_feat.find_candidates(db, dormant_months=12)
                  if c.channel.status == "active"]
    plan = subs_feat.plan_unsubscribe(candidates)

    assert plan.total_cost == len(plan.ops) * 50
    before = len(fake.sub_rows)

    report = executor.run(jobq.enqueue(plan))

    assert report.status == q.DONE
    assert len(fake.sub_rows) == before - len(plan.ops)


def test_already_gone_channel_is_skipped_not_called(syncer, db, account, fake):
    """이미 구독이 끊긴 채널에 API를 부르면 유닛만 버린다."""
    syncer.sync_subscriptions()
    target = [sid for sid, s in fake.sub_rows.items() if s["channel_id"] == "UC2"][0]
    del fake.sub_rows[target]
    syncer.sync_subscriptions()  # 'gone'으로 표시됨

    gone = [c for c in subs_feat.find_candidates(db) if c.channel.status == "gone"]
    plan = subs_feat.plan_unsubscribe(gone)

    assert plan.ops == []                      # 호출 없음 = 0유닛
    assert plan.rows[0][1] == "건너뜀"


# ---- 재생목록 청소 -------------------------------------------------------

def test_dead_and_duplicate_items_are_found(syncer, db, account, fake):
    fake.add_playlist("PL_C", "지저분한 목록", ["v1", "v2", "v1"])  # v1 중복
    syncer.full_sync()
    del fake.video_rows["v2"]                   # v2가 삭제됨
    syncer.hydrate_videos(["v2"], force=True)
    syncer.sync_playlist_items("PL_C")

    findings = pl_feat.inspect(db, "PL_C")

    assert len(findings.duplicates) == 1
    assert len(findings.dead) == 1
    assert findings.dead[0].video_id == "v2"
    assert "중복" in findings.describe()


def test_cleanup_removes_only_flagged_items(syncer, db, account, fake, jobq, executor):
    fake.add_playlist("PL_C", "지저분한 목록", ["v1", "v3", "v1"])
    syncer.full_sync()

    findings = pl_feat.inspect(db, "PL_C")
    plan = pl_feat.plan_cleanup(db, "PL_C", findings)
    executor.run(jobq.enqueue(plan))

    remaining = fake.playlist_video_ids("PL_C")
    assert sorted(remaining) == ["v1", "v3"]    # 중복 하나만 빠짐


# ---- 정렬 ---------------------------------------------------------------

def test_sort_produces_correct_order_with_minimal_moves(syncer, db, account, fake,
                                                        jobq, executor):
    """최소 이동으로도 결과 순서는 정확해야 한다."""
    fake.add_playlist("PL_S", "정렬 대상", ["v3", "v1", "v2"])
    syncer.full_sync()

    plan = pl_feat.plan_sort(db, "PL_S", key="title")
    executor.run(jobq.enqueue(plan))

    titles = [fake.video_rows[vid]["title"] for vid in fake.playlist_video_ids("PL_S")]
    assert titles == sorted(titles)


def test_already_sorted_playlist_costs_nothing(syncer, db, account, fake):
    ordered = sorted(["v1", "v2", "v3"], key=lambda x: fake.video_rows[x]["title"])
    fake.add_playlist("PL_S", "이미 정렬됨", ordered)
    syncer.full_sync()

    plan = pl_feat.plan_sort(db, "PL_S", key="title")

    assert plan.ops == []
    assert plan.total_cost == 0


def test_sort_warning_states_the_savings(syncer, db, account, fake):
    fake.add_playlist("PL_S", "역순", ["v3", "v2", "v1"])
    syncer.full_sync()

    plan = pl_feat.plan_sort(db, "PL_S", key="title")

    assert plan.ops, "역순이면 옮길 게 있어야 한다"
    assert any("유닛" in w for w in plan.warnings)


# ---- 병합 ---------------------------------------------------------------

def test_merge_skips_videos_already_in_target(syncer, db, account, fake, jobq, executor):
    fake.add_playlist("PL_X", "소스", ["v1", "v2"])
    fake.add_playlist("PL_Y", "대상", ["v1"])       # v1은 이미 있음
    syncer.full_sync()

    plan = pl_feat.plan_merge(db, ["PL_X"], "PL_Y")

    assert len(plan.ops) == 1                      # v2만 추가
    executor.run(jobq.enqueue(plan))
    assert sorted(fake.playlist_video_ids("PL_Y")) == ["v1", "v2"]


# ---- 자동 분류 -----------------------------------------------------------

def _simple_engine():
    return RuleEngine([
        Rule(playlist="요리", keywords=["김치", "된장"]),
        Rule(playlist="코딩", keywords=["파이썬"]),
    ])


def test_organize_creates_playlists_and_fills_them(syncer, db, account, fake,
                                                   jobq, executor):
    syncer.full_sync()
    videos = organize.liked_videos(db) + organize.videos_from_playlist(db, "PL_A")
    result = _simple_engine().classify(videos)

    plan = organize.plan_organize(db, result)
    report = executor.run(jobq.enqueue(plan))

    assert report.status == q.DONE
    made = {p["title"]: pid for pid, p in fake.playlist_rows.items()}
    assert "코딩" in made
    assert "v3" in fake.playlist_video_ids(made["코딩"])


def test_organize_is_idempotent(syncer, db, account, fake, jobq, executor):
    """두 번 돌려도 중복이 생기면 안 된다 — 50유닛짜리 실수가 쌓인다."""
    syncer.full_sync()
    videos = organize.videos_from_playlist(db, "PL_A")
    result = _simple_engine().classify(videos)

    executor.run(jobq.enqueue(organize.plan_organize(db, result)))
    syncer.sync_playlists()
    syncer.sync_all_playlist_items()

    # 같은 분류를 한 번 더
    second = organize.plan_organize(db, result)

    assert second.ops == [], "두 번째 실행에는 할 일이 없어야 한다"
    assert any("이미 들어 있는" in w for w in second.warnings)


def test_organize_reuses_existing_playlist_by_name(syncer, db, account, fake, jobq,
                                                   executor):
    fake.add_playlist("PL_EXIST", "코딩", [])
    syncer.full_sync()
    videos = organize.videos_from_playlist(db, "PL_A")
    result = _simple_engine().classify(videos)

    plan = organize.plan_organize(db, result)

    # '코딩'이라는 이름이 이미 있으므로 새로 만들지 않는다
    creates = [op for op in plan.ops if op.op_type == "create_playlist"]
    assert all(op.params["title"] != "코딩" for op in creates)

    executor.run(jobq.enqueue(plan))
    assert "v3" in fake.playlist_video_ids("PL_EXIST")


def test_organize_undo_removes_everything_it_made(syncer, db, account, fake, jobq,
                                                  executor, api, ledger):
    syncer.full_sync()
    videos = organize.videos_from_playlist(db, "PL_A")
    result = _simple_engine().classify(videos)
    job_id = jobq.enqueue(organize.plan_organize(db, result))
    executor.run(job_id)

    before = set(fake.playlist_rows)
    UndoManager(api, db, ledger, jobq).undo_job(job_id)

    # 만들었던 재생목록이 전부 사라져야 한다
    assert set(fake.playlist_rows) < before


def test_uncategorized_finds_liked_videos_not_in_any_playlist(syncer, db, account):
    syncer.full_sync()

    stray = {v.video_id for v in organize.uncategorized_videos(db)}

    # 좋아요: v2,v3,v4,v5 / PL_A에 든 것: v1,v3  →  v3만 빠진다
    assert stray == {"v2", "v4", "v5"}


def test_big_organize_is_split_across_days(syncer, db, account, ledger, drain_budget):
    """500개 분류가 하루에 안 끝난다는 걸 계획 단계에서 알려준다."""
    from ytorg.rules.engine import Assignment, ClassificationResult

    result = ClassificationResult(source="rules")
    result.assignments = [Assignment(f"v{i}", "큰 목록", "테스트") for i in range(500)]

    plan = organize.plan_organize(db, result)
    budget = plan.budget(ledger)

    assert plan.total_cost == 501 * 50          # 재생목록 1 + 영상 500
    assert not budget.fits_today
    assert budget.days_needed >= 3
    assert "이어서" in budget.describe()
