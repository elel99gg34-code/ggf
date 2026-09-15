"""작업 큐·재개·되돌리기.

여기서 지켜야 할 핵심 성질 세 가지:
  1. 할당량 소진은 실패가 아니라 일시정지다 (남은 작업이 보존된다).
  2. 앱이 죽었다 살아나도 이미 한 일을 다시 하지 않는다.
  3. 되돌리기는 실행의 정확한 역순으로, 원래 상태로 되돌린다.
"""

from __future__ import annotations

import pytest

from ytorg.jobs import queue as q
from ytorg.jobs.executor import JobExecutor, UndoManager
from ytorg.jobs.ops import ref
from ytorg.jobs.queue import JobPlan, JobQueue


@pytest.fixture
def jobq(db):
    return JobQueue(db)


@pytest.fixture
def executor(api, db, ledger, jobq):
    return JobExecutor(api, db, ledger, jobq)


def _unsub_plan(fake, limit=3):
    plan = JobPlan(kind="unsubscribe", title="휴면 채널 정리")
    for sub_id, data in list(fake.sub_rows.items())[:limit]:
        plan.add("unsubscribe", {
            "subscription_id": sub_id,
            "channel_id": data["channel_id"],
            "channel_title": data["title"],
        })
    return plan


def test_plan_costs_are_computed_before_any_api_call(account, ledger, fake):
    """미리보기는 0유닛이어야 한다 — 계획만 세우고 API는 안 부른다."""
    plan = _unsub_plan(fake)

    assert plan.total_cost == 150  # 구독 취소 3개 × 50
    assert ledger.spent() == 0
    assert fake.calls == []

    budget = plan.budget(ledger)
    assert budget.fits_today
    assert "3개" in plan.describe()


def test_job_runs_and_applies_changes(account, fake, jobq, executor, syncer):
    syncer.sync_subscriptions()
    plan = _unsub_plan(fake, limit=2)
    job_id = jobq.enqueue(plan)

    report = executor.run(job_id)

    assert report.status == q.DONE
    assert report.completed == 2
    assert report.units_spent == 100
    assert len(fake.sub_rows) == 1  # 3개 중 2개 취소됨


def test_quota_exhaustion_pauses_instead_of_failing(account, fake, jobq, executor, ledger,
                                                    syncer, drain_budget):
    """이 앱의 핵심 계약: 할당량이 떨어져도 작업은 실패하지 않는다."""
    syncer.sync_subscriptions()
    plan = _unsub_plan(fake, limit=3)
    job_id = jobq.enqueue(plan)

    # 구독 취소 2건치만 남긴다
    assert drain_budget(100) == 100

    report = executor.run(job_id)

    assert report.status == q.PAUSED, "실패가 아니라 정지여야 한다"
    assert report.completed == 2
    assert report.remaining == 1
    assert jobq.job(job_id)["status"] == q.PAUSED

    # 다음 날. 할당량이 리셋되면 남은 1건을 이어서 한다.
    ledger.db.execute("DELETE FROM quota_ledger")
    report2 = executor.run(job_id)

    assert report2.status == q.DONE
    assert report2.completed == 1
    assert len(fake.sub_rows) == 0


def test_completed_ops_are_not_repeated_after_restart(account, fake, jobq, db, ledger,
                                                      api, syncer):
    """앱이 죽었다 살아나는 상황. 이미 취소한 구독을 또 취소하면 안 된다."""
    syncer.sync_subscriptions()
    job_id = jobq.enqueue(_unsub_plan(fake, limit=3))

    first = JobExecutor(api, db, ledger, jobq)
    first.run(job_id, max_ops=1)
    assert fake.call_count("subscriptions.delete") == 1

    # 새 실행기 = 앱 재시작
    second = JobExecutor(api, db, ledger, JobQueue(db))
    report = second.run(job_id)

    assert report.completed == 2  # 남은 2개만
    assert fake.call_count("subscriptions.delete") == 3  # 총 3번, 재실행 없음


def test_server_reported_quota_pauses_mid_job(account, fake, jobq, executor, ledger,
                                              syncer):
    """로컬 추정은 여유롭지만 서버가 거부하는 경우(프로젝트 공유)."""
    syncer.sync_subscriptions()
    job_id = jobq.enqueue(_unsub_plan(fake, limit=3))
    fake.fail_always["subscriptions.delete"] = (403, "quotaExceeded")

    report = executor.run(job_id)

    assert report.status == q.PAUSED
    assert report.completed == 0
    assert report.remaining == 3
    assert ledger.is_exhausted()
    assert len(fake.sub_rows) == 3  # 아무것도 안 지워짐


def test_undo_restores_subscriptions(account, fake, jobq, executor, api, db, ledger,
                                     syncer):
    syncer.sync_subscriptions()
    job_id = jobq.enqueue(_unsub_plan(fake, limit=2))
    executor.run(job_id)
    assert len(fake.sub_rows) == 1

    undo = UndoManager(api, db, ledger, jobq)
    count, cost = undo.estimate(job_id)
    assert (count, cost) == (2, 100)  # 되돌리기도 50유닛씩 든다

    report = undo.undo_job(job_id)

    assert report.status == q.DONE
    assert len(fake.sub_rows) == 3  # 다시 구독됨
    assert undo.estimate(job_id)[0] == 0  # 저널 소진


def test_ref_lets_later_ops_use_a_playlist_created_earlier(account, fake, jobq,
                                                           executor):
    """재생목록을 만들고 그 안에 영상을 넣는 작업.

    새 재생목록 ID는 실행 전에는 존재하지 않으므로 참조로 적어둔다.
    """
    plan = JobPlan(kind="classify", title="주제별 분류")
    plan.add("create_playlist", {"title": "요리 모음", "ref_name": "cook"})
    plan.add("add_item", {"playlist_id": ref("cook"), "video_id": "v1"})
    plan.add("add_item", {"playlist_id": ref("cook"), "video_id": "v2"})
    job_id = jobq.enqueue(plan)

    report = executor.run(job_id)

    assert report.status == q.DONE
    created = [pid for pid, p in fake.playlist_rows.items() if p["title"] == "요리 모음"]
    assert len(created) == 1
    assert fake.playlist_video_ids(created[0]) == ["v1", "v2"]


def test_ref_survives_a_pause_between_days(account, fake, jobq, executor, ledger,
                                          drain_budget):
    """재생목록은 오늘 만들고 영상은 내일 넣는 경우에도 참조가 유지돼야 한다."""
    plan = JobPlan(kind="classify", title="주제별 분류")
    plan.add("create_playlist", {"title": "코딩 모음", "ref_name": "code"})
    plan.add("add_item", {"playlist_id": ref("code"), "video_id": "v3"})
    job_id = jobq.enqueue(plan)

    drain_budget(50)  # 딱 1건치
    report = executor.run(job_id)
    assert report.status == q.PAUSED
    assert report.completed == 1

    # 다음 날, 새 실행기로 이어서
    ledger.db.execute("DELETE FROM quota_ledger")
    fresh = JobExecutor(executor.api, executor.db, ledger, JobQueue(executor.db))
    report2 = fresh.run(job_id)

    assert report2.status == q.DONE
    created = [pid for pid, p in fake.playlist_rows.items() if p["title"] == "코딩 모음"][0]
    assert fake.playlist_video_ids(created) == ["v3"]


def test_undo_of_playlist_build_removes_items_then_playlist(account, fake, jobq,
                                                            executor, api, db, ledger):
    """되돌리기는 역순이어야 한다 — 영상을 먼저 빼고 재생목록을 지운다."""
    plan = JobPlan(kind="classify", title="분류")
    plan.add("create_playlist", {"title": "임시", "ref_name": "tmp"})
    plan.add("add_item", {"playlist_id": ref("tmp"), "video_id": "v1"})
    job_id = jobq.enqueue(plan)
    executor.run(job_id)

    assert any(p["title"] == "임시" for p in fake.playlist_rows.values())

    UndoManager(api, db, ledger, jobq).undo_job(job_id)

    assert not any(p["title"] == "임시" for p in fake.playlist_rows.values())


def test_one_failing_op_does_not_kill_the_job(account, fake, jobq, executor, syncer):
    """한 채널이 이미 사라졌어도 나머지는 계속 처리돼야 한다."""
    syncer.sync_subscriptions()
    plan = JobPlan(kind="unsubscribe", title="정리")
    plan.add("unsubscribe", {"subscription_id": "없는ID", "channel_id": "UCX",
                             "channel_title": "유령"})
    for sub_id, data in list(fake.sub_rows.items())[:2]:
        plan.add("unsubscribe", {"subscription_id": sub_id,
                                 "channel_id": data["channel_id"],
                                 "channel_title": data["title"]})
    job_id = jobq.enqueue(plan)

    report = executor.run(job_id)

    # 404는 tolerate_missing으로 흡수된다 — 이미 없는 건 목적 달성이다
    assert report.completed == 3
    assert report.status == q.DONE
    assert len(fake.sub_rows) == 1


def test_cancel_stops_remaining_ops(account, fake, jobq, executor, syncer):
    syncer.sync_subscriptions()
    job_id = jobq.enqueue(_unsub_plan(fake, limit=3))
    executor.run(job_id, max_ops=1)

    removed = jobq.cancel(job_id)

    assert removed == 2
    assert jobq.job(job_id)["status"] == q.CANCELLED
    assert len(fake.sub_rows) == 2
