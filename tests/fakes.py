"""googleapiclient 서비스 객체를 흉내내는 가짜 유튜브.

진짜 API 대신 이걸 YouTubeAPI에 꽂으면 래퍼·동기화·작업 큐·되돌리기가
실제 호출 경로 그대로 돌아간다. 덕분에 할당량 원장도 진짜로 채워지므로
"이 작업이 몇 유닛을 먹는가"를 테스트로 고정할 수 있다.

체이닝 형태(service.playlistItems().list(...).execute())까지 그대로 흉내낸다.
"""

from __future__ import annotations

import itertools
import json


class FakeHttpError(Exception):
    """googleapiclient.errors.HttpError의 최소 재현."""

    def __init__(self, status: int, reason: str, message: str = ""):
        super().__init__(message or f"HTTP {status}: {reason}")
        self.resp = type("Resp", (), {"status": status})()
        self.content = json.dumps(
            {"error": {"code": status, "errors": [{"reason": reason}], "message": message}}
        ).encode()
        self.error_details = [{"reason": reason}]


class _Request:
    def __init__(self, fn, params):
        self._fn = fn
        self._params = params

    def execute(self):
        return self._fn(**self._params)


class _Resource:
    def __init__(self, **handlers):
        self._handlers = handlers

    def __getattr__(self, name):
        if name not in self._handlers:
            raise AttributeError(name)
        handler = self._handlers[name]
        return lambda **params: _Request(handler, params)


def _paginate(items: list, max_results: int, page_token: str | None) -> dict:
    start = int(page_token) if page_token else 0
    end = start + max_results
    page = items[start:end]
    result = {"items": page, "pageInfo": {"totalResults": len(items)}}
    if end < len(items):
        result["nextPageToken"] = str(end)
    return result


class FakeYouTube:
    """조작 가능한 유튜브 계정 상태."""

    def __init__(self):
        self.sub_rows: dict[str, dict] = {}       # subscription_id -> {channel_id, title, at}
        self.channel_rows: dict[str, dict] = {}   # channel_id -> {...}
        self.playlist_rows: dict[str, dict] = {}  # playlist_id -> {title, privacy, items:[item_id]}
        self.item_rows: dict[str, dict] = {}      # item_id -> {playlist_id, video_id, position}
        self.video_rows: dict[str, dict] = {}     # video_id -> {...}
        self.my_channel_id = "UC_ME"
        self.likes_playlist_id = "LL_ME"

        self.calls: list[str] = []            # 호출된 메서드 기록
        self.fail_once: dict[str, tuple[int, str]] = {}  # 메서드 -> (status, reason)
        self.fail_always: dict[str, tuple[int, str]] = {}

        self._ids = itertools.count(1)
        self.playlist_rows[self.likes_playlist_id] = {
            "title": "Liked videos", "privacy": "private", "items": [], "system": True,
        }

    # ---- 상태 조작 (테스트가 계정을 꾸밀 때) ------------------------------

    def add_channel(self, channel_id: str, title: str, uploads: list[str] | None = None,
                    subscribed: bool = True, subscriber_count: int = 1000) -> str:
        uploads_pl = f"UU{channel_id[2:]}"
        self.channel_rows[channel_id] = {
            "title": title, "uploads": uploads_pl,
            "video_count": len(uploads or []), "subscriber_count": subscriber_count,
        }
        self.playlist_rows[uploads_pl] = {
            "title": f"Uploads of {title}", "privacy": "public",
            "items": [], "system": True, "is_uploads": True,
        }
        for vid in uploads or []:
            self._attach(uploads_pl, vid)
        if subscribed:
            sub_id = f"SUB{next(self._ids)}"
            self.sub_rows[sub_id] = {
                "channel_id": channel_id, "title": title,
                "at": "2020-01-01T00:00:00Z",
            }
            return sub_id
        return ""

    def add_video(self, video_id: str, title: str, channel_id: str = "UC1",
                  duration: str = "PT10M", published: str = "2024-01-01T00:00:00Z",
                  tags: list[str] | None = None, category: str = "22",
                  description: str = "") -> None:
        self.video_rows[video_id] = {
            "title": title, "channel_id": channel_id, "duration": duration,
            "published": published, "tags": tags or [], "category": category,
            "description": description,
            "channel_title": self.channel_rows.get(channel_id, {}).get("title", "Unknown"),
        }

    def add_playlist(self, playlist_id: str, title: str, videos: list[str] | None = None,
                     privacy: str = "private") -> None:
        self.playlist_rows[playlist_id] = {"title": title, "privacy": privacy, "items": []}
        for vid in videos or []:
            self._attach(playlist_id, vid)

    def like(self, *video_ids: str) -> None:
        for vid in video_ids:
            self._attach(self.likes_playlist_id, vid)

    def _attach(self, playlist_id: str, video_id: str, position: int | None = None) -> str:
        item_id = f"ITEM{next(self._ids)}"
        playlist = self.playlist_rows[playlist_id]
        if position is None or position >= len(playlist["items"]):
            playlist["items"].append(item_id)
        else:
            playlist["items"].insert(position, item_id)
        self.item_rows[item_id] = {"playlist_id": playlist_id, "video_id": video_id}
        return item_id

    def playlist_video_ids(self, playlist_id: str) -> list[str]:
        return [self.item_rows[i]["video_id"] for i in self.playlist_rows[playlist_id]["items"]]

    # ---- 오류 주입 ------------------------------------------------------

    def _maybe_fail(self, method: str) -> None:
        self.calls.append(method)
        if method in self.fail_always:
            status, reason = self.fail_always[method]
            raise FakeHttpError(status, reason)
        if method in self.fail_once:
            status, reason = self.fail_once.pop(method)
            raise FakeHttpError(status, reason)

    def call_count(self, method: str) -> int:
        return sum(1 for c in self.calls if c == method)

    # ---- 리소스 ---------------------------------------------------------

    def subscriptions(self):
        return _Resource(list=self._subs_list, delete=self._subs_delete,
                         insert=self._subs_insert)

    def channels(self):
        return _Resource(list=self._channels_list)

    def playlists(self):
        return _Resource(list=self._playlists_list, insert=self._playlists_insert,
                         delete=self._playlists_delete)

    def playlistItems(self):  # noqa: N802 - 실제 API 이름을 따른다
        return _Resource(list=self._items_list, insert=self._items_insert,
                         delete=self._items_delete, update=self._items_update)

    def videos(self):
        return _Resource(list=self._videos_list)

    # ---- 구현 -----------------------------------------------------------

    def _subs_list(self, part=None, mine=None, order=None, maxResults=50,  # noqa: N803
                   pageToken=None):  # noqa: N803
        self._maybe_fail("subscriptions.list")
        items = [
            {
                "id": sub_id,
                "snippet": {
                    "title": data["title"],
                    "description": "",
                    "publishedAt": data["at"],
                    "resourceId": {"kind": "youtube#channel", "channelId": data["channel_id"]},
                    "thumbnails": {"default": {"url": "http://x/t.jpg"}},
                },
            }
            for sub_id, data in sorted(self.sub_rows.items())
        ]
        return _paginate(items, maxResults, pageToken)

    def _subs_delete(self, id=None):  # noqa: A002
        self._maybe_fail("subscriptions.delete")
        if id not in self.sub_rows:
            raise FakeHttpError(404, "subscriptionNotFound")
        del self.sub_rows[id]
        return ""

    def _subs_insert(self, part=None, body=None):
        self._maybe_fail("subscriptions.insert")
        channel_id = body["snippet"]["resourceId"]["channelId"]
        sub_id = f"SUB{next(self._ids)}"
        self.sub_rows[sub_id] = {
            "channel_id": channel_id,
            "title": self.channel_rows.get(channel_id, {}).get("title", "Unknown"),
            "at": "2026-01-01T00:00:00Z",
        }
        return {"id": sub_id, "snippet": body["snippet"]}

    def _channels_list(self, part=None, id=None, mine=None, maxResults=50,  # noqa: A002,N803
                       pageToken=None):  # noqa: N803
        self._maybe_fail("channels.list")
        if mine:
            return {"items": [{
                "id": self.my_channel_id,
                "snippet": {"title": "My Channel"},
                "contentDetails": {"relatedPlaylists": {
                    "likes": self.likes_playlist_id,
                    "uploads": "UU_ME",
                }},
            }]}
        wanted = (id or "").split(",")
        items = []
        for cid in wanted:
            data = self.channel_rows.get(cid)
            if not data:
                continue
            items.append({
                "id": cid,
                "snippet": {"title": data["title"], "description": ""},
                "contentDetails": {"relatedPlaylists": {"uploads": data["uploads"]}},
                "statistics": {
                    "videoCount": str(data["video_count"]),
                    "subscriberCount": str(data["subscriber_count"]),
                },
            })
        return {"items": items}

    def _playlists_list(self, part=None, mine=None, id=None, maxResults=50,  # noqa: A002,N803
                        pageToken=None):  # noqa: N803
        self._maybe_fail("playlists.list")
        items = [
            {
                "id": pid,
                "snippet": {"title": data["title"], "description": ""},
                "status": {"privacyStatus": data["privacy"]},
                "contentDetails": {"itemCount": len(data["items"])},
            }
            for pid, data in sorted(self.playlist_rows.items())
            if not data.get("system")
        ]
        return _paginate(items, maxResults, pageToken)

    def _playlists_insert(self, part=None, body=None):
        self._maybe_fail("playlists.insert")
        pid = f"PL{next(self._ids)}"
        self.playlist_rows[pid] = {
            "title": body["snippet"]["title"],
            "privacy": body.get("status", {}).get("privacyStatus", "private"),
            "items": [],
        }
        return {"id": pid, "snippet": body["snippet"],
                "status": body.get("status", {"privacyStatus": "private"})}

    def _playlists_delete(self, id=None):  # noqa: A002
        self._maybe_fail("playlists.delete")
        if id not in self.playlist_rows:
            raise FakeHttpError(404, "playlistNotFound")
        for item_id in self.playlist_rows[id]["items"]:
            self.item_rows.pop(item_id, None)
        del self.playlist_rows[id]
        return ""

    def _items_list(self, part=None, playlistId=None, maxResults=50,  # noqa: N803
                    pageToken=None):  # noqa: N803
        self._maybe_fail("playlistItems.list")
        playlist = self.playlist_rows.get(playlistId)
        if playlist is None:
            raise FakeHttpError(404, "playlistNotFound")
        item_ids = list(playlist["items"])
        if playlist.get("is_uploads"):
            # 실제 유튜브의 업로드 재생목록은 최신 영상이 맨 앞이다.
            # latest_upload()가 maxResults=1로 최신 영상을 얻는 전제가 여기에 달려 있다.
            item_ids.sort(
                key=lambda i: self.video_rows.get(
                    self.item_rows[i]["video_id"], {}).get("published", ""),
                reverse=True,
            )

        items = []
        for position, item_id in enumerate(item_ids):
            entry = self.item_rows[item_id]
            video = self.video_rows.get(entry["video_id"])
            # 계정에서 사라진 영상은 유튜브가 자리표시자를 내려준다.
            title = video["title"] if video else "Deleted video"
            privacy = "public" if video else "private"
            items.append({
                "id": item_id,
                "snippet": {
                    "playlistId": playlistId,
                    "title": title,
                    "position": position,
                    "publishedAt": video["published"] if video else "2024-06-01T00:00:00Z",
                    "resourceId": {"kind": "youtube#video", "videoId": entry["video_id"]},
                },
                "status": {"privacyStatus": privacy},
            })
        return _paginate(items, maxResults, pageToken)

    def _items_insert(self, part=None, body=None):
        self._maybe_fail("playlistItems.insert")
        snippet = body["snippet"]
        pid = snippet["playlistId"]
        if pid not in self.playlist_rows:
            raise FakeHttpError(404, "playlistNotFound")
        item_id = self._attach(pid, snippet["resourceId"]["videoId"],
                               snippet.get("position"))
        return {"id": item_id, "snippet": snippet}

    def _items_delete(self, id=None):  # noqa: A002
        self._maybe_fail("playlistItems.delete")
        entry = self.item_rows.pop(id, None)
        if entry is None:
            raise FakeHttpError(404, "playlistItemNotFound")
        self.playlist_rows[entry["playlist_id"]]["items"].remove(id)
        return ""

    def _items_update(self, part=None, body=None):
        self._maybe_fail("playlistItems.update")
        item_id = body["id"]
        snippet = body["snippet"]
        entry = self.item_rows.get(item_id)
        if entry is None:
            raise FakeHttpError(404, "playlistItemNotFound")
        playlist = self.playlist_rows[entry["playlist_id"]]
        playlist["items"].remove(item_id)
        playlist["items"].insert(min(snippet["position"], len(playlist["items"])), item_id)
        return {"id": item_id, "snippet": snippet}

    def _videos_list(self, part=None, id=None, maxResults=50, pageToken=None):  # noqa: A002,N803
        self._maybe_fail("videos.list")
        items = []
        for vid in (id or "").split(","):
            data = self.video_rows.get(vid)
            if not data:
                continue  # 삭제된 영상은 응답에서 그냥 빠진다
            items.append({
                "id": vid,
                "snippet": {
                    "title": data["title"],
                    "channelId": data["channel_id"],
                    "channelTitle": data["channel_title"],
                    "description": data["description"],
                    "publishedAt": data["published"],
                    "categoryId": data["category"],
                    "tags": data["tags"],
                    "defaultAudioLanguage": "ko",
                },
                "contentDetails": {"duration": data["duration"]},
                "statistics": {"viewCount": "1000", "likeCount": "10"},
                "topicDetails": {"topicCategories": [
                    "https://en.wikipedia.org/wiki/Music"
                ]},
            })
        return {"items": items}
