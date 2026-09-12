# -*- coding: utf-8 -*-
"""roblox_afk 핵심 로직 테스트 (Windows 없이 dry-run 백엔드로 검증)."""

import os
import sys
import threading
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import roblox_afk as afk  # noqa: E402


class ConfigTest(unittest.TestCase):
    def test_defaults_are_valid(self):
        afk.Config().validate()

    def test_interval_must_beat_the_kick_timer(self):
        with self.assertRaises(ValueError):
            afk.Config(interval_minutes=25).validate()
        with self.assertRaises(ValueError):
            afk.Config(interval_minutes=19, jitter_seconds=120).validate()
        with self.assertRaises(ValueError):
            afk.Config(interval_minutes=0.05).validate()

    def test_jitter_stays_in_range(self):
        cfg = afk.Config(interval_minutes=3, jitter_seconds=20)
        for _ in range(200):
            value = cfg.interval_seconds()
            self.assertGreaterEqual(value, 160)
            self.assertLessEqual(value, 200)

    def test_zero_jitter_is_exact(self):
        cfg = afk.Config(interval_minutes=2, jitter_seconds=0)
        self.assertEqual(cfg.interval_seconds(), 120)


class ActionTest(unittest.TestCase):
    def test_unknown_keys_fall_back_to_defaults(self):
        self.assertEqual(
            [a.key for a in afk.resolve_actions(["nope"])],
            list(afk.DEFAULT_ACTION_KEYS),
        )

    def test_default_pool_is_all_safe(self):
        for action in afk.resolve_actions(list(afk.DEFAULT_ACTION_KEYS)):
            self.assertTrue(action.safe, f"{action.key} 는 안전한 입력이어야 한다")

    def test_no_immediate_repeat(self):
        engine = afk.AntiAFK(afk.Config(dry_run=True))
        previous = None
        for _ in range(100):
            current = engine.pick_action().key
            self.assertNotEqual(current, previous)
            previous = current

    def test_single_action_pool_repeats_fine(self):
        engine = afk.AntiAFK(afk.Config(action_keys=["jump"], dry_run=True))
        self.assertEqual(engine.pick_action().key, "jump")
        self.assertEqual(engine.pick_action().key, "jump")


class TickTest(unittest.TestCase):
    def make(self, **kwargs):
        cfg = afk.Config(dry_run=True, **kwargs)
        backend = afk.DryRunBackend()
        return afk.AntiAFK(cfg, backend=backend), backend

    def test_tick_sends_input(self):
        engine, backend = self.make()
        message = engine.tick()
        self.assertIn("입력 전송", message)
        self.assertEqual(engine.stats.sent, 1)
        self.assertTrue(backend.events)

    def test_skips_when_roblox_missing(self):
        engine, backend = self.make()
        backend.roblox_present = False
        message = engine.tick()
        self.assertIn("못 찾았다", message)
        self.assertEqual(engine.stats.sent, 0)
        self.assertEqual(engine.stats.skipped, 1)

    def test_skips_when_user_is_actually_playing(self):
        engine, backend = self.make(skip_if_user_active_seconds=45)
        backend.user_idle_seconds = lambda: 2.0  # 사람이 2초 전에 조작함
        self.assertIn("직접 플레이 중", engine.tick())
        self.assertEqual(engine.stats.sent, 0)

    def test_our_own_input_does_not_count_as_user_activity(self):
        engine, backend = self.make(skip_if_user_active_seconds=45)
        engine.tick()  # 우리가 방금 입력을 보냈다
        backend.user_idle_seconds = lambda: 0.1
        self.assertIn("입력 전송", engine.tick())
        self.assertEqual(engine.stats.sent, 2)

    def test_respects_no_steal_focus(self):
        engine, backend = self.make(steal_focus=False)
        backend.get_foreground = lambda: 999  # 다른 창이 앞에 있음
        self.assertIn("건너뜀", engine.tick())
        self.assertEqual(engine.stats.sent, 0)

    def test_restores_previous_window(self):
        engine, backend = self.make(steal_focus=True, restore_focus=True)
        backend.get_foreground = lambda: 999
        engine.tick()
        self.assertIn("focus(1)", backend.events)
        self.assertEqual(backend.events[-1], "focus(999)")

    def test_input_failure_is_counted_not_raised(self):
        engine, backend = self.make()

        def boom(*_args, **_kwargs):
            raise OSError("SendInput 실패")

        backend.send_key = boom
        backend.move_mouse = boom
        message = engine.tick()
        self.assertIn("입력 실패", message)
        self.assertEqual(engine.stats.errors, 1)


class RunLoopTest(unittest.TestCase):
    def test_loop_runs_and_stops(self):
        cfg = afk.Config(interval_minutes=0.005, jitter_seconds=0, dry_run=True)
        cfg.validate = lambda: None  # 테스트를 위해 아주 짧은 간격 허용
        backend = afk.DryRunBackend()
        engine = afk.AntiAFK(cfg, backend=backend, on_log=lambda _m: None)
        stop = threading.Event()
        thread = threading.Thread(target=engine.run, args=(stop,), daemon=True)
        thread.start()
        time.sleep(1.0)
        stop.set()
        thread.join(timeout=3)
        self.assertFalse(thread.is_alive())
        self.assertGreaterEqual(engine.stats.sent, 1)


class CliTest(unittest.TestCase):
    def test_list_actions(self):
        self.assertEqual(afk.main(["--list-actions"]), 0)

    def test_bad_interval_exits_with_error(self):
        self.assertEqual(afk.main(["--cli", "-i", "99"]), 2)

    def test_max_runtime_stops_on_its_own(self):
        started = time.monotonic()
        code = afk.main(["--cli", "-i", "0.5", "--max-runtime", "0.004", "--dry-run"])
        self.assertEqual(code, 0)
        self.assertLess(time.monotonic() - started, 10)


if __name__ == "__main__":
    unittest.main(verbosity=2)
