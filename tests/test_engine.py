import os, sys, threading
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))
from engine import Step, load_steps, run_pattern, save_steps


class Fake:
    def __init__(self): self.log = []
    def click(self, x, y, b): self.log.append(("c", x, y, b))
    def press(self, k): self.log.append(("k", k))


PAT = [Step("click", 10, 20, "left", delay_ms=0), Step("key", key="f", delay_ms=0), Step("wait", delay_ms=0)]


def test_loops():
    f = Fake()
    n = run_pattern(PAT, f, threading.Event(), loops=3, sleep=lambda s: None)
    assert n == 3 and f.log == [("c", 10, 20, "left"), ("k", "f")] * 3


def test_stop_midway():
    f, ev = Fake(), threading.Event()
    def sl(_):
        if len(f.log) >= 5: ev.set()
    run_pattern(PAT, f, ev, loops=0, sleep=sl)
    assert 5 <= len(f.log) <= 6


def test_empty_and_saveload(tmp_path):
    assert run_pattern([], Fake(), threading.Event(), loops=1) == 0
    p = str(tmp_path / "p.json"); save_steps(p, PAT)
    assert load_steps(p) == PAT


def test_jitter_range():
    waits = []
    run_pattern([Step("wait", delay_ms=1000)], Fake(), threading.Event(), loops=50, jitter_pct=20, sleep=waits.append)
    assert all(0.8 <= w <= 1.2 for w in waits) and len(set(waits)) > 1
