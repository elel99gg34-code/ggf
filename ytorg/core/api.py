"""YouTube Data API 래퍼.

모든 API 호출은 예외 없이 이 클래스를 통과한다. 그래야
(1) 원장에 빠짐없이 기록되고, (2) 재시도·속도제한이 일관되게 적용되고,
(3) quotaExceeded가 '실패'가 아니라 '일시정지'로 번역된다.

호출부가 googleapiclient를 직접 만지지 않게 하는 이유이기도 하다 — 덕분에
테스트에서 이 클래스만 가짜로 바꾸면 전체 로직을 검증할 수 있다.
"""

from __future__ import annotations

import json
import logging
import random
import time
from typing import Any, Callable, Iterator

from .quota import QuotaExceeded, QuotaLedger

log = logging.getLogger(__name__)

API_SERVICE = "youtube"
API_VERSION = "v3"

# 한 번에 받을 수 있는 최대치. 페이지를 크게 받을수록 유닛당 효율이 좋다
# (어차피 페이지당 1유닛이므로 50개씩 받는 게 5개씩 받는 것보다 10배 싸다).
MAX_RESULTS = 50

MAX_ATTEMPTS = 5
BASE_BACKOFF = 1.0

# 할당량 소진을 뜻하는 사유들. 이건 재시도해봐야 소용없다.
QUOTA_REASONS = {"quotaExceeded", "dailyLimitExceeded"}
# 잠깐 기다리면 풀리는 사유들.
RETRY_REASONS = {
    "rateLimitExceeded",
    "userRateLimitExceeded",
    "backendError",
    "internalError",
    "transientError",
    "SERVICE_UNAVAILABLE",
}


class ApiError(Exception):
    """재시도로 해결되지 않는 API 오류."""

    def __init__(self, message: str, status: int = 0, reason: str = ""):
        super().__init__(message)
        self.status = status
        self.reason = reason


class NotFound(ApiError):
    """대상이 이미 없음. 삭제 작업에서는 성공으로 쳐도 되는 경우가 많다."""


def _error_reasons(exc) -> set[str]:
    """HttpError에서 사유 문자열을 최대한 뽑아낸다.

    google 클라이언트 버전마다 error_details가 있기도 없기도 해서
    본문 JSON 파싱까지 이중으로 시도한다.
    """
    reasons: set[str] = set()
    for detail in getattr(exc, "error_details", None) or []:
        if isinstance(detail, dict) and detail.get("reason"):
            reasons.add(detail["reason"])
        elif isinstance(detail, str):
            reasons.add(detail)
    content = getattr(exc, "content", None)
    if content:
        try:
            body = json.loads(content.decode() if isinstance(content, bytes) else content)
            for item in body.get("error", {}).get("errors", []) or []:
                if item.get("reason"):
                    reasons.add(item["reason"])
            status = body.get("error", {}).get("status")
            if status:
                reasons.add(status)
        except (ValueError, AttributeError):
            pass
    return reasons


def _status_of(exc) -> int:
    resp = getattr(exc, "resp", None)
    return int(getattr(resp, "status", 0) or 0)


class YouTubeAPI:
    def __init__(self, service, ledger: QuotaLedger, rate_limit_per_sec: float = 2.0):
        """rate_limit_per_sec: 유튜브의 비공식 스팸 필터를 피하기 위한 자체 제한.

        할당량과는 별개다. 짧은 시간에 재생목록을 수십 개 만들면 할당량이
        남아 있어도 계정에 제동이 걸릴 수 있다. 0을 주면 제한 없음(테스트용).
        """
        self.service = service
        self.ledger = ledger
        self._min_interval = (1.0 / rate_limit_per_sec) if rate_limit_per_sec > 0 else 0.0
        self._last_call = 0.0
        self._sleep = time.sleep

    # ---- 저수준 호출 ----------------------------------------------------

    def _throttle(self) -> None:
        if self._min_interval <= 0:
            return
        gap = time.monotonic() - self._last_call
        if gap < self._min_interval:
            self._sleep(self._min_interval - gap)
        self._last_call = time.monotonic()

    def call(self, method: str, request_factory: Callable[[], Any],
             job_id: int | None = None, use_reserve: bool = False,
             tolerate_missing: bool = False) -> dict:
        """API를 한 번 호출한다.

        method는 'playlistItems.insert' 같은 비용 조회용 이름이고,
        request_factory는 googleapiclient 요청 객체를 만드는 콜러블이다.
        (재시도 때 요청 객체를 새로 만들어야 해서 팩토리로 받는다.)
        """
        self.ledger.check(method, 1, use_reserve=use_reserve)

        last_exc: Exception | None = None
        for attempt in range(1, MAX_ATTEMPTS + 1):
            self._throttle()
            # 호출 '전에' 기록한다. 여기서 프로세스가 죽어도 소모분이 남아야
            # 다음 실행이 할당량을 넘기지 않는다.
            self.ledger.record(method, 1, job_id=job_id)
            try:
                return request_factory().execute() or {}
            except Exception as exc:  # noqa: BLE001 - HttpError 외 전송 오류도 잡는다
                last_exc = exc
                status = _status_of(exc)
                reasons = _error_reasons(exc)

                if reasons & QUOTA_REASONS:
                    self.ledger.mark_exhausted(reason=f"{method}: {','.join(sorted(reasons))}")
                    raise QuotaExceeded(
                        "할당량을 다 썼어. 태평양시 자정에 리셋되면 이어서 할게.",
                        server_reported=True,
                    ) from exc

                if status == 404:
                    if tolerate_missing:
                        return {}
                    raise NotFound(f"{method}: 대상을 찾을 수 없어", status, "notFound") from exc

                retryable = status in (500, 502, 503, 504) or bool(reasons & RETRY_REASONS)
                if not retryable or attempt == MAX_ATTEMPTS:
                    raise ApiError(
                        f"{method} 실패 (HTTP {status}): {exc}",
                        status,
                        ",".join(sorted(reasons)),
                    ) from exc

                # 지수 백오프 + 지터. 여러 작업이 동시에 재시도하며 겹치는 걸 막는다.
                delay = BASE_BACKOFF * (2 ** (attempt - 1)) + random.uniform(0, 0.5)
                log.warning("%s 재시도 %d/%d (%.1fs 대기): %s",
                            method, attempt, MAX_ATTEMPTS, delay, reasons or status)
                self._sleep(delay)

        raise ApiError(f"{method} 실패: {last_exc}")

    def paginate(self, method: str, resource_name: str, job_id: int | None = None,
                 use_reserve: bool = True, max_pages: int = 200,
                 **params) -> Iterator[dict]:
        """list 계열을 전 페이지 순회한다. 페이지마다 1유닛.

        max_pages는 안전장치다. 재생목록 상한이 5,000개이므로 50개씩 100페이지면
        충분하고, 그보다 많이 돌면 무언가 잘못된 것이다.
        """
        resource = getattr(self.service, resource_name)()
        params.setdefault("maxResults", MAX_RESULTS)
        page_token = None
        pages = 0

        while pages < max_pages:
            call_params = dict(params)
            if page_token:
                call_params["pageToken"] = page_token

            response = self.call(
                method,
                lambda p=call_params: resource.list(**p),
                job_id=job_id,
                use_reserve=use_reserve,
            )
            for item in response.get("items", []) or []:
                yield item

            page_token = response.get("nextPageToken")
            pages += 1
            if not page_token:
                return

        log.warning("%s 페이지 상한(%d) 도달 — 결과가 잘렸을 수 있어", method, max_pages)

    # ---- 읽기 -----------------------------------------------------------

    def my_subscriptions(self) -> Iterator[dict]:
        yield from self.paginate(
            "subscriptions.list", "subscriptions",
            part="snippet", mine=True, order="alphabetical",
        )

    def my_playlists(self) -> Iterator[dict]:
        yield from self.paginate(
            "playlists.list", "playlists",
            part="snippet,status,contentDetails", mine=True,
        )

    def playlist_items(self, playlist_id: str, job_id: int | None = None) -> Iterator[dict]:
        yield from self.paginate(
            "playlistItems.list", "playlistItems", job_id=job_id,
            part="snippet,status,contentDetails", playlistId=playlist_id,
        )

    def my_channel(self) -> dict:
        """내 채널. relatedPlaylists로 '좋아요 표시한 동영상' 목록 ID를 얻는다."""
        response = self.call(
            "channels.list",
            lambda: self.service.channels().list(part="contentDetails,snippet", mine=True),
            use_reserve=True,
        )
        items = response.get("items", []) or []
        return items[0] if items else {}

    def channels_details(self, channel_ids: list[str],
                         job_id: int | None = None) -> Iterator[dict]:
        """채널 상세를 50개씩 묶어 조회한다. 50개에 1유닛이라 매우 싸다."""
        for i in range(0, len(channel_ids), MAX_RESULTS):
            chunk = channel_ids[i:i + MAX_RESULTS]
            response = self.call(
                "channels.list",
                lambda c=chunk: self.service.channels().list(
                    part="snippet,contentDetails,statistics", id=",".join(c),
                    maxResults=MAX_RESULTS,
                ),
                job_id=job_id, use_reserve=True,
            )
            yield from response.get("items", []) or []

    def videos_details(self, video_ids: list[str],
                       job_id: int | None = None) -> Iterator[dict]:
        """영상 메타를 50개씩 묶어 조회. 1,000개에 20유닛."""
        for i in range(0, len(video_ids), MAX_RESULTS):
            chunk = video_ids[i:i + MAX_RESULTS]
            response = self.call(
                "videos.list",
                lambda c=chunk: self.service.videos().list(
                    part="snippet,contentDetails,statistics,topicDetails",
                    id=",".join(c), maxResults=MAX_RESULTS,
                ),
                job_id=job_id, use_reserve=True,
            )
            yield from response.get("items", []) or []

    def latest_upload(self, uploads_playlist_id: str,
                      job_id: int | None = None) -> dict | None:
        """채널의 최신 업로드 1건. 채널당 1유닛이라 구독 정리의 주요 비용원이다."""
        try:
            response = self.call(
                "playlistItems.list",
                lambda: self.service.playlistItems().list(
                    part="snippet", playlistId=uploads_playlist_id, maxResults=1,
                ),
                job_id=job_id, use_reserve=True, tolerate_missing=True,
            )
        except ApiError as exc:
            # 폐쇄되거나 영상이 0개인 채널은 403/404가 난다. 정상 상황이다.
            log.debug("최신 업로드 조회 실패 %s: %s", uploads_playlist_id, exc)
            return None
        items = response.get("items", []) or []
        return items[0] if items else None

    # ---- 쓰기 (각 50유닛) -------------------------------------------------

    def unsubscribe(self, subscription_id: str, job_id: int | None = None) -> None:
        self.call(
            "subscriptions.delete",
            lambda: self.service.subscriptions().delete(id=subscription_id),
            job_id=job_id, tolerate_missing=True,
        )

    def subscribe(self, channel_id: str, job_id: int | None = None) -> dict:
        return self.call(
            "subscriptions.insert",
            lambda: self.service.subscriptions().insert(
                part="snippet",
                body={"snippet": {"resourceId": {"kind": "youtube#channel",
                                                 "channelId": channel_id}}},
            ),
            job_id=job_id,
        )

    def create_playlist(self, title: str, description: str = "",
                        privacy: str = "private", job_id: int | None = None) -> dict:
        return self.call(
            "playlists.insert",
            lambda: self.service.playlists().insert(
                part="snippet,status",
                body={
                    "snippet": {"title": title[:150], "description": description[:5000]},
                    "status": {"privacyStatus": privacy},
                },
            ),
            job_id=job_id,
        )

    def delete_playlist(self, playlist_id: str, job_id: int | None = None) -> None:
        self.call(
            "playlists.delete",
            lambda: self.service.playlists().delete(id=playlist_id),
            job_id=job_id, tolerate_missing=True,
        )

    def add_to_playlist(self, playlist_id: str, video_id: str,
                        position: int | None = None, job_id: int | None = None) -> dict:
        snippet: dict = {
            "playlistId": playlist_id,
            "resourceId": {"kind": "youtube#video", "videoId": video_id},
        }
        if position is not None:
            snippet["position"] = position
        return self.call(
            "playlistItems.insert",
            lambda: self.service.playlistItems().insert(
                part="snippet", body={"snippet": snippet}
            ),
            job_id=job_id,
        )

    def remove_playlist_item(self, item_id: str, job_id: int | None = None) -> None:
        self.call(
            "playlistItems.delete",
            lambda: self.service.playlistItems().delete(id=item_id),
            job_id=job_id, tolerate_missing=True,
        )

    def move_playlist_item(self, item_id: str, playlist_id: str, video_id: str,
                           position: int, job_id: int | None = None) -> dict:
        """항목 순서 변경. 항목 하나당 50유닛이라 대량 정렬은 아주 비싸다."""
        return self.call(
            "playlistItems.update",
            lambda: self.service.playlistItems().update(
                part="snippet",
                body={
                    "id": item_id,
                    "snippet": {
                        "playlistId": playlist_id,
                        "resourceId": {"kind": "youtube#video", "videoId": video_id},
                        "position": position,
                    },
                },
            ),
            job_id=job_id,
        )


def build_service(credentials):
    """인증된 API 서비스 객체를 만든다."""
    from googleapiclient.discovery import build

    return build(
        API_SERVICE, API_VERSION, credentials=credentials,
        cache_discovery=False,  # 파일 캐시 경고를 없애고 exe 환경에서 안정적
    )
