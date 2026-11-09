"""녹화/재생 엔진 (GUI·입력 라이브러리와 독립)."""
from __future__ import annotations

import json
import threading
import time
from dataclasses import asdict, dataclass, field
from typing import Callable, Protocol


@dataclass
class Ev:
    t: int          # 녹화 시작 후 경과 ms
    x: int
    y: int
    button: str     # left/right/middle
    down: bool      # True=누름, False=뗌


@dataclass
class Click:
    start: int
    hold: int
    x: int
    y: int
    button: str


@dataclass
class Pattern:
    name: str
    events: list[Ev] = field(default_factory=list)
    duration_ms: int = 0   # 마지막 클릭 뒤 가만히 있던 시간까지 포함한 전체 길이

    def clicks(self) -> list[Click]:
        """누름/뗌 이벤트를 짝지어 클릭(길게 누르기 포함) 목록으로."""
        open_: dict[str, Ev] = {}
        out: list[Click] = []
        for e in self.events:
            if e.down:
                open_[e.button] = e
            elif e.button in open_:
                d = open_.pop(e.button)
                out.append(Click(d.t, e.t - d.t, d.x, d.y, d.button))
        for d in open_.values():  # 안 뗀 채로 끝난 경우
            out.append(Click(d.t, max(self.duration_ms - d.t, 0), d.x, d.y, d.button))
        return sorted(out, key=lambda c: c.start)

    @property
    def click_count(self) -> int:
        return len(self.clicks())


class Backend(Protocol):
    def down(self, x: int, y: int, button: str) -> None: ...
    def up(self, x: int, y: int, button: str) -> None: ...


class Recorder:
    """마우스 이벤트를 시간과 함께 기록. ignore(x,y)가 True인 클릭(앱 창 안)은 버림."""

    def __init__(self, clock: Callable[[], float] = time.monotonic,
                 ignore: Callable[[int, int], bool] | None = None) -> None:
        self.clock = clock
        self.ignore = ignore or (lambda x, y: False)
        self.events: list[Ev] = []
        self._t0 = 0.0
        self._skip: set[str] = set()   # 무시된 '누름'에 대응하는 '뗌'도 무시
        self._pressed: set[str] = set()
        self._lock = threading.Lock()

    def begin(self) -> None:
        self._t0 = self.clock()

    def elapsed_ms(self) -> int:
        return int((self.clock() - self._t0) * 1000)

    def on_click(self, x: int, y: int, button: str, pressed: bool) -> None:
        with self._lock:
            if pressed:
                if self.ignore(x, y):
                    self._skip.add(button)
                    return
                self._pressed.add(button)
            else:
                if button in self._skip:
                    self._skip.discard(button)
                    return
                if button not in self._pressed:
                    return
                self._pressed.discard(button)
            self.events.append(Ev(self.elapsed_ms(), int(x), int(y), button, pressed))

    @property
    def click_count(self) -> int:
        with self._lock:
            return sum(1 for e in self.events if e.down)

    def finish(self, name: str) -> Pattern:
        with self._lock:
            dur = self.elapsed_ms()
            evs = list(self.events)
            # 뗌 없이 끝난 누름은 종료 시점에 뗀 것으로 처리
            for b in list(self._pressed):
                last = next(e for e in reversed(evs) if e.button == b and e.down)
                evs.append(Ev(dur, last.x, last.y, b, False))
            return Pattern(name, evs, dur)


def play(
    p: Pattern,
    backend: Backend,
    stop: threading.Event,
    loops: int = 0,                 # 0 = 무한 반복
    gap_ms: int = 0,                # 반복 사이 추가 대기
    on_loop: Callable[[int], None] | None = None,
    clock: Callable[[], float] = time.monotonic,
    wait: Callable[[float], object] | None = None,
) -> int:
    """패턴을 녹화된 타이밍 그대로 반복 재생. 완료한 반복 횟수 반환."""
    if not p.events and p.duration_ms <= 0:
        return 0
    wait = wait or stop.wait
    held: dict[str, tuple[int, int]] = {}
    done = 0

    def sleep_until(target: float) -> bool:
        r = target - clock()
        if r > 0:
            wait(r)
        return not stop.is_set()

    try:
        while not stop.is_set() and (loops == 0 or done < loops):
            if on_loop:
                on_loop(done)
            t0 = clock()
            for e in p.events:
                if not sleep_until(t0 + e.t / 1000):
                    return done
                if e.down:
                    backend.down(e.x, e.y, e.button)
                    held[e.button] = (e.x, e.y)
                else:
                    backend.up(e.x, e.y, e.button)
                    held.pop(e.button, None)
            if not sleep_until(t0 + max(p.duration_ms, 10) / 1000):
                return done
            done += 1
            if gap_ms and not sleep_until(clock() + gap_ms / 1000):
                return done
    finally:
        for b, (x, y) in held.items():   # 중간 정지 시 버튼이 눌린 채로 남지 않게
            backend.up(x, y, b)
    return done


def save_patterns(path: str, patterns: list[Pattern]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(p) for p in patterns], f, ensure_ascii=False, indent=1)


def load_patterns(path: str) -> list[Pattern]:
    with open(path, encoding="utf-8") as f:
        return [Pattern(d["name"], [Ev(**e) for e in d["events"]], d["duration_ms"])
                for d in json.load(f)]
