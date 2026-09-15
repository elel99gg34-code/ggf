"""원격 상태를 로컬 캐시로 끌어온다.

동기화는 이 앱에서 유일하게 '싼' 대량 작업이다. 읽기가 페이지당 1유닛이므로
구독 500개 + 재생목록 전체를 받아도 수십 유닛이면 끝난다. 예외는 채널별
최신 업로드 조회로, 채널당 1유닛이 들어 500채널이면 500유닛이다. 그래서
그 단계만 따로 떼어 필요할 때만 돌린다.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Callable

from .models import Channel, Playlist, PlaylistItem, Video, now_utc
from .quota import QuotaExceeded

log = logging.getLogger(__name__)

# (단계 이름, 완료 수, 전체 수)
ProgressFn = Callable[[str, int, int], None]


def _noop(stage: str, done: int, total: int) -> None:
    pass


@dataclass
class SyncResult:
    subscriptions: int = 0
    renamed_channels: int = 0
    gone_channels: int = 0
    playlists: int = 0
    playlist_items: int = 0
    videos_hydrated: int = 0
    uploads_scanned: int = 0
    units_spent: int = 0
    stopped_early: bool = False
    notes: list[str] = field(default_factory=list)

    def summary(self) -> str:
        parts = [
            f"구독 {self.subscriptions}개",
            f"재생목록 {self.playlists}개",
            f"항목 {self.playlist_items}개",
        ]
        if self.renamed_channels:
            parts.append(f"이름 바뀐 채널 {self.renamed_channels}개")
        if self.gone_channels:
            parts.append(f"사라진 채널 {self.gone_channels}개")
        text = " · ".join(parts) + f" · {self.units_spent:,}유닛 사용"
        if self.stopped_early:
            text += " (할당량 부족으로 중단)"
        return text


class Syncer:
    def __init__(self, api, db, ledger):
        self.api = api
        self.db = db
        self.ledger = ledger

    # ---- 개별 단계 ------------------------------------------------------

    def sync_subscriptions(self, progress: ProgressFn = _noop) -> tuple[int, int, int]:
        """구독 목록 전체를 받아 캐시에 반영.

        500개 구독이면 페이지 10개 = 10유닛.
        """
        channels: list[Channel] = []
        for item in self.api.my_subscriptions():
            ch = Channel.from_subscription(item)
            if ch.channel_id:
                channels.append(ch)
            if len(channels) % 50 == 0:
                progress("구독 목록 받는 중", len(channels), 0)

        renamed = self.db.upsert_channels(channels)
        gone = self.db.mark_channels_gone({c.channel_id for c in channels})
        progress("구독 목록 받는 중", len(channels), len(channels))
        return len(channels), renamed, gone

    def sync_channel_details(self, progress: ProgressFn = _noop) -> int:
        """구독 채널의 업로드 재생목록 ID와 통계를 채운다. 50채널당 1유닛."""
        channels = self.db.channels()
        ids = [c.channel_id for c in channels if not c.uploads_playlist_id]
        if not ids:
            return 0

        done = 0
        for item in self.api.channels_details(ids):
            details = item.get("contentDetails", {}).get("relatedPlaylists", {})
            stats = item.get("statistics", {})
            self.db.update_channel_uploads(
                item.get("id", ""),
                details.get("uploads", ""),
                int(stats.get("videoCount", 0) or 0),
                int(stats.get("subscriberCount", 0) or 0),
            )
            done += 1
            if done % 50 == 0:
                progress("채널 정보 받는 중", done, len(ids))
        progress("채널 정보 받는 중", done, len(ids))
        return done

    def scan_uploads(self, progress: ProgressFn = _noop, limit: int | None = None,
                     stale_days: int = 7) -> int:
        """채널별 최신 업로드 시각을 조사한다. 채널당 1유닛 — 동기화 중 가장 비싼 단계.

        stale_days 안에 이미 조사한 채널은 건너뛴다. 휴면 채널 판정에 쓰는
        값이라 매일 갱신할 이유가 없다.
        """
        channels = self.db.channels()
        targets = []
        for ch in channels:
            if not ch.uploads_playlist_id:
                continue
            if ch.upload_scanned_at:
                from .models import parse_ts
                scanned = parse_ts(ch.upload_scanned_at)
                if scanned and (now_utc() - scanned).days < stale_days:
                    continue
            targets.append(ch)

        if limit:
            targets = targets[:limit]

        done = 0
        for ch in targets:
            try:
                item = self.api.latest_upload(ch.uploads_playlist_id)
            except QuotaExceeded:
                log.info("업로드 스캔 중 할당량 소진 — %d/%d에서 중단", done, len(targets))
                raise
            if item:
                snippet = item.get("snippet", {})
                self.db.update_channel_last_upload(
                    ch.channel_id,
                    snippet.get("publishedAt"),
                    snippet.get("resourceId", {}).get("videoId"),
                )
            else:
                # 영상이 없거나 접근 불가. 스캔 시각만 남겨 재조사를 막는다.
                self.db.update_channel_last_upload(ch.channel_id, None, None)
            done += 1
            if done % 10 == 0:
                progress("채널 업로드 확인 중", done, len(targets))
        progress("채널 업로드 확인 중", done, len(targets))
        return done

    def sync_playlists(self, progress: ProgressFn = _noop) -> int:
        """내 재생목록 목록과 '좋아요 표시한 동영상'을 캐시에 넣는다."""
        playlists = [Playlist.from_api(item) for item in self.api.my_playlists()]

        # 좋아요 목록은 my_playlists에 안 나온다. 내 채널의 relatedPlaylists에서
        # 따로 ID를 얻어야 한다.
        me = self.api.my_channel()
        related = me.get("contentDetails", {}).get("relatedPlaylists", {})
        likes_id = related.get("likes")
        if likes_id:
            playlists.append(Playlist(
                playlist_id=likes_id, title="좋아요 표시한 동영상",
                kind="likes", privacy="private",
            ))
            self.db.set_meta("likes_playlist_id", likes_id)
        if me.get("id"):
            self.db.set_meta("my_channel_id", me["id"])
            self.db.set_meta("my_channel_title", me.get("snippet", {}).get("title", ""))

        self.db.upsert_playlists(playlists)
        progress("재생목록 목록 받는 중", len(playlists), len(playlists))
        return len(playlists)

    def sync_playlist_items(self, playlist_id: str,
                            progress: ProgressFn = _noop) -> int:
        """한 재생목록의 항목 전체. 50개당 1유닛."""
        items = [PlaylistItem.from_api(raw) for raw in self.api.playlist_items(playlist_id)]
        items = [it for it in items if it.video_id]
        # 유튜브가 준 순서를 신뢰하되, position이 비어 있는 경우를 대비해 보정한다.
        for index, item in enumerate(items):
            if item.position == 0 and index > 0:
                item.position = index
        self.db.replace_playlist_items(playlist_id, items)
        progress("재생목록 내용 받는 중", len(items), len(items))
        return len(items)

    def sync_all_playlist_items(self, progress: ProgressFn = _noop,
                                kinds: tuple[str, ...] = ("user", "likes")) -> int:
        total = 0
        playlists = [p for p in self.db.playlists() if p.kind in kinds]
        for index, pl in enumerate(playlists, 1):
            total += self.sync_playlist_items(pl.playlist_id)
            progress(f"재생목록 내용 받는 중 ({pl.title})", index, len(playlists))
        return total

    def hydrate_videos(self, video_ids: list[str], progress: ProgressFn = _noop,
                       force: bool = False) -> int:
        """영상 메타데이터를 채운다. 50개당 1유닛 — 1,000개에 20유닛.

        여기서 안 돌아온 ID는 삭제되었거나 비공개로 바뀐 영상이므로
        availability를 갱신해 청소 기능이 쓸 수 있게 한다.
        """
        wanted = list(dict.fromkeys(v for v in video_ids if v))
        if not force:
            known = self.db.known_video_ids()
            wanted = [v for v in wanted if v not in known]
        if not wanted:
            return 0

        received: set[str] = set()
        batch: list[Video] = []
        for item in self.api.videos_details(wanted):
            video = Video.from_api(item)
            if video.video_id:
                received.add(video.video_id)
                batch.append(video)
            if len(batch) >= 200:
                self.db.upsert_videos(batch)
                batch = []
                progress("영상 정보 받는 중", len(received), len(wanted))
        if batch:
            self.db.upsert_videos(batch)

        missing = [v for v in wanted if v not in received]
        if missing:
            # 캐시에 없던 영상이면 최소한의 자리표시자를 만들어 둔다.
            placeholders = [
                Video(video_id=vid, title="(삭제되었거나 비공개)", availability="deleted")
                for vid in missing if vid not in self.db.known_video_ids()
            ]
            if placeholders:
                self.db.upsert_videos(placeholders)
            self.db.mark_videos_unavailable(missing)

        progress("영상 정보 받는 중", len(received), len(wanted))
        return len(received)

    # ---- 전체 동기화 ----------------------------------------------------

    def full_sync(self, progress: ProgressFn = _noop, scan_uploads: bool = True,
                  hydrate: bool = True) -> SyncResult:
        """앱 시작 시 또는 '새로고침'에서 부르는 전체 동기화.

        할당량이 중간에 떨어져도 여기까지 받은 건 캐시에 남는다. 다음 실행에서
        이어서 받으면 된다.
        """
        result = SyncResult()
        before = self.ledger.spent()

        try:
            result.subscriptions, result.renamed_channels, result.gone_channels = \
                self.sync_subscriptions(progress)
            self.sync_channel_details(progress)
            result.playlists = self.sync_playlists(progress)
            result.playlist_items = self.sync_all_playlist_items(progress)

            if hydrate:
                ids = list(self.db.video_ids_in_playlists())
                result.videos_hydrated = self.hydrate_videos(ids, progress)

            if scan_uploads:
                result.uploads_scanned = self.scan_uploads(progress)

        except QuotaExceeded as exc:
            result.stopped_early = True
            result.notes.append(str(exc))
            log.info("동기화 중단: %s", exc)

        result.units_spent = self.ledger.spent() - before
        self.db.set_meta("last_sync_at", now_utc().isoformat())
        return result


def estimate_full_sync_cost(db) -> int:
    """다음 전체 동기화에 들 유닛 추정. 사용자에게 미리 보여준다."""
    channels = db.channels()
    playlists = db.playlists()
    n_channels = max(len(channels), 50)
    n_playlists = max(len(playlists), 5)
    total_items = sum(p.item_count for p in playlists) or 200

    subs_pages = max(1, n_channels // 50)
    channel_detail_pages = max(1, n_channels // 50)
    playlist_pages = max(1, n_playlists // 50)
    item_pages = sum(max(1, p.item_count // 50) for p in playlists) or 4
    video_pages = max(1, total_items // 50)
    upload_scan = n_channels  # 채널당 1유닛 — 가장 비싼 부분

    return (subs_pages + channel_detail_pages + playlist_pages
            + item_pages + video_pages + upload_scan)
