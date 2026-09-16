"""GUI 없이 쓰는 명령줄 인터페이스.

두 가지 목적이 있다.
  1. 개발·검증: GUI를 띄울 수 없는 환경에서 전체 파이프라인을 돌려본다.
  2. 안전장치: 쓰기는 기본이 미리보기(dry-run)다. --apply를 붙여야 실제로 바뀐다.

`demo` 명령은 가짜 유튜브 계정을 상대로 전부 돌려보므로, 실제 계정이나
할당량 없이도 동작을 확인할 수 있다.
"""

from __future__ import annotations

import argparse
import sys

from .app import AppContext, setup_logging
from .features import organize, playlists as pl_feat, subscriptions as subs_feat
from .jobs import queue as q


# ---- 출력 헬퍼 -----------------------------------------------------------

def _table(rows: list[tuple], headers: tuple, limit: int = 30) -> str:
    if not rows:
        return "  (없음)"
    shown = rows[:limit]
    widths = [len(h) for h in headers]
    for row in shown:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(str(cell)))
    widths = [min(w, 46) for w in widths]

    def fmt(cells):
        out = []
        for i, cell in enumerate(cells):
            text = str(cell)
            if len(text) > widths[i]:
                text = text[:widths[i] - 1] + "…"
            out.append(text.ljust(widths[i]))
        return "  " + " | ".join(out)

    lines = [fmt(headers), "  " + "-+-".join("-" * w for w in widths)]
    lines += [fmt(r) for r in shown]
    if len(rows) > limit:
        lines.append(f"  ... 외 {len(rows) - limit}건")
    return "\n".join(lines)


def _show_plan(ctx: AppContext, plan) -> None:
    print(f"\n[계획] {plan.title}")
    if plan.is_empty:
        print("  할 게 없어.")
        for warning in plan.warnings:
            print(f"  · {warning}")
        return

    print(_table(plan.rows, ("대상", "동작", "사유")))
    print(f"\n  {plan.describe()}")
    print(f"  {plan.budget(ctx.ledger).describe()}")
    for warning in plan.warnings:
        print(f"  ! {warning}")


def _run_plan(ctx: AppContext, plan, apply: bool) -> int:
    _show_plan(ctx, plan)
    if plan.is_empty:
        return 0
    if not apply:
        print("\n  (미리보기야. 실제로 바꾸려면 --apply 를 붙여줘)")
        return 0
    if ctx.executor is None:
        print("\n  로그인이 안 돼 있어. 먼저 `login` 해줘.", file=sys.stderr)
        return 1

    job_id = ctx.queue.enqueue(plan)
    print(f"\n  작업 #{job_id} 실행 중...")

    def progress(done, total, message):
        print(f"\r  {done}/{total} {message[:40]:<40}", end="", flush=True)

    report = ctx.executor.run(job_id, progress)
    print(f"\n  {report.summary()}")
    for error in report.errors[:5]:
        print(f"  ! {error}")
    return 0


# ---- 명령 ---------------------------------------------------------------

def cmd_login(ctx: AppContext, args) -> int:
    if ctx.connect(interactive=True):
        me = ctx.db.get_meta("my_channel_title", "")
        print(f"로그인 완료{f' — {me}' if me else ''}")
        return 0
    print("로그인 실패", file=sys.stderr)
    return 1


def cmd_logout(ctx: AppContext, args) -> int:
    ctx.disconnect()
    print("로그아웃했어. 저장된 토큰을 지웠어.")
    return 0


def cmd_status(ctx: AppContext, args) -> int:
    print(ctx.quota_line())
    print(f"마지막 동기화: {ctx.db.get_meta('last_sync_at', '아직 없음')}")
    print(f"구독 {len(ctx.db.channels())}개 · "
          f"재생목록 {len(ctx.db.playlists())}개 · "
          f"캐시된 영상 {len(ctx.db.known_video_ids())}개")

    from .ai.classifier import diagnose

    print(f"AI 분류: {diagnose()}")

    usage = ctx.ledger.usage_by_method()
    if usage:
        print("\n오늘 유닛 사용처:")
        print(_table([(m, n, f"{c:,}") for m, n, c in usage], ("메서드", "횟수", "유닛")))

    jobs = ctx.queue.jobs(limit=5)
    if jobs:
        print("\n최근 작업:")
        print(_table(
            [(j["job_id"], j["title"], j["status"], f"{j['done_ops']}/{j['total_ops']}")
             for j in jobs],
            ("#", "제목", "상태", "진행"),
        ))
    return 0


def cmd_sync(ctx: AppContext, args) -> int:
    if ctx.syncer is None:
        print("로그인이 필요해.", file=sys.stderr)
        return 1

    def progress(stage, done, total):
        suffix = f" {done}/{total}" if total else f" {done}"
        print(f"\r  {stage}{suffix:<20}", end="", flush=True)

    result = ctx.syncer.full_sync(
        progress, scan_uploads=ctx.settings.scan_uploads_on_sync
    )
    print(f"\n{result.summary()}")
    for note in result.notes:
        print(f"  ! {note}")
    return 0


def cmd_subs(ctx: AppContext, args) -> int:
    candidates = subs_feat.find_candidates(
        ctx.db, args.months, ctx.settings.include_unused_channels
    )
    print(f"정리 후보 {len(candidates)}개 (기준: {args.months}개월 이상 무업로드)")
    print(_table(
        [(c.channel.title, subs_feat.REASON_LABELS.get(c.primary, c.primary), c.detail)
         for c in candidates],
        ("채널", "사유", "상세"),
    ))
    if not candidates:
        return 0

    if args.limit:
        candidates = candidates[:args.limit]
    return _run_plan(ctx, subs_feat.plan_unsubscribe(candidates), args.apply)


def cmd_playlists(ctx: AppContext, args) -> int:
    rows = [(p.playlist_id, p.title, p.item_count, p.kind)
            for p in ctx.db.playlists()]
    print(_table(rows, ("ID", "제목", "항목", "종류"), limit=100))
    return 0


def cmd_clean(ctx: AppContext, args) -> int:
    findings = pl_feat.inspect(ctx.db, args.playlist)
    print(f"검사 결과: {findings.describe()}")
    plan = pl_feat.plan_cleanup(ctx.db, args.playlist, findings)
    return _run_plan(ctx, plan, args.apply)


def cmd_sort(ctx: AppContext, args) -> int:
    plan = pl_feat.plan_sort(ctx.db, args.playlist, args.by, args.reverse)
    return _run_plan(ctx, plan, args.apply)


def cmd_organize(ctx: AppContext, args) -> int:
    if args.source == "likes":
        videos = organize.liked_videos(ctx.db)
        label = "좋아요 목록"
    elif args.source == "uncategorized":
        videos = organize.uncategorized_videos(ctx.db)
        label = "재생목록에 없는 좋아요 영상"
    else:
        videos = organize.videos_from_playlist(ctx.db, args.source)
        label = args.source

    print(f"{label}에서 영상 {len(videos)}개를 분류할게.")
    if not videos:
        print("  분류할 영상이 없어. 먼저 `sync` 해줘.")
        return 0

    classifier = ctx.classifier()
    source_name = getattr(classifier, "settings", None) and "AI" or "규칙"
    print(f"  분류 엔진: {source_name}")

    result = classifier.classify(videos) if source_name == "AI" else \
        classifier.classify(videos, min_group_size=ctx.settings.min_group_size)

    print(f"  {result.summary()}")
    for note in result.notes:
        print(f"  · {note}")

    plan = organize.plan_organize(
        ctx.db, result, ctx.settings.new_playlist_privacy, label
    )
    return _run_plan(ctx, plan, args.apply)


def cmd_jobs(ctx: AppContext, args) -> int:
    if args.resume:
        if ctx.executor is None:
            print("로그인이 필요해.", file=sys.stderr)
            return 1
        reports = ctx.executor.run_all_resumable(
            lambda d, t, m: print(f"\r  {d}/{t} {m[:40]:<40}", end="", flush=True)
        )
        print()
        if not reports:
            print("이어서 할 작업이 없어.")
        for report in reports:
            print(f"  작업 #{report.job_id}: {report.summary()}")
        return 0

    jobs = ctx.queue.jobs(limit=20)
    print(_table(
        [(j["job_id"], j["title"], j["status"],
          f"{j['done_ops']}/{j['total_ops']}", f"{j['spent_cost']:,}")
         for j in jobs],
        ("#", "제목", "상태", "진행", "유닛"),
    ))
    return 0


def cmd_undo(ctx: AppContext, args) -> int:
    if ctx.undo is None:
        print("로그인이 필요해.", file=sys.stderr)
        return 1

    count, cost = ctx.undo.estimate(args.job_id)
    if count == 0:
        print(f"작업 #{args.job_id}에는 되돌릴 게 없어.")
        return 0

    print(f"작업 #{args.job_id}에서 {count}건을 되돌려. "
          f"되돌리기도 API 쓰기라 {cost:,}유닛이 들어.")
    if not args.apply:
        print("  (실제로 되돌리려면 --apply)")
        return 0

    report = ctx.undo.undo_job(
        args.job_id, lambda d, t, m: print(f"\r  {d}/{t} {m[:40]:<40}", end="", flush=True)
    )
    print(f"\n  {report.summary()}")
    return 0


def cmd_rules(ctx: AppContext, args) -> int:
    from .rules.schema import rules_path, write_default_rules_file

    if args.export:
        path = write_default_rules_file()
        print(f"기본 규칙을 내보냈어: {path}")
        print("이 파일을 고치면 다음 실행부터 반영돼.")
        return 0

    engine = ctx.rule_engine()
    print(f"규칙 {len(engine.rules)}개 (파일: {rules_path()})")
    print(_table(
        [(r.priority, r.playlist,
          ", ".join(r.keywords[:4]) or "-",
          f"{r.min_duration or '-'}~{r.max_duration or '-'}초")
         for r in engine.rules],
        ("우선", "재생목록", "키워드", "길이"),
        limit=50,
    ))
    for warning in ctx.rule_warnings:
        print(f"  ! {warning}")
    return 0


def cmd_demo(ctx: AppContext, args) -> int:
    """가짜 계정으로 전체 흐름을 돌려본다. 실제 API를 부르지 않는다."""
    sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent.parent))
    from tests.fakes import FakeYouTube

    from .core.api import YouTubeAPI

    fake = FakeYouTube()
    fake.add_channel("UC1", "요리 채널", uploads=["v1", "v2"])
    fake.add_channel("UC2", "코딩 채널", uploads=["v3"])
    fake.add_channel("UC3", "옛날 채널", uploads=["v9"])
    fake.add_video("v1", "김치찌개 황금레시피", "UC1", "PT12M", "2026-09-01T00:00:00Z")
    fake.add_video("v2", "된장찌개 만들기", "UC1", "PT8M", "2026-08-20T00:00:00Z")
    fake.add_video("v3", "파이썬 입문 강의", "UC2", "PT45M", "2026-07-10T00:00:00Z")
    fake.add_video("v9", "2018년 브이로그", "UC3", "PT5M", "2018-03-01T00:00:00Z")
    fake.add_video("v4", "최신 아이돌 MV", "UC1", "PT3M", "2026-09-10T00:00:00Z")
    fake.video_rows["v4"]["category"] = "10"
    fake.add_video("v5", "30초 쇼츠", "UC1", "PT30S", "2026-09-12T00:00:00Z")
    fake.add_playlist("PL_OLD", "예전에 모은 것", ["v1", "v1", "v3"])
    fake.like("v1", "v2", "v3", "v4", "v5")

    ctx.attach(YouTubeAPI(fake, ctx.ledger, rate_limit_per_sec=0))

    print("=" * 62)
    print("데모: 가짜 유튜브 계정으로 전체 흐름 실행 (실제 API 호출 없음)")
    print("=" * 62)

    print("\n[1] 동기화")
    result = ctx.syncer.full_sync()
    print(f"  {result.summary()}")

    print("\n[2] 구독 정리 후보")
    candidates = subs_feat.find_candidates(ctx.db, dormant_months=12)
    print(_table([(c.channel.title, subs_feat.REASON_LABELS.get(c.primary, ""), c.detail)
                  for c in candidates], ("채널", "사유", "상세")))

    print("\n[3] 재생목록 청소 (중복 탐지)")
    findings = pl_feat.inspect(ctx.db, "PL_OLD")
    print(f"  {findings.describe()}")
    _show_plan(ctx, pl_feat.plan_cleanup(ctx.db, "PL_OLD", findings))

    print("\n[4] 좋아요 영상 자동 분류")
    videos = organize.liked_videos(ctx.db)
    classification = ctx.rule_engine().classify(videos, min_group_size=1)
    print(f"  {classification.summary()}")
    plan = organize.plan_organize(ctx.db, classification, source_label="좋아요 목록")
    _show_plan(ctx, plan)

    print("\n[5] 실제로 실행")
    job_id = ctx.queue.enqueue(plan)
    report = ctx.executor.run(job_id)
    print(f"  {report.summary()}")
    made = [p["title"] for pid, p in fake.playlist_rows.items()
            if not p.get("system") and pid != "PL_OLD"]
    print(f"  만들어진 재생목록: {', '.join(made)}")

    print("\n[6] 같은 분류를 한 번 더 (멱등성 확인)")
    ctx.syncer.sync_playlists()
    ctx.syncer.sync_all_playlist_items()
    again = organize.plan_organize(ctx.db, classification)
    print(f"  두 번째 계획의 작업 수: {len(again.ops)}개 "
          f"{'→ 중복 없음' if not again.ops else '→ 문제!'}")

    print("\n[7] 되돌리기")
    count, cost = ctx.undo.estimate(job_id)
    print(f"  되돌릴 항목 {count}건 ({cost:,}유닛)")
    undo_report = ctx.undo.undo_job(job_id)
    print(f"  {undo_report.summary()}")
    left = [p["title"] for pid, p in fake.playlist_rows.items()
            if not p.get("system") and pid != "PL_OLD"]
    print(f"  남은 재생목록: {left or '없음 (전부 되돌려짐)'}")

    print(f"\n[8] 최종 할당량: {ctx.quota_line()}")
    print("\n데모 끝. 실제 API는 한 번도 부르지 않았어.")
    return 0


# ---- 진입점 -------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ytorg",
        description="유튜브 구독·재생목록 정리 도구 (쓰기는 기본이 미리보기)",
    )
    parser.add_argument("-v", "--verbose", action="store_true", help="자세한 로그")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("login", help="유튜브 계정 연결")
    sub.add_parser("logout", help="저장된 토큰 삭제")
    sub.add_parser("status", help="할당량과 캐시 현황")
    sub.add_parser("sync", help="유튜브에서 최신 상태 받아오기")
    sub.add_parser("playlists", help="재생목록 목록")
    sub.add_parser("demo", help="가짜 계정으로 전체 흐름 시연")

    p_subs = sub.add_parser("subs", help="구독 채널 정리")
    p_subs.add_argument("--months", type=int, default=12, help="이 개월 수 이상 무업로드면 후보")
    p_subs.add_argument("--limit", type=int, help="상위 N개만 처리")
    p_subs.add_argument("--apply", action="store_true", help="실제로 구독 취소")

    p_clean = sub.add_parser("clean", help="재생목록에서 삭제·중복 항목 제거")
    p_clean.add_argument("playlist", help="재생목록 ID")
    p_clean.add_argument("--apply", action="store_true")

    p_sort = sub.add_parser("sort", help="재생목록 정렬")
    p_sort.add_argument("playlist")
    p_sort.add_argument("--by", default="published", choices=list(pl_feat.SORT_KEYS))
    p_sort.add_argument("--reverse", action="store_true")
    p_sort.add_argument("--apply", action="store_true")

    p_org = sub.add_parser("organize", help="영상을 주제별 재생목록으로 분류")
    p_org.add_argument("--source", default="likes",
                       help="likes | uncategorized | 재생목록ID")
    p_org.add_argument("--apply", action="store_true")

    p_jobs = sub.add_parser("jobs", help="작업 목록 / 이어서 실행")
    p_jobs.add_argument("--resume", action="store_true", help="멈춘 작업 이어서 실행")

    p_undo = sub.add_parser("undo", help="작업 되돌리기")
    p_undo.add_argument("job_id", type=int)
    p_undo.add_argument("--apply", action="store_true")

    p_rules = sub.add_parser("rules", help="분류 규칙 보기")
    p_rules.add_argument("--export", action="store_true", help="기본 규칙을 파일로 내보내기")

    return parser


HANDLERS = {
    "login": cmd_login, "logout": cmd_logout, "status": cmd_status,
    "sync": cmd_sync, "subs": cmd_subs, "playlists": cmd_playlists,
    "clean": cmd_clean, "sort": cmd_sort, "organize": cmd_organize,
    "jobs": cmd_jobs, "undo": cmd_undo, "rules": cmd_rules, "demo": cmd_demo,
}

# 로그인이 필요한 명령
NEEDS_AUTH = {"sync", "subs", "clean", "sort", "organize", "undo"}


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    setup_logging(args.verbose)

    ctx = AppContext.create()
    try:
        for warning in ctx.settings.warnings:
            print(f"! {warning}")

        # 쓰기를 실제로 하는 명령만 연결을 시도한다.
        # 미리보기는 캐시만 보면 되므로 로그인 없이도 돌아간다.
        if args.command in NEEDS_AUTH:
            needs_write = getattr(args, "apply", False) or args.command == "sync"
            if not ctx.connect(interactive=needs_write) and needs_write:
                print("로그인이 필요해. `ytorg login` 을 먼저 해줘.", file=sys.stderr)
                return 1

        if ctx.settings.auto_resume_jobs and ctx.executor and args.command == "status":
            pending = ctx.queue.resumable_jobs()
            if pending:
                print(f"! 이어서 할 작업 {len(pending)}개가 있어 (`ytorg jobs --resume`)")

        return HANDLERS[args.command](ctx, args)
    finally:
        ctx.close()


if __name__ == "__main__":
    sys.exit(main())
