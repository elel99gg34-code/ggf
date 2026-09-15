"""기본 규칙 세트.

처음 켠 사람이 아무것도 설정하지 않아도 쓸 만한 분류가 나와야 한다.
한국어·영어 키워드를 함께 넣고, 유튜브 카테고리 ID를 주된 근거로 삼는다
(카테고리는 업로더가 지정한 값이라 키워드보다 오탐이 적다).

priority가 낮을수록 먼저 평가된다. 쇼츠 분리를 가장 앞에 두는 이유는,
쇼츠는 주제와 무관하게 따로 모으는 편이 실제로 쓸모 있기 때문이다.
"""

from __future__ import annotations

from .engine import Rule


def default_rules() -> list[Rule]:
    return [
        Rule(
            playlist="쇼츠 모음",
            max_duration=60,
            priority=10,
        ),
        Rule(
            playlist="음악",
            categories=["10"],
            keywords=["mv", "music video", "official audio", "커버", "cover",
                      "playlist", "플레이리스트", "노래"],
            priority=20,
        ),
        Rule(
            playlist="게임",
            categories=["20"],
            keywords=["게임", "gameplay", "플레이", "공략", "롤", "롤드컵",
                      "마인크래프트", "minecraft"],
            priority=30,
        ),
        Rule(
            playlist="요리·레시피",
            keywords=["레시피", "요리", "만들기", "recipe", "cooking", "먹방",
                      "베이킹", "김치", "찌개", "반찬"],
            priority=40,
        ),
        Rule(
            playlist="개발·프로그래밍",
            keywords=["python", "파이썬", "javascript", "코딩", "프로그래밍",
                      "개발", "알고리즘", "리액트", "react", "깃허브", "github",
                      "도커", "docker", "sql"],
            priority=50,
        ),
        Rule(
            playlist="강의·교육",
            categories=["27"],
            keywords=["강의", "강좌", "튜토리얼", "tutorial", "입문", "기초",
                      "배우기", "lecture", "course"],
            # 긴 영상만. 짧은 건 보통 요약이나 홍보다.
            min_duration=600,
            priority=60,
        ),
        Rule(
            playlist="과학·기술",
            categories=["28"],
            keywords=["ai", "인공지능", "머신러닝", "우주", "물리", "화학",
                      "리뷰", "언박싱"],
            priority=70,
        ),
        Rule(
            playlist="뉴스·시사",
            categories=["25"],
            keywords=["뉴스", "속보", "브리핑", "이슈"],
            priority=80,
        ),
        Rule(
            playlist="운동·건강",
            categories=["17"],
            keywords=["운동", "홈트", "헬스", "요가", "스트레칭", "다이어트",
                      "workout", "fitness"],
            priority=90,
        ),
        Rule(
            playlist="브이로그·일상",
            categories=["22"],
            keywords=["브이로그", "vlog", "일상", "데일리"],
            priority=100,
        ),
        Rule(
            playlist="여행",
            categories=["19"],
            keywords=["여행", "travel", "관광", "맛집투어"],
            priority=110,
        ),
        Rule(
            playlist="긴 영상 (1시간 이상)",
            min_duration=3600,
            priority=200,  # 다른 규칙이 다 빗나갔을 때만
        ),
    ]
