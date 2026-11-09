import os, sys, threading
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))
from engine import Ev, Pattern, Recorder, load_patterns, play, save_patterns


class Clock:
    def __init__(self): self.t = 0.0
    def __call__(self): return self.t


class Fake:
    def __init__(self, clk): self.clk, self.log = clk, []
    def down(self, x, y, b): self.log.append((round(self.clk.t, 3), "down", x, y, b))
    def up(self, x, y, b): self.log.append((round(self.clk.t, 3), "up", x, y, b))


def test_recorder_long_press_idle_and_ignore():
    c = Clock(); r = Recorder(c, ignore=lambda x, y: x < 0)
    r.begin()
    c.t = 1.0; r.on_click(5, 6, "left", True)
    c.t = 1.4; r.on_click(5, 6, "left", False)        # 0.4초 길게
    c.t = 2.0; r.on_click(-1, 0, "left", True)         # 앱 창 안 → 무시
    c.t = 2.1; r.on_click(-1, 0, "left", False)
    c.t = 3.0; r.on_click(9, 9, "right", True)
    c.t = 5.0
    p = r.finish("t")
    assert r.click_count == 2
    cl = p.clicks()
    assert [(k.start, k.hold, k.button) for k in cl] == [(1000, 400, "left"), (3000, 2000, "right")]
    assert p.duration_ms == 5000   # 가만히 있던 시간도 길이에 포함


def test_play_timing_and_loops():
    c = Clock(); f = Fake(c); ev = threading.Event()
    p = Pattern("p", [Ev(1000, 1, 2, "left", True), Ev(1150, 1, 2, "left", False)], 2000)
    def wait(s): c.t += s
    n = play(p, f, ev, loops=2, clock=c, wait=wait)
    assert n == 2
    assert f.log == [(1.0, "down", 1, 2, "left"), (1.15, "up", 1, 2, "left"),
                     (3.0, "down", 1, 2, "left"), (3.15, "up", 1, 2, "left")]
    assert c.t == 4.0   # 마지막 가만히 있는 구간까지 재생


def test_stop_during_hold_releases_button():
    c = Clock(); f = Fake(c); ev = threading.Event()
    p = Pattern("p", [Ev(1000, 1, 2, "left", True), Ev(5000, 1, 2, "left", False)], 6000)
    def wait(s):
        c.t += s
        if c.t > 1.0: ev.set()
    play(p, f, ev, loops=0, clock=c, wait=wait)
    assert [l[1] for l in f.log] == ["down", "up"]


def test_empty_and_saveload(tmp_path):
    assert play(Pattern("e"), None, threading.Event(), loops=1) == 0
    p = Pattern("a", [Ev(1, 2, 3, "left", True), Ev(5, 2, 3, "left", False)], 9)
    f = str(tmp_path / "p.json"); save_patterns(f, [p])
    assert load_patterns(f) == [p]
