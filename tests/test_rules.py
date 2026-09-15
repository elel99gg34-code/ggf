"""규칙 엔진과 AI 분류기.

AI는 실제로 호출하지 않는다 — 돈이 들고 결과가 매번 다르기 때문에.
대신 '모델이 이상한 걸 돌려줬을 때 우리가 어떻게 막는지'를 검증한다.
"""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from ytorg.core.models import Video
from ytorg.rules.builtin import default_rules
from ytorg.rules.engine import Rule, RuleEngine
from ytorg.rules.schema import load_rules, save_rules


def v(vid, title, channel="채널", duration=600, category="24", tags=None, published=None):
    return Video(video_id=vid, title=title, channel_title=channel,
                 duration_sec=duration, category_id=category, tags=tags or [],
                 published_at=published)


# ---- 규칙 매칭 -----------------------------------------------------------

def test_priority_decides_when_two_rules_match():
    """쇼츠이면서 음악인 영상은 우선순위가 낮은(먼저 평가되는) 쪽으로 간다."""
    engine = RuleEngine([
        Rule(playlist="음악", categories=["10"], priority=20),
        Rule(playlist="쇼츠", max_duration=60, priority=10),
    ])
    result = engine.classify([v("a", "짧은 뮤비", duration=45, category="10")])

    assert result.assignments[0].playlist == "쇼츠"


def test_duration_filter_is_and_not_or():
    """길이 조건은 다른 조건과 AND로 묶인다.

    '교육 카테고리인데 10분 이상'이라는 규칙이 5분짜리 교육 영상을 잡으면 안 된다.
    """
    engine = RuleEngine([Rule(playlist="긴 강의", categories=["27"], min_duration=600)])

    long_result = engine.classify([v("a", "강의", duration=1200, category="27")])
    short_result = engine.classify([v("b", "강의 예고편", duration=120, category="27")])

    assert long_result.assignments[0].playlist == "긴 강의"
    assert short_result.assignments == []
    assert len(short_result.unmatched) == 1


def test_keyword_matches_tags_not_just_title():
    engine = RuleEngine([Rule(playlist="요리", keywords=["레시피"])])
    result = engine.classify([v("a", "오늘 저녁 뭐 먹지", tags=["레시피", "집밥"])])

    assert result.assignments[0].playlist == "요리"
    assert "레시피" in result.assignments[0].reason


def test_title_regex_rule():
    engine = RuleEngine([Rule(playlist="시리즈", title_regex=r"\d+화")])
    result = engine.classify([v("a", "드라마 12화 리뷰"), v("b", "그냥 영상")])

    assert len(result.assignments) == 1
    assert result.assignments[0].video_id == "a"


def test_unmatched_videos_are_reported_not_dumped_somewhere():
    """어디에도 안 맞는 영상은 '기타' 재생목록에 처박지 않고 미분류로 남긴다."""
    engine = RuleEngine([Rule(playlist="음악", categories=["10"])])
    result = engine.classify([v("a", "정체불명", category="24")])

    assert result.assignments == []
    assert [x.video_id for x in result.unmatched] == ["a"]


def test_min_group_size_prevents_one_video_playlists():
    engine = RuleEngine([
        Rule(playlist="음악", categories=["10"]),
        Rule(playlist="게임", categories=["20"]),
    ])
    videos = [v("a", "노래1", category="10"), v("b", "노래2", category="10"),
              v("c", "게임하나", category="20")]

    result = engine.classify(videos, min_group_size=2)

    assert set(result.by_playlist()) == {"음악"}
    assert [x.video_id for x in result.unmatched] == ["c"]
    assert "2개 미만" in result.notes[0]


def test_deleted_videos_are_skipped():
    engine = RuleEngine(default_rules())
    dead = v("a", "삭제된 영상")
    dead.availability = "deleted"

    result = engine.classify([dead])

    assert result.assignments == []
    assert result.unmatched == []  # 미분류도 아니고 아예 대상이 아니다


def test_builtin_rules_handle_a_realistic_mix():
    engine = RuleEngine(default_rules())
    videos = [
        v("a", "김치찌개 황금레시피", "요리왕", 720, "26"),
        v("b", "파이썬 기초 강의 1강", "코딩채널", 1800, "27"),
        v("c", "춤 챌린지", "댄서", 30, "24"),
        v("d", "신곡 MV 공개", "뮤직", 200, "10"),
        v("e", "홈트 20분 루틴", "헬스", 1200, "17"),
    ]

    result = engine.classify(videos)
    groups = result.by_playlist()

    assert groups["쇼츠 모음"][0].video_id == "c"
    assert groups["음악"][0].video_id == "d"
    assert groups["요리·레시피"][0].video_id == "a"
    assert groups["개발·프로그래밍"][0].video_id == "b"
    assert groups["운동·건강"][0].video_id == "e"


# ---- YAML ---------------------------------------------------------------

def test_rules_roundtrip_through_yaml(tmp_path):
    original = [Rule(playlist="내 규칙", keywords=["특정단어"], max_duration=300,
                     priority=5)]
    path = tmp_path / "rules.yaml"
    save_rules(original, path)

    loaded, warnings = load_rules(path)

    assert warnings == []
    assert loaded[0].playlist == "내 규칙"
    assert loaded[0].keywords == ["특정단어"]
    assert loaded[0].max_duration == 300


def test_broken_yaml_falls_back_to_defaults(tmp_path):
    path = tmp_path / "rules.yaml"
    path.write_text("rules: [[[", encoding="utf-8")

    loaded, warnings = load_rules(path)

    assert len(loaded) == len(default_rules())
    assert warnings and "기본 규칙" in warnings[0]


def test_unknown_keys_warn_but_do_not_crash(tmp_path):
    path = tmp_path / "rules.yaml"
    path.write_text(
        "rules:\n  - playlist: 테스트\n    keywords: [a]\n    오타항목: 1\n",
        encoding="utf-8",
    )

    loaded, warnings = load_rules(path)

    assert loaded[0].playlist == "테스트"
    assert any("오타항목" in w for w in warnings)


# ---- AI 분류기 (모킹) ----------------------------------------------------

@dataclass
class _FakeIdea:
    name: str
    description: str = ""


@dataclass
class _FakeAssign:
    video_id: str
    playlist: str


class _FakeParsed:
    def __init__(self, **kw):
        self.__dict__.update(kw)


@pytest.fixture
def ai(monkeypatch):
    from ytorg.ai.classifier import AiClassifier, AiSettings

    classifier = AiClassifier(AiSettings(min_group_size=1), api_key="test-key")
    monkeypatch.setattr(classifier, "_get_client", lambda: object())
    return classifier


def test_ai_drops_hallucinated_video_ids(ai, monkeypatch):
    """모델이 입력에 없던 영상 ID를 지어내면 버려야 한다."""
    videos = [v("real1", "진짜 영상"), v("real2", "또 다른 진짜")]

    def fake_call(client, system, user, schema, max_tokens, effort=None):
        if "재생목록을 제안" in user:
            return _FakeParsed(playlists=[_FakeIdea("주제A")])
        return _FakeParsed(assignments=[
            _FakeAssign("real1", "주제A"),
            _FakeAssign("존재하지않는ID", "주제A"),   # 환각
        ])

    monkeypatch.setattr(ai, "_call", fake_call)
    result = ai.classify(videos)

    assert [a.video_id for a in result.assignments] == ["real1"]
    assert [x.video_id for x in result.unmatched] == ["real2"]


def test_ai_drops_invented_playlist_names(ai, monkeypatch):
    """1단계에서 제안하지 않은 이름으로 배정하면 버린다."""
    videos = [v("a", "영상")]

    def fake_call(client, system, user, schema, max_tokens, effort=None):
        if "재생목록을 제안" in user:
            return _FakeParsed(playlists=[_FakeIdea("허용된이름")])
        return _FakeParsed(assignments=[_FakeAssign("a", "마음대로지은이름")])

    monkeypatch.setattr(ai, "_call", fake_call)
    result = ai.classify(videos)

    assert result.assignments == []


def test_ai_batch_failure_does_not_lose_other_batches(ai, monkeypatch):
    """배치 하나가 터져도 나머지 배정은 살아야 한다."""
    from ytorg.ai import classifier as mod

    monkeypatch.setattr(mod, "BATCH_SIZE", 2)
    videos = [v(f"v{i}", f"영상{i}") for i in range(4)]
    calls = {"n": 0}

    def fake_call(client, system, user, schema, max_tokens, effort=None):
        if "재생목록을 제안" in user:
            return _FakeParsed(playlists=[_FakeIdea("주제")])
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("일시적 오류")
        ids = [line.split("]")[0][1:] for line in user.splitlines() if line.startswith("[")]
        return _FakeParsed(assignments=[_FakeAssign(i, "주제") for i in ids])

    monkeypatch.setattr(ai, "_call", fake_call)
    result = ai.classify(videos)

    assert len(result.assignments) == 2   # 두 번째 배치만 성공
    assert len(result.unmatched) == 2


def test_ai_result_shape_matches_rule_engine(ai, monkeypatch):
    """두 엔진의 결과가 같은 모양이어야 UI와 작업 생성을 공유할 수 있다."""
    def fake_call(client, system, user, schema, max_tokens, effort=None):
        if "재생목록을 제안" in user:
            return _FakeParsed(playlists=[_FakeIdea("주제")])
        return _FakeParsed(assignments=[_FakeAssign("a", "주제")])

    monkeypatch.setattr(ai, "_call", fake_call)
    ai_result = ai.classify([v("a", "영상")])
    rule_result = RuleEngine([Rule(playlist="주제", keywords=["영상"])]).classify([v("a", "영상")])

    assert type(ai_result) is type(rule_result)
    assert ai_result.source == "ai" and rule_result.source == "rules"
    assert set(ai_result.by_playlist()) == set(rule_result.by_playlist())
