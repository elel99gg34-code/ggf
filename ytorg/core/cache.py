"""로컬 SQLite 미러.

이 앱의 성능과 비용은 전부 여기에 달려 있다. 한 번 동기화해두면 탐색·필터·
정렬·변경 계획 수립이 전부 로컬에서 일어나므로 API 할당량을 0유닛 쓴다.
API는 (1) 동기화와 (2) 실제 쓰기에만 호출한다.

캐시·큐·원장·되돌리기 저널을 파일 하나에 담아 백업과 초기화를 단순하게 유지한다.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path

from . import paths
from .models import Channel, Playlist, PlaylistItem, Video, now_utc

SCHEMA_VERSION = 1

_SCHEMA = """
CREATE TABLE IF NOT EXISTS channels (
    channel_id           TEXT PRIMARY KEY,
    title                TEXT NOT NULL DEFAULT '',
    subscription_id      TEXT,
    uploads_playlist_id  TEXT,
    description          TEXT DEFAULT '',
    thumbnail_url        TEXT DEFAULT '',
    subscribed_at        TEXT,
    last_upload_at       TEXT,
    last_upload_video_id TEXT,
    video_count          INTEGER DEFAULT 0,
    subscriber_count     INTEGER DEFAULT 0,
    previous_title       TEXT,
    title_changed_at     TEXT,
    status               TEXT NOT NULL DEFAULT 'active',
    synced_at            TEXT,
    upload_scanned_at    TEXT
);

CREATE TABLE IF NOT EXISTS videos (
    video_id      TEXT PRIMARY KEY,
    title         TEXT DEFAULT '',
    channel_id    TEXT DEFAULT '',
    channel_title TEXT DEFAULT '',
    description   TEXT DEFAULT '',
    published_at  TEXT,
    duration_sec  INTEGER DEFAULT 0,
    category_id   TEXT DEFAULT '',
    tags          TEXT DEFAULT '[]',
    topics        TEXT DEFAULT '[]',
    language      TEXT DEFAULT '',
    view_count    INTEGER DEFAULT 0,
    like_count    INTEGER DEFAULT 0,
    availability  TEXT NOT NULL DEFAULT 'available',
    synced_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id);

CREATE TABLE IF NOT EXISTS playlists (
    playlist_id TEXT PRIMARY KEY,
    title       TEXT DEFAULT '',
    description TEXT DEFAULT '',
    privacy     TEXT DEFAULT 'private',
    item_count  INTEGER DEFAULT 0,
    kind        TEXT NOT NULL DEFAULT 'user',
    synced_at   TEXT
);

CREATE TABLE IF NOT EXISTS playlist_items (
    item_id        TEXT PRIMARY KEY,
    playlist_id    TEXT NOT NULL,
    video_id       TEXT NOT NULL,
    position       INTEGER DEFAULT 0,
    title_snapshot TEXT DEFAULT '',
    privacy_status TEXT DEFAULT '',
    added_at       TEXT,
    synced_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_playlist ON playlist_items(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_items_video ON playlist_items(video_id);

-- 할당량 원장: 호출 '전에' 기록한다. 앱이 중간에 죽어도 소모분을 잃지 않기 위함.
CREATE TABLE IF NOT EXISTS quota_ledger (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    quota_day TEXT NOT NULL,
    method    TEXT NOT NULL,
    cost      INTEGER NOT NULL,
    job_id    INTEGER,
    at        TEXT NOT NULL,
    note      TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_day ON quota_ledger(quota_day);

CREATE TABLE IF NOT EXISTS jobs (
    job_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind           TEXT NOT NULL,
    title          TEXT DEFAULT '',
    status         TEXT NOT NULL DEFAULT 'pending',
    created_at     TEXT,
    started_at     TEXT,
    finished_at    TEXT,
    total_ops      INTEGER DEFAULT 0,
    done_ops       INTEGER DEFAULT 0,
    failed_ops     INTEGER DEFAULT 0,
    estimated_cost INTEGER DEFAULT 0,
    spent_cost     INTEGER DEFAULT 0,
    payload        TEXT DEFAULT '{}'
);

-- 재개 단위. 앱을 꺼도, 할당량이 바닥나도 pending으로 남은 것부터 이어서 한다.
CREATE TABLE IF NOT EXISTS job_ops (
    op_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id     INTEGER NOT NULL,
    seq        INTEGER NOT NULL,
    op_type    TEXT NOT NULL,
    params     TEXT NOT NULL DEFAULT '{}',
    status     TEXT NOT NULL DEFAULT 'pending',
    cost       INTEGER DEFAULT 0,
    result     TEXT,
    error      TEXT,
    attempts   INTEGER DEFAULT 0,
    updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ops_job ON job_ops(job_id, status, seq);

CREATE TABLE IF NOT EXISTS undo_journal (
    undo_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id         INTEGER,
    op_id          INTEGER,
    op_type        TEXT,
    inverse_type   TEXT NOT NULL,
    inverse_params TEXT NOT NULL DEFAULT '{}',
    label          TEXT DEFAULT '',
    created_at     TEXT,
    undone_at      TEXT,
    status         TEXT NOT NULL DEFAULT 'available'
);
CREATE INDEX IF NOT EXISTS idx_undo_job ON undo_journal(job_id, status);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


class Database:
    """스레드 안전한 SQLite 래퍼.

    GUI 스레드와 작업 워커 스레드가 같은 DB를 만지므로 연결을 스레드별로 두고
    쓰기는 락으로 직렬화한다. WAL을 켜서 읽기가 쓰기를 막지 않게 한다.
    """

    def __init__(self, path: Path | str | None = None):
        self.path = Path(path) if path else paths.db_path()
        self._local = threading.local()
        self._write_lock = threading.RLock()
        self._init_schema()

    def connect(self) -> sqlite3.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(self.path, timeout=30.0, isolation_level=None)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA foreign_keys=ON")
            conn.execute("PRAGMA busy_timeout=30000")
            self._local.conn = conn
        return conn

    def _init_schema(self) -> None:
        conn = self.connect()
        with self._write_lock:
            conn.executescript(_SCHEMA)
            version = conn.execute("PRAGMA user_version").fetchone()[0]
            if version < SCHEMA_VERSION:
                conn.execute(f"PRAGMA user_version={SCHEMA_VERSION}")

    @contextmanager
    def write(self):
        """쓰기 트랜잭션. 여러 문장을 원자적으로 묶는다."""
        conn = self.connect()
        with self._write_lock:
            conn.execute("BEGIN IMMEDIATE")
            try:
                yield conn
                conn.execute("COMMIT")
            except Exception:
                conn.execute("ROLLBACK")
                raise

    def query(self, sql: str, params: tuple = ()) -> list[sqlite3.Row]:
        return self.connect().execute(sql, params).fetchall()

    def one(self, sql: str, params: tuple = ()) -> sqlite3.Row | None:
        return self.connect().execute(sql, params).fetchone()

    def execute(self, sql: str, params: tuple = ()):
        with self._write_lock:
            return self.connect().execute(sql, params)

    def close(self) -> None:
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            conn.close()
            self._local.conn = None

    # ---- meta ----------------------------------------------------------

    def get_meta(self, key: str, default: str | None = None) -> str | None:
        row = self.one("SELECT value FROM meta WHERE key=?", (key,))
        return row["value"] if row else default

    def set_meta(self, key: str, value: str) -> None:
        self.execute(
            "INSERT INTO meta(key, value) VALUES(?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            (key, value),
        )

    # ---- 구독 채널 ------------------------------------------------------

    def upsert_channels(self, channels: list[Channel]) -> int:
        """구독 목록을 반영한다.

        채널명이 바뀐 경우 previous_title에 옛 이름을 남겨 '개명 감지'에 쓴다.
        이건 API가 알려주지 않으므로 캐시 대조로만 알 수 있다.
        """
        stamp = now_utc().isoformat()
        changed = 0
        with self.write() as conn:
            for ch in channels:
                old = conn.execute(
                    "SELECT title FROM channels WHERE channel_id=?", (ch.channel_id,)
                ).fetchone()
                prev_title, changed_at = None, None
                if old and old["title"] and old["title"] != ch.title:
                    prev_title, changed_at = old["title"], stamp
                    changed += 1
                conn.execute(
                    """
                    INSERT INTO channels(channel_id, title, subscription_id, description,
                                         thumbnail_url, subscribed_at, status, synced_at)
                    VALUES(?, ?, ?, ?, ?, ?, 'active', ?)
                    ON CONFLICT(channel_id) DO UPDATE SET
                        title=excluded.title,
                        subscription_id=excluded.subscription_id,
                        description=excluded.description,
                        thumbnail_url=excluded.thumbnail_url,
                        subscribed_at=COALESCE(channels.subscribed_at, excluded.subscribed_at),
                        status='active',
                        synced_at=excluded.synced_at,
                        previous_title=COALESCE(?, channels.previous_title),
                        title_changed_at=COALESCE(?, channels.title_changed_at)
                    """,
                    (
                        ch.channel_id, ch.title, ch.subscription_id, ch.description,
                        ch.thumbnail_url, ch.subscribed_at, stamp, prev_title, changed_at,
                    ),
                )
        return changed

    def mark_channels_gone(self, keep_ids: set[str]) -> int:
        """이번 동기화에 안 잡힌 채널을 'gone'으로 표시.

        구독을 직접 취소했거나 채널이 폐쇄된 경우다. 행을 지우지 않고 상태만
        바꿔서 사용자가 무엇이 사라졌는지 볼 수 있게 한다.
        """
        rows = self.query("SELECT channel_id FROM channels WHERE status='active'")
        gone = [r["channel_id"] for r in rows if r["channel_id"] not in keep_ids]
        if gone:
            with self.write() as conn:
                conn.executemany(
                    "UPDATE channels SET status='gone' WHERE channel_id=?",
                    [(cid,) for cid in gone],
                )
        return len(gone)

    def update_channel_uploads(self, channel_id: str, uploads_playlist_id: str,
                               video_count: int, subscriber_count: int) -> None:
        self.execute(
            "UPDATE channels SET uploads_playlist_id=?, video_count=?, subscriber_count=? "
            "WHERE channel_id=?",
            (uploads_playlist_id, video_count, subscriber_count, channel_id),
        )

    def update_channel_last_upload(self, channel_id: str, at: str | None,
                                   video_id: str | None) -> None:
        self.execute(
            "UPDATE channels SET last_upload_at=?, last_upload_video_id=?, upload_scanned_at=? "
            "WHERE channel_id=?",
            (at, video_id, now_utc().isoformat(), channel_id),
        )

    def channels(self, status: str = "active") -> list[Channel]:
        rows = self.query("SELECT * FROM channels WHERE status=? ORDER BY title", (status,))
        return [_channel_from_row(r) for r in rows]

    # ---- 영상 ----------------------------------------------------------

    def upsert_videos(self, videos: list[Video]) -> None:
        stamp = now_utc().isoformat()
        with self.write() as conn:
            conn.executemany(
                """
                INSERT INTO videos(video_id, title, channel_id, channel_title, description,
                                   published_at, duration_sec, category_id, tags, topics,
                                   language, view_count, like_count, availability, synced_at)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(video_id) DO UPDATE SET
                    title=excluded.title, channel_id=excluded.channel_id,
                    channel_title=excluded.channel_title, description=excluded.description,
                    published_at=excluded.published_at, duration_sec=excluded.duration_sec,
                    category_id=excluded.category_id, tags=excluded.tags,
                    topics=excluded.topics, language=excluded.language,
                    view_count=excluded.view_count, like_count=excluded.like_count,
                    availability=excluded.availability, synced_at=excluded.synced_at
                """,
                [
                    (
                        v.video_id, v.title, v.channel_id, v.channel_title, v.description[:2000],
                        v.published_at, v.duration_sec, v.category_id,
                        json.dumps(v.tags, ensure_ascii=False),
                        json.dumps(v.topics, ensure_ascii=False),
                        v.language, v.view_count, v.like_count, v.availability, stamp,
                    )
                    for v in videos
                ],
            )

    def mark_videos_unavailable(self, video_ids: list[str]) -> None:
        """videos.list에 안 잡힌 ID = 삭제되었거나 비공개로 전환된 영상."""
        if not video_ids:
            return
        with self.write() as conn:
            conn.executemany(
                "UPDATE videos SET availability='deleted' WHERE video_id=?",
                [(vid,) for vid in video_ids],
            )

    def videos_by_ids(self, ids: list[str]) -> dict[str, Video]:
        if not ids:
            return {}
        out: dict[str, Video] = {}
        # SQLite 변수 한도(999)를 피해 나눠 조회한다.
        for i in range(0, len(ids), 500):
            chunk = ids[i:i + 500]
            placeholders = ",".join("?" * len(chunk))
            for row in self.query(
                f"SELECT * FROM videos WHERE video_id IN ({placeholders})", tuple(chunk)
            ):
                out[row["video_id"]] = _video_from_row(row)
        return out

    def known_video_ids(self) -> set[str]:
        return {r["video_id"] for r in self.query("SELECT video_id FROM videos")}

    # ---- 재생목록 -------------------------------------------------------

    def upsert_playlists(self, playlists: list[Playlist]) -> None:
        stamp = now_utc().isoformat()
        with self.write() as conn:
            conn.executemany(
                """
                INSERT INTO playlists(playlist_id, title, description, privacy,
                                      item_count, kind, synced_at)
                VALUES(?,?,?,?,?,?,?)
                ON CONFLICT(playlist_id) DO UPDATE SET
                    title=excluded.title, description=excluded.description,
                    privacy=excluded.privacy, item_count=excluded.item_count,
                    kind=excluded.kind, synced_at=excluded.synced_at
                """,
                [
                    (p.playlist_id, p.title, p.description, p.privacy,
                     p.item_count, p.kind, stamp)
                    for p in playlists
                ],
            )

    def playlists(self, kind: str | None = None) -> list[Playlist]:
        if kind:
            rows = self.query("SELECT * FROM playlists WHERE kind=? ORDER BY title", (kind,))
        else:
            rows = self.query("SELECT * FROM playlists ORDER BY kind, title")
        return [_playlist_from_row(r) for r in rows]

    def replace_playlist_items(self, playlist_id: str, items: list[PlaylistItem]) -> None:
        """재생목록 내용을 통째로 갈아끼운다.

        증분 갱신보다 단순하고, 어차피 playlistItems.list로 전체를 받아오므로
        비용 차이가 없다. position이 재배열되는 경우에도 항상 정확해진다.
        """
        stamp = now_utc().isoformat()
        with self.write() as conn:
            conn.execute("DELETE FROM playlist_items WHERE playlist_id=?", (playlist_id,))
            conn.executemany(
                """
                INSERT OR REPLACE INTO playlist_items(item_id, playlist_id, video_id, position,
                                          title_snapshot, privacy_status, added_at, synced_at)
                VALUES(?,?,?,?,?,?,?,?)
                """,
                [
                    (it.item_id, it.playlist_id, it.video_id, it.position,
                     it.title_snapshot, it.privacy_status, it.added_at, stamp)
                    for it in items
                ],
            )
            conn.execute(
                "UPDATE playlists SET item_count=? WHERE playlist_id=?",
                (len(items), playlist_id),
            )

    def playlist_items(self, playlist_id: str) -> list[PlaylistItem]:
        rows = self.query(
            "SELECT * FROM playlist_items WHERE playlist_id=? ORDER BY position",
            (playlist_id,),
        )
        return [_item_from_row(r) for r in rows]

    def video_ids_in_playlists(self) -> set[str]:
        return {r["video_id"] for r in self.query("SELECT DISTINCT video_id FROM playlist_items")}


def _channel_from_row(row: sqlite3.Row) -> Channel:
    return Channel(
        channel_id=row["channel_id"], title=row["title"],
        subscription_id=row["subscription_id"],
        uploads_playlist_id=row["uploads_playlist_id"],
        description=row["description"] or "", thumbnail_url=row["thumbnail_url"] or "",
        subscribed_at=row["subscribed_at"], last_upload_at=row["last_upload_at"],
        last_upload_video_id=row["last_upload_video_id"],
        video_count=row["video_count"] or 0, subscriber_count=row["subscriber_count"] or 0,
        previous_title=row["previous_title"], title_changed_at=row["title_changed_at"],
        status=row["status"], synced_at=row["synced_at"],
        upload_scanned_at=row["upload_scanned_at"],
    )


def _video_from_row(row: sqlite3.Row) -> Video:
    return Video(
        video_id=row["video_id"], title=row["title"] or "",
        channel_id=row["channel_id"] or "", channel_title=row["channel_title"] or "",
        description=row["description"] or "", published_at=row["published_at"],
        duration_sec=row["duration_sec"] or 0, category_id=row["category_id"] or "",
        tags=json.loads(row["tags"] or "[]"), topics=json.loads(row["topics"] or "[]"),
        language=row["language"] or "", view_count=row["view_count"] or 0,
        like_count=row["like_count"] or 0, availability=row["availability"],
    )


def _playlist_from_row(row: sqlite3.Row) -> Playlist:
    return Playlist(
        playlist_id=row["playlist_id"], title=row["title"] or "",
        description=row["description"] or "", privacy=row["privacy"] or "private",
        item_count=row["item_count"] or 0, kind=row["kind"], synced_at=row["synced_at"],
    )


def _item_from_row(row: sqlite3.Row) -> PlaylistItem:
    return PlaylistItem(
        item_id=row["item_id"], playlist_id=row["playlist_id"], video_id=row["video_id"],
        position=row["position"] or 0, title_snapshot=row["title_snapshot"] or "",
        privacy_status=row["privacy_status"] or "", added_at=row["added_at"],
    )
