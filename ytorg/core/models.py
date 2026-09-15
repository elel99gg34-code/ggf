"""앱 전역에서 쓰는 값 객체.

API 응답(dict)과 SQLite 행(sqlite3.Row) 양쪽에서 만들어질 수 있어야 하므로
from_api / from_row 두 경로를 모두 둔다.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

# ISO 8601 duration (PT1H2M3S) 파싱용. 유튜브는 이 형식으로만 재생시간을 준다.
_DURATION_RE = re.compile(
    r"P(?:(?P<days>\d+)D)?T?(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?"
)


def parse_duration(value: str | None) -> int:
    """'PT4M13S' -> 253 (초). 파싱 실패나 라이브 스트림은 0."""
    if not value:
        return 0
    match = _DURATION_RE.fullmatch(value)
    if not match:
        return 0
    parts = {k: int(v) for k, v in match.groupdict(default="0").items()}
    return parts["days"] * 86400 + parts["hours"] * 3600 + parts["minutes"] * 60 + parts["seconds"]


def parse_ts(value: str | None) -> datetime | None:
    """유튜브의 RFC3339 타임스탬프를 tz-aware datetime으로."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


# 유튜브가 사라진 영상 자리에 넣어두는 자리표시자 제목.
# 실제 사용자 영상 제목과 겹칠 수 있으므로 privacy_status와 함께 판단한다.
DELETED_TITLES = {"Deleted video", "Private video", "삭제된 동영상", "비공개 동영상"}


@dataclass
class Channel:
    channel_id: str
    title: str
    subscription_id: str | None = None
    uploads_playlist_id: str | None = None
    description: str = ""
    thumbnail_url: str = ""
    subscribed_at: str | None = None
    last_upload_at: str | None = None
    last_upload_video_id: str | None = None
    video_count: int = 0
    subscriber_count: int = 0
    previous_title: str | None = None
    title_changed_at: str | None = None
    status: str = "active"  # active | gone
    synced_at: str | None = None
    upload_scanned_at: str | None = None

    @classmethod
    def from_subscription(cls, item: dict) -> "Channel":
        snippet = item.get("snippet", {})
        thumbs = snippet.get("thumbnails", {})
        thumb = thumbs.get("default", {}).get("url", "") if thumbs else ""
        return cls(
            channel_id=snippet.get("resourceId", {}).get("channelId", ""),
            title=snippet.get("title", ""),
            subscription_id=item.get("id"),
            description=snippet.get("description", "") or "",
            thumbnail_url=thumb,
            subscribed_at=snippet.get("publishedAt"),
        )

    @property
    def days_since_upload(self) -> int | None:
        ts = parse_ts(self.last_upload_at)
        if not ts:
            return None
        return (now_utc() - ts).days


@dataclass
class Video:
    video_id: str
    title: str = ""
    channel_id: str = ""
    channel_title: str = ""
    description: str = ""
    published_at: str | None = None
    duration_sec: int = 0
    category_id: str = ""
    tags: list[str] = field(default_factory=list)
    topics: list[str] = field(default_factory=list)
    language: str = ""
    view_count: int = 0
    like_count: int = 0
    availability: str = "available"  # available | private | deleted

    @classmethod
    def from_api(cls, item: dict) -> "Video":
        snippet = item.get("snippet", {})
        details = item.get("contentDetails", {})
        stats = item.get("statistics", {})
        topic = item.get("topicDetails", {})
        raw_topics = topic.get("topicCategories", []) or []
        # topicCategories는 위키백과 URL이라 마지막 조각만 쓴다.
        topics = [t.rsplit("/", 1)[-1].replace("_", " ") for t in raw_topics]
        return cls(
            video_id=item.get("id", ""),
            title=snippet.get("title", ""),
            channel_id=snippet.get("channelId", ""),
            channel_title=snippet.get("channelTitle", ""),
            description=snippet.get("description", "") or "",
            published_at=snippet.get("publishedAt"),
            duration_sec=parse_duration(details.get("duration")),
            category_id=str(snippet.get("categoryId", "")),
            tags=snippet.get("tags", []) or [],
            topics=topics,
            language=snippet.get("defaultAudioLanguage") or snippet.get("defaultLanguage") or "",
            view_count=int(stats.get("viewCount", 0) or 0),
            like_count=int(stats.get("likeCount", 0) or 0),
        )

    @property
    def is_short(self) -> bool:
        """쇼츠 판별. API에 전용 필드가 없어 길이로 추정한다(60초 이하)."""
        return 0 < self.duration_sec <= 60

    def text_blob(self) -> str:
        """규칙 매칭과 AI 분류가 함께 쓰는 검색 대상 텍스트."""
        return " ".join([self.title, self.channel_title, " ".join(self.tags), " ".join(self.topics)])


@dataclass
class Playlist:
    playlist_id: str
    title: str = ""
    description: str = ""
    privacy: str = "private"
    item_count: int = 0
    kind: str = "user"  # user | likes | uploads
    synced_at: str | None = None

    @classmethod
    def from_api(cls, item: dict, kind: str = "user") -> "Playlist":
        snippet = item.get("snippet", {})
        status = item.get("status", {})
        details = item.get("contentDetails", {})
        return cls(
            playlist_id=item.get("id", ""),
            title=snippet.get("title", ""),
            description=snippet.get("description", "") or "",
            privacy=status.get("privacyStatus", "private"),
            item_count=int(details.get("itemCount", 0) or 0),
            kind=kind,
        )


@dataclass
class PlaylistItem:
    item_id: str
    playlist_id: str
    video_id: str
    position: int = 0
    title_snapshot: str = ""
    privacy_status: str = ""
    added_at: str | None = None

    @classmethod
    def from_api(cls, item: dict) -> "PlaylistItem":
        snippet = item.get("snippet", {})
        status = item.get("status", {})
        return cls(
            item_id=item.get("id", ""),
            playlist_id=snippet.get("playlistId", ""),
            video_id=snippet.get("resourceId", {}).get("videoId", ""),
            position=int(snippet.get("position", 0) or 0),
            title_snapshot=snippet.get("title", ""),
            privacy_status=status.get("privacyStatus", ""),
            added_at=snippet.get("publishedAt"),
        )

    @property
    def is_dead(self) -> bool:
        """삭제되거나 비공개로 바뀐 영상인지.

        제목만 보면 오판할 수 있어서(사용자가 실제로 'Private video'라는
        제목을 지을 수도 있다) privacyStatus를 함께 본다.
        """
        if self.privacy_status in ("private", "privacyStatusUnspecified"):
            return True
        return self.title_snapshot in DELETED_TITLES


def dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False)
