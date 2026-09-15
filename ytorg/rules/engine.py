"""규칙 기반 분류.

AI 없이도 쓸 수 있어야 하므로 이쪽이 기본 엔진이다. 채널·키워드·길이·
카테고리 같은, 유튜브가 이미 주는 메타데이터만으로 판정한다.

매칭 방식은 '우선순위 순으로 평가해 첫 규칙이 이긴다'. 점수 합산 방식보다
결과를 예측하기 쉽고, 사용자가 "왜 이게 여기 들어갔지?"를 한 줄로 설명받을
수 있다(이유를 함께 돌려준다).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..core.models import Video, parse_ts, now_utc

# 유튜브 카테고리 ID. 규칙에서 숫자 대신 이름을 쓸 수 있게 한다.
CATEGORIES = {
    "1": "영화/애니메이션", "2": "자동차", "10": "음악", "15": "동물",
    "17": "스포츠", "19": "여행", "20": "게임", "22": "인물/블로그",
    "23": "코미디", "24": "엔터테인먼트", "25": "뉴스/정치",
    "26": "노하우/스타일", "27": "교육", "28": "과학기술",
}


@dataclass
class Rule:
    """영상 하나를 재생목록 하나로 보내는 조건.

    여러 조건을 적으면 AND가 아니라 OR다 — 키워드든 카테고리든 하나만 맞으면
    걸린다. 단 duration 조건만은 항상 AND로 적용되는 필터다(예: "음악인데
    10분 이하").
    """

    playlist: str                                   # 보낼 재생목록 이름
    keywords: list[str] = field(default_factory=list)       # 제목·태그에서 찾을 말
    channels: list[str] = field(default_factory=list)       # 채널명 (부분 일치)
    channel_ids: list[str] = field(default_factory=list)    # 채널 ID (정확 일치)
    categories: list[str] = field(default_factory=list)     # 카테고리 ID
    title_regex: str = ""
    min_duration: int = 0                           # 초
    max_duration: int = 0                           # 0 = 제한 없음
    newer_than_days: int = 0                        # 0 = 제한 없음
    priority: int = 100                             # 낮을수록 먼저 평가
    enabled: bool = True

    def __post_init__(self):
        self._regex = re.compile(self.title_regex, re.IGNORECASE) if self.title_regex else None
        self._keywords = [k.lower() for k in self.keywords]
        self._channels = [c.lower() for c in self.channels]

    def matches(self, video: Video) -> str:
        """맞으면 이유 문자열, 아니면 빈 문자열."""
        if not self.enabled:
            return ""

        # 길이 필터는 먼저, 그리고 AND로 적용된다.
        if self.min_duration and video.duration_sec < self.min_duration:
            return ""
        if self.max_duration and video.duration_sec > self.max_duration:
            return ""
        if self.newer_than_days:
            published = parse_ts(video.published_at)
            if not published or (now_utc() - published).days > self.newer_than_days:
                return ""

        if self.channel_ids and video.channel_id in self.channel_ids:
            return f"채널: {video.channel_title}"

        if self._channels:
            channel_lower = video.channel_title.lower()
            for name in self._channels:
                if name in channel_lower:
                    return f"채널: {video.channel_title}"

        if self.categories and video.category_id in self.categories:
            return f"카테고리: {CATEGORIES.get(video.category_id, video.category_id)}"

        if self._regex and self._regex.search(video.title):
            return f"제목 패턴: {self.title_regex}"

        if self._keywords:
            blob = video.text_blob().lower()
            for keyword in self._keywords:
                if keyword in blob:
                    return f"키워드: {keyword}"

        # 조건이 길이뿐인 규칙(예: 쇼츠 분리)은 여기까지 왔으면 통과다.
        if not any([self.keywords, self.channels, self.channel_ids,
                    self.categories, self.title_regex]):
            if self.min_duration or self.max_duration or self.newer_than_days:
                return "길이/날짜 조건"

        return ""


@dataclass
class Assignment:
    video_id: str
    playlist: str
    reason: str
    title: str = ""


@dataclass
class ClassificationResult:
    """분류 결과. 규칙 엔진과 AI 분류기가 똑같은 모양으로 돌려준다."""

    assignments: list[Assignment] = field(default_factory=list)
    unmatched: list[Video] = field(default_factory=list)
    source: str = "rules"
    notes: list[str] = field(default_factory=list)

    def by_playlist(self) -> dict[str, list[Assignment]]:
        groups: dict[str, list[Assignment]] = {}
        for item in self.assignments:
            groups.setdefault(item.playlist, []).append(item)
        return groups

    def summary(self) -> str:
        groups = self.by_playlist()
        if not groups:
            return "분류된 영상이 없어."
        top = sorted(groups.items(), key=lambda kv: -len(kv[1]))
        head = " · ".join(f"{name} {len(items)}개" for name, items in top[:5])
        extra = f" 외 {len(top) - 5}개 그룹" if len(top) > 5 else ""
        return f"{len(self.assignments)}개 영상 → {len(groups)}개 재생목록 ({head}{extra})"


class RuleEngine:
    def __init__(self, rules: list[Rule]):
        self.rules = sorted(rules, key=lambda r: r.priority)

    def classify_one(self, video: Video) -> Assignment | None:
        for rule in self.rules:
            reason = rule.matches(video)
            if reason:
                return Assignment(video.video_id, rule.playlist, reason, video.title)
        return None

    def classify(self, videos: list[Video],
                 min_group_size: int = 1) -> ClassificationResult:
        """영상들을 재생목록별로 나눈다. API를 부르지 않으므로 0유닛이다.

        min_group_size: 이보다 작은 그룹은 만들지 않는다. 영상 1개짜리
        재생목록이 수십 개 생기면 정리가 아니라 어지럽히는 것이므로.
        """
        result = ClassificationResult(source="rules")
        matched: list[Assignment] = []

        for video in videos:
            if video.availability != "available":
                continue
            assignment = self.classify_one(video)
            if assignment:
                matched.append(assignment)
            else:
                result.unmatched.append(video)

        if min_group_size > 1:
            counts: dict[str, int] = {}
            for item in matched:
                counts[item.playlist] = counts.get(item.playlist, 0) + 1
            kept, dropped = [], 0
            by_id = {v.video_id: v for v in videos}
            for item in matched:
                if counts[item.playlist] >= min_group_size:
                    kept.append(item)
                else:
                    dropped += 1
                    video = by_id.get(item.video_id)
                    if video:
                        result.unmatched.append(video)
            matched = kept
            if dropped:
                result.notes.append(
                    f"영상이 {min_group_size}개 미만인 그룹 {dropped}건은 만들지 않았어"
                )

        result.assignments = matched
        return result
