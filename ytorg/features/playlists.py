"""재생목록 청소·정렬·병합.

비용 주의: 항목을 빼는 것도, 순서를 바꾸는 것도 개당 50유닛이다.
100개짜리 재생목록을 통째로 정렬하면 5,000유닛 — 하루 예산의 절반이다.
그래서 정렬은 '움직여야만 하는 항목'만 움직이도록 계산한다.
"""

from __future__ import annotations

import bisect
from dataclasses import dataclass

from ..core.models import PlaylistItem, Video, parse_ts
from ..jobs.queue import JobPlan

SORT_KEYS = {
    "added": "추가한 순서",
    "published": "업로드 날짜순",
    "title": "제목 가나다순",
    "duration": "길이순",
    "channel": "채널명순",
}


@dataclass
class CleanupFindings:
    dead: list[PlaylistItem]        # 삭제되거나 비공개된 영상
    duplicates: list[PlaylistItem]  # 같은 영상의 두 번째 이후 항목

    @property
    def total(self) -> int:
        return len(self.dead) + len(self.duplicates)

    def describe(self) -> str:
        parts = []
        if self.dead:
            parts.append(f"삭제·비공개 영상 {len(self.dead)}개")
        if self.duplicates:
            parts.append(f"중복 항목 {len(self.duplicates)}개")
        return " · ".join(parts) if parts else "치울 게 없어"


def inspect(db, playlist_id: str) -> CleanupFindings:
    """재생목록을 훑어 문제 항목을 찾는다. 로컬 캐시만 보므로 0유닛."""
    items = db.playlist_items(playlist_id)
    videos = db.videos_by_ids([i.video_id for i in items])

    dead: list[PlaylistItem] = []
    duplicates: list[PlaylistItem] = []
    seen: set[str] = set()

    for item in items:
        video = videos.get(item.video_id)
        # 항목 스냅샷(제목이 'Deleted video')과 영상 캐시 상태를 함께 본다.
        # 어느 한쪽만 보면 놓치는 경우가 있다.
        if item.is_dead or (video and video.availability != "available"):
            dead.append(item)
            continue
        if item.video_id in seen:
            duplicates.append(item)
        else:
            seen.add(item.video_id)

    return CleanupFindings(dead, duplicates)


def plan_cleanup(db, playlist_id: str, findings: CleanupFindings,
                 remove_dead: bool = True, remove_duplicates: bool = True) -> JobPlan:
    playlist = next((p for p in db.playlists() if p.playlist_id == playlist_id), None)
    title = playlist.title if playlist else playlist_id
    plan = JobPlan(kind="cleanup", title=f"'{title}' 청소")

    targets: list[tuple[PlaylistItem, str]] = []
    if remove_dead:
        targets += [(i, "삭제·비공개된 영상") for i in findings.dead]
    if remove_duplicates:
        targets += [(i, "중복 항목") for i in findings.duplicates]

    for item, reason in targets:
        plan.add("remove_item", {
            "item_id": item.item_id,
            "playlist_id": playlist_id,
            "video_id": item.video_id,
            "position": item.position,
        })
        label = item.title_snapshot or item.video_id
        plan.rows.append((label, "빼기", reason))

    return plan


# ---- 정렬 ----------------------------------------------------------------

def _sort_key(key: str):
    def by_added(item: PlaylistItem, video: Video | None):
        return item.added_at or ""

    def by_published(item: PlaylistItem, video: Video | None):
        return (video.published_at or "") if video else ""

    def by_title(item: PlaylistItem, video: Video | None):
        return (video.title if video else item.title_snapshot).lower()

    def by_duration(item: PlaylistItem, video: Video | None):
        return video.duration_sec if video else 0

    def by_channel(item: PlaylistItem, video: Video | None):
        return (video.channel_title if video else "").lower()

    return {
        "added": by_added, "published": by_published, "title": by_title,
        "duration": by_duration, "channel": by_channel,
    }[key]


def minimal_moves(current: list[str], target: list[str]) -> list[tuple[str, int]]:
    """현재 순서를 목표 순서로 만드는 최소 이동 목록을 계산한다.

    핵심 아이디어: 이미 상대 순서가 맞는 항목들(최장 증가 부분 수열)은
    가만히 두고, 나머지만 제자리에 끼워 넣는다. 항목 하나 옮기는 데 50유닛이
    들기 때문에 이 계산이 곧 돈이다 — 이미 거의 정렬된 목록이라면 이동이
    몇 건으로 줄고, 완전히 정렬돼 있으면 0건이 된다.

    돌려주는 값은 (item_id, 목표 위치) 목록이고, 순서대로 적용해야 한다.
    """
    target_pos = {item: i for i, item in enumerate(target)}
    # 목표에 없는 항목(청소 대상 등)은 계산에서 제외한다.
    seq = [target_pos[item] for item in current if item in target_pos]

    keep = set(_longest_increasing(seq))

    moves: list[tuple[str, int]] = []
    working = [item for item in current if item in target_pos]
    for index, item in enumerate(target):
        if target_pos[item] in keep:
            continue
        working.remove(item)
        working.insert(index, item)
        moves.append((item, index))
    return moves


def _longest_increasing(seq: list[int]) -> list[int]:
    """최장 증가 부분 수열의 '값'들을 돌려준다. O(n log n)."""
    if not seq:
        return []
    tails: list[int] = []        # 길이별 최소 끝값
    tail_index: list[int] = []   # 그 끝값의 원소 위치
    prev = [-1] * len(seq)

    for i, value in enumerate(seq):
        j = bisect.bisect_left(tails, value)
        if j == len(tails):
            tails.append(value)
            tail_index.append(i)
        else:
            tails[j] = value
            tail_index[j] = i
        prev[i] = tail_index[j - 1] if j > 0 else -1

    result: list[int] = []
    k = tail_index[-1]
    while k >= 0:
        result.append(seq[k])
        k = prev[k]
    return result[::-1]


def plan_sort(db, playlist_id: str, key: str = "published",
              reverse: bool = False) -> JobPlan:
    playlist = next((p for p in db.playlists() if p.playlist_id == playlist_id), None)
    title = playlist.title if playlist else playlist_id
    plan = JobPlan(kind="sort", title=f"'{title}' {SORT_KEYS.get(key, key)} 정렬")

    items = db.playlist_items(playlist_id)
    if not items:
        return plan
    videos = db.videos_by_ids([i.video_id for i in items])

    key_fn = _sort_key(key)
    ordered = sorted(items, key=lambda i: key_fn(i, videos.get(i.video_id)),
                     reverse=reverse)

    current_ids = [i.item_id for i in items]
    target_ids = [i.item_id for i in ordered]
    by_item = {i.item_id: i for i in items}

    moves = minimal_moves(current_ids, target_ids)
    for item_id, position in moves:
        item = by_item[item_id]
        plan.add("move_item", {
            "item_id": item_id,
            "playlist_id": playlist_id,
            "video_id": item.video_id,
            "position": position,
            "from_position": item.position,
        })
        label = (videos.get(item.video_id).title if videos.get(item.video_id)
                 else item.title_snapshot) or item.video_id
        plan.rows.append((label, f"{position + 1}번째로", SORT_KEYS.get(key, key)))

    untouched = len(items) - len(moves)
    if moves:
        plan.warnings.append(
            f"순서 변경은 항목당 50유닛이야. {untouched}개는 이미 제자리라 "
            f"건드리지 않고 {len(moves)}개만 옮겨서 {len(moves) * 50:,}유닛 들어 "
            f"(전부 옮기면 {len(items) * 50:,}유닛이었어)."
        )
    return plan


# ---- 병합 ----------------------------------------------------------------

def plan_merge(db, source_ids: list[str], target_id: str,
               delete_sources: bool = False) -> JobPlan:
    """여러 재생목록을 하나로 합친다. 이미 있는 영상은 건너뛴다."""
    playlists = {p.playlist_id: p for p in db.playlists()}
    target = playlists.get(target_id)
    plan = JobPlan(kind="merge",
                   title=f"'{target.title if target else target_id}'로 합치기")

    existing = {i.video_id for i in db.playlist_items(target_id)}
    added: set[str] = set()

    for source_id in source_ids:
        if source_id == target_id:
            continue
        source = playlists.get(source_id)
        for item in db.playlist_items(source_id):
            if item.is_dead:
                continue
            if item.video_id in existing or item.video_id in added:
                continue  # 중복 방지 — 두 번 돌려도 안전하다
            added.add(item.video_id)
            plan.add("add_item", {"playlist_id": target_id, "video_id": item.video_id})
            plan.rows.append((
                item.title_snapshot or item.video_id, "옮기기",
                f"{source.title if source else source_id}에서",
            ))

    if delete_sources:
        for source_id in source_ids:
            if source_id == target_id:
                continue
            source = playlists.get(source_id)
            plan.add("delete_playlist", {"playlist_id": source_id})
            plan.rows.append((source.title if source else source_id, "재생목록 삭제", "병합 후 정리"))
        plan.warnings.append("재생목록 삭제는 되돌릴 수 없어. 항목을 먼저 옮긴 뒤 지워.")

    return plan
