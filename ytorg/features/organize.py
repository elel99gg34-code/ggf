"""분류 결과를 실제 재생목록으로 만드는 계획.

이 앱에서 가장 비싼 기능이다. 영상 하나 넣을 때마다 50유닛이라 500개를
분류하면 25,000유닛 — 사흘치 예산이다. 그래서 두 가지를 반드시 지킨다.

1. 멱등성: 이미 그 재생목록에 있는 영상은 건너뛴다. 두 번 돌려도 중복이
   생기지 않고, 이어서 돌리면 남은 것만 처리된다.
2. 재사용: 같은 이름의 재생목록이 이미 있으면 새로 만들지 않는다.
   (재생목록 생성도 50유닛이고, 이름이 같은 게 둘 생기면 정리가 아니다.)
"""

from __future__ import annotations

from ..jobs.ops import ref
from ..jobs.queue import JobPlan
from ..rules.engine import ClassificationResult


def plan_organize(db, result: ClassificationResult, privacy: str = "private",
                  source_label: str = "") -> JobPlan:
    """분류 결과 → 재생목록 생성 + 영상 추가 계획.

    source_label은 '좋아요 목록에서' 같은 설명으로, 작업 제목에 쓴다.
    """
    title = "자동 분류" + (f" ({source_label})" if source_label else "")
    plan = JobPlan(kind="organize", title=title)

    existing = {p.title: p for p in db.playlists() if p.kind == "user"}
    # 재생목록별로 이미 들어 있는 영상. 중복 추가를 막는 근거다.
    contents: dict[str, set[str]] = {
        p.playlist_id: {i.video_id for i in db.playlist_items(p.playlist_id)}
        for p in existing.values()
    }

    groups = result.by_playlist()
    created: set[str] = set()
    skipped = 0

    # 큰 그룹부터 처리한다. 할당량이 중간에 떨어져도 효과가 큰 것부터 끝난다.
    for name, assignments in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        target = existing.get(name)

        if target is not None:
            playlist_ref = target.playlist_id
            already = contents.get(target.playlist_id, set())
            plan.rows.append((name, "기존 재생목록 사용", f"{len(already)}개 들어 있음"))
        else:
            # 아직 없는 재생목록. 만들고, 뒤따르는 추가 연산이 참조로 가리킨다.
            ref_name = f"pl_{len(created)}"
            plan.add("create_playlist", {
                "title": name,
                "description": "YTOrganizer가 자동으로 만든 재생목록",
                "privacy": privacy,
                "ref_name": ref_name,
            })
            playlist_ref = ref(ref_name)
            already = set()
            created.add(name)
            plan.rows.append((name, "새로 만들기", f"영상 {len(assignments)}개"))

        for item in assignments:
            if item.video_id in already:
                skipped += 1
                continue
            already.add(item.video_id)  # 같은 계획 안에서의 중복도 막는다
            plan.add("add_item", {
                "playlist_id": playlist_ref,
                "video_id": item.video_id,
            })
            plan.rows.append((item.title or item.video_id, f"→ {name}", item.reason))

    if skipped:
        plan.warnings.append(f"이미 들어 있는 영상 {skipped}개는 건너뛰었어")
    if result.unmatched:
        plan.warnings.append(
            f"어디에도 안 맞는 영상 {len(result.unmatched)}개는 그대로 뒀어"
        )
    plan.warnings.extend(result.notes)
    return plan


def videos_from_playlist(db, playlist_id: str) -> list:
    """재생목록에 든 영상들의 메타데이터. 분류기 입력으로 쓴다."""
    items = db.playlist_items(playlist_id)
    videos = db.videos_by_ids([i.video_id for i in items])
    # 재생목록 순서를 유지한다 (분류 결과를 눈으로 대조하기 쉽게)
    return [videos[i.video_id] for i in items if i.video_id in videos]


def liked_videos(db) -> list:
    """'좋아요 표시한 동영상' 목록. 읽기가 매우 싸서(1,000개에 20유닛)
    자동 분류의 기본 소스로 쓰기 좋다."""
    likes = [p for p in db.playlists() if p.kind == "likes"]
    if not likes:
        return []
    return videos_from_playlist(db, likes[0].playlist_id)


def uncategorized_videos(db) -> list:
    """어느 사용자 재생목록에도 안 들어 있는 영상들.

    좋아요만 눌러두고 방치한 영상을 찾아내는 용도다.
    """
    in_user_playlists: set[str] = set()
    for playlist in db.playlists(kind="user"):
        in_user_playlists |= {i.video_id for i in db.playlist_items(playlist.playlist_id)}

    result = []
    for video in liked_videos(db):
        if video.video_id not in in_user_playlists:
            result.append(video)
    return result
