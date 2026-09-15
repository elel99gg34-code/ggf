"""CLI의 안전 계약.

가장 중요한 것: --apply 없이는 계정이 절대 바뀌지 않는다.
"""

from __future__ import annotations

import pytest

from ytorg import cli
from ytorg.app import AppContext
from ytorg.core.api import YouTubeAPI


@pytest.fixture
def ctx(db, ledger, monkeypatch, tmp_path):
    monkeypatch.setenv("YTORG_DATA_DIR", str(tmp_path))
    context = AppContext.create()
    context.db = db
    context.ledger = ledger
    from ytorg.jobs.queue import JobQueue
    context.queue = JobQueue(db)
    return context


@pytest.fixture
def wired(ctx, fake, account):
    ctx.attach(YouTubeAPI(fake, ctx.ledger, rate_limit_per_sec=0))
    ctx.syncer.full_sync()
    return ctx


def test_demo_runs_without_touching_real_api(ctx, capsys):
    exit_code = cli.cmd_demo(ctx, None)
    output = capsys.readouterr().out

    assert exit_code == 0
    assert "중복 없음" in output          # 멱등성 확인 통과
    assert "전부 되돌려짐" in output       # 되돌리기 확인 통과


def test_dry_run_changes_nothing(wired, fake, capsys):
    args = type("A", (), {"months": 12, "limit": None, "apply": False})()
    before_subs = dict(fake.sub_rows)
    before_calls = fake.call_count("subscriptions.delete")

    cli.cmd_subs(wired, args)

    assert fake.sub_rows == before_subs
    assert fake.call_count("subscriptions.delete") == before_calls
    assert "미리보기" in capsys.readouterr().out


def test_apply_actually_writes(wired, fake):
    args = type("A", (), {"months": 12, "limit": None, "apply": True})()
    before = len(fake.sub_rows)

    cli.cmd_subs(wired, args)

    assert len(fake.sub_rows) < before


def test_status_reports_quota_without_api_calls(wired, fake, capsys):
    calls_before = len(fake.calls)

    cli.cmd_status(wired, None)
    output = capsys.readouterr().out

    assert len(fake.calls) == calls_before   # 캐시만 읽는다
    assert "남은 유닛" in output


def test_organize_dry_run_shows_cost_and_days(wired, capsys):
    # 테스트 계정은 영상이 몇 개 안 되므로 최소 그룹 크기를 낮춘다
    wired.settings.min_group_size = 1
    args = type("A", (), {"source": "likes", "apply": False})()

    cli.cmd_organize(wired, args)
    output = capsys.readouterr().out

    assert "유닛" in output
    assert "미리보기" in output


def test_small_groups_are_not_turned_into_playlists(wired, capsys):
    """영상 1~2개짜리 재생목록을 만들면 정리가 아니라 어지럽히는 것이다."""
    wired.settings.min_group_size = 3
    args = type("A", (), {"source": "likes", "apply": False})()

    cli.cmd_organize(wired, args)
    output = capsys.readouterr().out

    assert "할 게 없어" in output
    assert "3개 미만" in output


def test_parser_requires_apply_flag_to_be_explicit():
    args = cli.build_parser().parse_args(["subs"])
    assert args.apply is False

    args = cli.build_parser().parse_args(["subs", "--apply"])
    assert args.apply is True


def test_preview_commands_do_not_require_login():
    """로그인 없이도 캐시 기반 미리보기는 볼 수 있어야 한다."""
    assert "status" not in cli.NEEDS_AUTH
    assert "playlists" not in cli.NEEDS_AUTH
    assert "rules" not in cli.NEEDS_AUTH
