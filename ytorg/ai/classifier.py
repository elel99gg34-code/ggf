"""Claude API를 쓰는 분류기.

선택 기능이다. API 키가 없거나 anthropic 패키지가 없어도 앱은 정상 동작해야
하므로 import를 함수 안에서 한다.

실패하면 규칙 엔진으로 넘어간다. AI가 거부하거나, 키가 만료됐거나, 네트워크가
끊겨도 사용자는 여전히 분류를 할 수 있어야 한다.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from ..core.models import Video
from ..rules.engine import Assignment, ClassificationResult
from . import prompts

log = logging.getLogger(__name__)

# 기본 모델. 설정 화면에서 바꿀 수 있다.
DEFAULT_MODEL = "claude-opus-5"

# 1단계에 보낼 영상 수 상한. 전부 보낼 필요는 없고, 주제 분포만 보이면 된다.
SAMPLE_SIZE = 250
# 2단계 배치 크기. 크게 잡을수록 호출 수가 줄지만 출력이 잘릴 위험이 커진다.
BATCH_SIZE = 50

KEYRING_SERVICE = "YTOrganizer"
KEYRING_USER = "anthropic-api-key"


class AiUnavailable(Exception):
    """AI를 쓸 수 없음(키 없음, 패키지 없음, 네트워크 등). 규칙 엔진으로 폴백하라는 뜻."""


@dataclass
class AiSettings:
    model: str = DEFAULT_MODEL
    max_playlists: int = 12
    min_group_size: int = 3


# ---- API 키 -------------------------------------------------------------

def save_api_key(key: str) -> None:
    import keyring

    keyring.set_password(KEYRING_SERVICE, KEYRING_USER, key)


def load_api_key() -> str | None:
    """키링 → 환경변수 순으로 찾는다."""
    import os

    try:
        import keyring

        stored = keyring.get_password(KEYRING_SERVICE, KEYRING_USER)
        if stored:
            return stored
    except Exception as exc:  # noqa: BLE001 - 백엔드 없는 환경
        log.debug("키링에서 API 키를 못 읽음: %s", exc)
    return os.environ.get("ANTHROPIC_API_KEY")


def clear_api_key() -> None:
    try:
        import keyring

        keyring.delete_password(KEYRING_SERVICE, KEYRING_USER)
    except Exception:  # noqa: BLE001
        pass


def is_available() -> bool:
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return bool(load_api_key())


# ---- 응답 스키마 ---------------------------------------------------------

def _schemas():
    """pydantic 모델을 지연 생성한다(anthropic이 없을 때 import 실패를 피하려고)."""
    from pydantic import BaseModel, Field

    class PlaylistIdea(BaseModel):
        name: str = Field(description="재생목록 이름 (한국어, 짧고 구체적으로)")
        description: str = Field(description="어떤 영상이 들어가는지 한 줄 설명")

    class Proposal(BaseModel):
        playlists: list[PlaylistIdea]

    class VideoAssignment(BaseModel):
        video_id: str
        playlist: str

    class AssignmentBatch(BaseModel):
        assignments: list[VideoAssignment]

    return Proposal, AssignmentBatch


class AiClassifier:
    def __init__(self, settings: AiSettings | None = None, api_key: str | None = None):
        self.settings = settings or AiSettings()
        self._api_key = api_key or load_api_key()
        self._client = None

    def _get_client(self):
        if self._client is not None:
            return self._client
        try:
            import anthropic
        except ImportError as exc:
            raise AiUnavailable(
                "anthropic 패키지가 없어. AI 분류 없이 규칙으로만 정리할게."
            ) from exc
        if not self._api_key:
            raise AiUnavailable(
                "Claude API 키가 없어. 설정에서 키를 넣으면 AI 분류를 쓸 수 있어."
            )
        self._client = anthropic.Anthropic(api_key=self._api_key)
        return self._client

    # ---- 1단계: 주제 찾기 ------------------------------------------------

    def propose_playlists(self, videos: list[Video]) -> list[tuple[str, str]]:
        """(이름, 설명) 목록을 돌려준다."""
        client = self._get_client()
        Proposal, _ = _schemas()

        sample = videos[:SAMPLE_SIZE]
        listing = "\n".join(prompts.format_video_line(v) for v in sample)

        response = self._call(
            client,
            system=prompts.PROPOSE_SYSTEM.format(
                min_size=self.settings.min_group_size,
                max_playlists=self.settings.max_playlists,
            ),
            user=prompts.PROPOSE_USER.format(
                total=len(videos), shown=len(sample), listing=listing
            ),
            schema=Proposal,
            max_tokens=4000,
        )
        return [(p.name.strip(), p.description) for p in response.playlists if p.name.strip()]

    # ---- 2단계: 배정 ------------------------------------------------------

    def assign(self, videos: list[Video], playlist_names: list[str]) -> list[Assignment]:
        client = self._get_client()
        _, AssignmentBatch = _schemas()

        valid_names = {name for name in playlist_names}
        by_id = {v.video_id: v for v in videos}
        results: list[Assignment] = []

        system = prompts.ASSIGN_SYSTEM.format(
            playlists="\n".join(f"- {name}" for name in playlist_names)
        )

        for start in range(0, len(videos), BATCH_SIZE):
            batch = videos[start:start + BATCH_SIZE]
            listing = "\n".join(prompts.format_video_line(v) for v in batch)

            try:
                parsed = self._call(
                    client, system=system,
                    user=prompts.ASSIGN_USER.format(listing=listing),
                    schema=AssignmentBatch,
                    max_tokens=8000,
                    # 배정은 단순 분류 작업이라 낮은 effort로 충분하다.
                    effort="low",
                )
            except AiUnavailable:
                raise
            except Exception as exc:  # noqa: BLE001 - 배치 하나가 실패해도 나머지는 계속
                log.warning("배치 배정 실패(%d~%d): %s", start, start + len(batch), exc)
                continue

            for item in parsed.assignments:
                # 모델이 없는 영상 ID나 새 재생목록 이름을 지어낼 수 있다.
                # 반드시 입력과 대조해서 걸러낸다.
                video = by_id.get(item.video_id)
                if video is None:
                    log.debug("모르는 video_id 무시: %s", item.video_id)
                    continue
                name = item.playlist.strip()
                if name not in valid_names:
                    log.debug("제안에 없던 재생목록 무시: %s", name)
                    continue
                results.append(Assignment(video.video_id, name, "AI 분류", video.title))

        return results

    # ---- 전체 -------------------------------------------------------------

    def classify(self, videos: list[Video]) -> ClassificationResult:
        """규칙 엔진과 같은 모양의 결과를 돌려준다."""
        usable = [v for v in videos if v.availability == "available"]
        result = ClassificationResult(source="ai")

        if not usable:
            return result

        ideas = self.propose_playlists(usable)
        if not ideas:
            raise AiUnavailable("AI가 재생목록을 제안하지 못했어")

        names = [name for name, _ in ideas]
        assignments = self.assign(usable, names)

        # 최소 크기 미달 그룹은 버린다 (1개짜리 재생목록 방지)
        counts: dict[str, int] = {}
        for item in assignments:
            counts[item.playlist] = counts.get(item.playlist, 0) + 1

        kept = [a for a in assignments if counts[a.playlist] >= self.settings.min_group_size]
        dropped = len(assignments) - len(kept)
        if dropped:
            result.notes.append(
                f"영상이 {self.settings.min_group_size}개 미만인 그룹 {dropped}건은 제외했어"
            )

        assigned_ids = {a.video_id for a in kept}
        result.assignments = kept
        result.unmatched = [v for v in usable if v.video_id not in assigned_ids]
        result.notes.append(f"AI가 제안한 주제 {len(names)}개: {', '.join(names[:8])}")
        return result

    # ---- 호출 -------------------------------------------------------------

    def _call(self, client, system: str, user: str, schema, max_tokens: int,
              effort: str | None = None):
        import anthropic

        kwargs = {
            "model": self.settings.model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "output_format": schema,
        }
        if effort:
            kwargs["output_config"] = {"effort": effort}

        try:
            response = client.messages.parse(**kwargs)
        except anthropic.AuthenticationError as exc:
            raise AiUnavailable("Claude API 키가 거부됐어. 설정에서 키를 다시 확인해줘.") from exc
        except anthropic.RateLimitError as exc:
            raise AiUnavailable("Claude API 사용량 한도에 걸렸어. 잠시 후 다시 해줘.") from exc
        except anthropic.APIConnectionError as exc:
            raise AiUnavailable(f"Claude API에 연결하지 못했어: {exc}") from exc
        except anthropic.APIStatusError as exc:
            raise AiUnavailable(f"Claude API 오류 {exc.status_code}: {exc}") from exc

        # 안전 분류기가 거부하면 content가 비어 있다. 읽기 전에 확인한다.
        if getattr(response, "stop_reason", None) == "refusal":
            raise AiUnavailable(
                "AI가 이 요청을 거부했어. 규칙 기반 분류로 대신할게."
            )

        parsed = getattr(response, "parsed_output", None)
        if parsed is None:
            raise AiUnavailable("AI 응답을 해석하지 못했어")
        return parsed


def estimate_cost(video_count: int, model: str = DEFAULT_MODEL) -> str:
    """대략적인 비용 안내. 실행 전에 사용자에게 보여준다.

    영상 한 줄이 약 30토큰, 여기에 프롬프트와 출력을 더해 어림한다.
    정확한 청구액이 아니라 자릿수 감을 주는 용도다.
    """
    # 1단계(샘플) + 2단계(전량, 배치마다 시스템 프롬프트 재전송)
    sample = min(video_count, SAMPLE_SIZE)
    batches = max(1, (video_count + BATCH_SIZE - 1) // BATCH_SIZE)
    input_tokens = sample * 30 + video_count * 30 + batches * 300
    output_tokens = video_count * 25 + 500

    # claude-opus-5 기준 $5/1M 입력, $25/1M 출력
    rates = {"claude-opus-5": (5.0, 25.0), "claude-sonnet-5": (2.0, 10.0),
             "claude-haiku-4-5": (1.0, 5.0)}
    in_rate, out_rate = rates.get(model, (5.0, 25.0))
    usd = input_tokens / 1e6 * in_rate + output_tokens / 1e6 * out_rate

    if usd < 0.01:
        return "1센트 미만"
    return f"약 ${usd:.2f}"
