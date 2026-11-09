"""패턴 실행 엔진 (GUI/입력 라이브러리와 독립)."""
from __future__ import annotations

import json
import random
import threading
import time
from dataclasses import asdict, dataclass
from typing import Callable, Protocol


@dataclass
class Step:
    kind: str            # "click" | "key" | "wait"
    x: int = 0
    y: int = 0
    button: str = "left"  # left/right/middle
    key: str = ""         # 예: "space", "f", "a"
    delay_ms: int = 500   # 이 동작 '후' 대기 시간

    def label(self) -> str:
        if self.kind == "click":
            return f"클릭 ({self.x}, {self.y}) [{self.button}]  → {self.delay_ms}ms 대기"
        if self.kind == "key":
            return f"키 '{self.key}'  → {self.delay_ms}ms 대기"
        return f"대기 {self.delay_ms}ms"


class Backend(Protocol):
    def click(self, x: int, y: int, button: str) -> None: ...
    def press(self, key: str) -> None: ...


def run_pattern(
    steps: list[Step],
    backend: Backend,
    stop: threading.Event,
    loops: int = 0,            # 0 = 무한 반복
    jitter_pct: int = 0,       # 대기시간 ±% 랜덤 편차
    on_step: Callable[[int, int], None] | None = None,
    sleep: Callable[[float], None] | None = None,
) -> int:
    """패턴을 실행하고 완료한 반복 횟수를 반환. stop 이 set 되면 즉시 중단."""
    if not steps:
        return 0
    wait = sleep or (lambda s: stop.wait(s))
    done = 0
    while not stop.is_set() and (loops == 0 or done < loops):
        for i, st in enumerate(steps):
            if stop.is_set():
                return done
            if on_step:
                on_step(done, i)
            if st.kind == "click":
                backend.click(st.x, st.y, st.button)
            elif st.kind == "key":
                backend.press(st.key)
            d = st.delay_ms
            if jitter_pct:
                d = int(d * random.uniform(1 - jitter_pct / 100, 1 + jitter_pct / 100))
            wait(max(d, 0) / 1000)
        done += 1
    return done


def save_steps(path: str, steps: list[Step]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(s) for s in steps], f, ensure_ascii=False, indent=2)


def load_steps(path: str) -> list[Step]:
    with open(path, encoding="utf-8") as f:
        return [Step(**d) for d in json.load(f)]
