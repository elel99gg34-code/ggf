"""사용자 설정. JSON 파일 하나로 관리한다.

비밀(토큰, API 키)은 여기 들어오지 않는다 — 그건 keyring 몫이다.
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field, fields

from .core import paths

log = logging.getLogger(__name__)


@dataclass
class Settings:
    # 할당량
    daily_limit: int = 10_000
    quota_reserve: int = 600        # 읽기·동기화용으로 남겨둘 몫
    rate_limit_per_sec: float = 2.0  # 유튜브 스팸 필터 회피용 자체 제한

    # 구독 정리
    dormant_months: int = 12
    include_unused_channels: bool = False

    # 분류
    min_group_size: int = 3
    new_playlist_privacy: str = "private"
    use_ai: bool = False
    ai_model: str = "claude-opus-5"
    max_ai_playlists: int = 12

    # 동작
    auto_resume_jobs: bool = True    # 켤 때 멈춰 있던 작업을 이어서 함
    scan_uploads_on_sync: bool = True
    confirm_before_write: bool = True  # 끄지 못하게 UI에서 막는다(안전장치)

    warnings: list[str] = field(default_factory=list, compare=False)

    @classmethod
    def load(cls) -> "Settings":
        path = paths.settings_path()
        if not path.exists():
            return cls()
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            log.warning("설정을 읽지 못해 기본값을 씀: %s", exc)
            settings = cls()
            settings.warnings.append(f"설정 파일이 손상돼 기본값으로 시작했어: {exc}")
            return settings

        known = {f.name for f in fields(cls)} - {"warnings"}
        return cls(**{k: v for k, v in raw.items() if k in known})

    def save(self) -> None:
        data = {k: v for k, v in asdict(self).items() if k != "warnings"}
        paths.settings_path().write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
