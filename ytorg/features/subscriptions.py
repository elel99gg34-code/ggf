"""구독 채널 정리.

유튜브 추천 알고리즘을 직접 조작하는 API는 없다(시청 기록도, '관심 없음'
피드백도 비공개다). 그래서 이 앱이 알고리즘에 영향을 주는 유일한 정당한
수단이 구독 목록 정리다 — 안 보는 채널을 끊으면 추천이 실제로 바뀐다.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..core.models import Channel, parse_ts, now_utc
from ..jobs.queue import JobPlan

# 탐지 사유
DORMANT = "dormant"
GONE = "gone"
RENAMED = "renamed"
UNUSED = "unused"

REASON_LABELS = {
    DORMANT: "오래 안 올라옴",
    GONE: "채널 사라짐",
    RENAMED: "이름 바뀜",
    UNUSED: "내 재생목록에 없음",
}


@dataclass
class Candidate:
    """정리 후보 채널과 그 근거."""

    channel: Channel
    reasons: list[str]
    detail: str = ""

    @property
    def primary(self) -> str:
        return self.reasons[0] if self.reasons else ""


def find_candidates(db, dormant_months: int = 12,
                    include_unused: bool = False) -> list[Candidate]:
    """정리할 만한 채널을 찾는다. 로컬 캐시만 보므로 0유닛이다.

    include_unused는 '내 재생목록에 이 채널 영상이 하나도 없다'는 대리 지표다.
    시청 기록 API가 없어서 쓰는 우회책이라 오탐이 있을 수 있고, 그래서 기본은
    꺼져 있다.
    """
    channels = db.channels("active") + db.channels("gone")
    playlist_channels = _channels_in_playlists(db)
    cutoff_days = dormant_months * 30
    candidates: list[Candidate] = []

    for channel in channels:
        reasons: list[str] = []
        details: list[str] = []

        if channel.status == "gone":
            reasons.append(GONE)
            details.append("구독 목록에서 사라짐 (폐쇄되었거나 이미 구독 취소됨)")

        days = channel.days_since_upload
        if days is not None and days > cutoff_days:
            reasons.append(DORMANT)
            details.append(f"마지막 업로드 {days // 30}개월 전")
        elif channel.upload_scanned_at and channel.last_upload_at is None:
            reasons.append(DORMANT)
            details.append("공개된 영상이 없음")

        if channel.previous_title:
            reasons.append(RENAMED)
            details.append(f"'{channel.previous_title}' → '{channel.title}'")

        if include_unused and channel.channel_id not in playlist_channels:
            reasons.append(UNUSED)
            details.append("내 재생목록에 이 채널 영상이 없음")

        if reasons:
            candidates.append(Candidate(channel, reasons, " · ".join(details)))

    # 사라진 채널 먼저, 그다음 오래된 순
    candidates.sort(key=lambda c: (
        GONE not in c.reasons,
        -(c.channel.days_since_upload or 0),
    ))
    return candidates


def _channels_in_playlists(db) -> set[str]:
    rows = db.query(
        "SELECT DISTINCT v.channel_id FROM videos v "
        "JOIN playlist_items i ON i.video_id = v.video_id "
        "WHERE v.channel_id != ''"
    )
    return {r["channel_id"] for r in rows}


def plan_unsubscribe(candidates: list[Candidate]) -> JobPlan:
    """선택한 채널들의 구독을 끊는 계획. 채널당 50유닛."""
    plan = JobPlan(kind="unsubscribe", title="구독 정리")

    for candidate in candidates:
        channel = candidate.channel
        if channel.status == "gone":
            # 이미 구독이 끊긴 상태다. API를 부를 이유가 없다.
            plan.rows.append((channel.title, "건너뜀", "이미 구독 목록에 없음"))
            continue
        if not channel.subscription_id:
            plan.warnings.append(
                f"'{channel.title}'은 구독 ID를 모르겠어 — 동기화를 한 번 더 해줘"
            )
            continue

        plan.add("unsubscribe", {
            "subscription_id": channel.subscription_id,
            "channel_id": channel.channel_id,
            "channel_title": channel.title,
        })
        plan.rows.append((
            channel.title, "구독 취소",
            REASON_LABELS.get(candidate.primary, candidate.primary),
        ))

    if plan.ops:
        plan.warnings.append(
            "되돌리기는 가능하지만, 다시 구독해도 원래 구독 날짜는 복원되지 않아."
        )
    return plan
