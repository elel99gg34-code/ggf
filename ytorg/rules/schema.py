"""사용자 규칙을 YAML로 읽고 쓴다.

기본 규칙만으로는 각자의 구독 성향을 담을 수 없으므로, 설정 폴더의
rules.yaml을 고쳐 자기 규칙을 넣을 수 있게 한다. 파일이 없으면 기본 규칙을
그대로 쓴다.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from pathlib import Path

from ..core import paths
from .builtin import default_rules
from .engine import Rule

log = logging.getLogger(__name__)

RULES_FILENAME = "rules.yaml"

# Rule의 필드만 받아들인다. 오타나 모르는 키는 조용히 무시하지 않고 알려준다.
_ALLOWED = set(Rule.__dataclass_fields__.keys())


def rules_path() -> Path:
    return paths.data_dir() / RULES_FILENAME


def load_rules(path: Path | None = None) -> tuple[list[Rule], list[str]]:
    """(규칙 목록, 경고 목록). 파일이 없거나 깨졌으면 기본 규칙으로 돌아간다."""
    import yaml

    path = path or rules_path()
    if not path.exists():
        return default_rules(), []

    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except yaml.YAMLError as exc:
        return default_rules(), [f"rules.yaml을 읽지 못해 기본 규칙을 쓸게: {exc}"]

    entries = raw.get("rules") if isinstance(raw, dict) else raw
    if not isinstance(entries, list):
        return default_rules(), ["rules.yaml에 rules 목록이 없어 기본 규칙을 쓸게"]

    rules: list[Rule] = []
    warnings: list[str] = []
    for index, entry in enumerate(entries, 1):
        if not isinstance(entry, dict) or "playlist" not in entry:
            warnings.append(f"{index}번째 규칙에 playlist가 없어서 건너뜀")
            continue
        unknown = set(entry) - _ALLOWED
        if unknown:
            warnings.append(f"'{entry['playlist']}' 규칙의 모르는 항목 무시: "
                            f"{', '.join(sorted(unknown))}")
        try:
            rules.append(Rule(**{k: v for k, v in entry.items() if k in _ALLOWED}))
        except (TypeError, ValueError) as exc:
            warnings.append(f"'{entry.get('playlist')}' 규칙을 못 읽었어: {exc}")

    if not rules:
        return default_rules(), warnings + ["쓸 수 있는 규칙이 없어 기본 규칙을 쓸게"]
    return rules, warnings


def save_rules(rules: list[Rule], path: Path | None = None) -> Path:
    import yaml

    path = path or rules_path()
    payload = {"rules": [
        {k: v for k, v in asdict(rule).items()
         # 기본값과 같은 항목은 빼서 파일을 읽기 쉽게 유지한다
         if v not in ([], "", 0, True) or k == "playlist"}
        for rule in rules
    ]}
    path.write_text(
        yaml.safe_dump(payload, allow_unicode=True, sort_keys=False, width=100),
        encoding="utf-8",
    )
    return path


def write_default_rules_file(path: Path | None = None) -> Path:
    """설정 화면의 '기본 규칙 내보내기'. 사용자가 여기서부터 고쳐 쓴다."""
    return save_rules(default_rules(), path)
