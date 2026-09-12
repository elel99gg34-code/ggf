#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Roblox 잠수 방지 프로그램 (Anti-AFK)
===================================

로블록스 창을 찾아서 일정 시간(분) 간격으로 무해한 입력(카메라 회전 / 줌 /
점프 / 마우스 미세 이동)을 보내, 20분 무입력 자동 강퇴(Idled)를 막는다.

동작 방식
---------
로블록스는 외부 프로그램이 붙을 수 있는 공식 API를 제공하지 않는다.
그래서 "연결"은 OS 레벨에서 이루어진다:

  1. user32.EnumWindows 로 로블록스 클라이언트 창(class: WINDOWSCLIENT)을 찾는다.
  2. 필요하면 그 창을 잠깐 포커스한다 (AttachThreadInput + SetForegroundWindow).
  3. user32.SendInput 으로 스캔코드 기반 키/마우스 입력을 주입한다.
     (로블록스는 Raw Input 을 쓰기 때문에 PostMessage 류는 먹지 않는다.
      그래서 실제 하드웨어 입력과 동일한 SendInput + KEYEVENTF_SCANCODE 를 쓴다.)
  4. 입력 후 원래 쓰던 창으로 포커스를 되돌린다.

의존성 없음 (Python 표준 라이브러리 ctypes / tkinter 만 사용).

사용법
------
    python roblox_afk.py                 # GUI
    python roblox_afk.py --cli           # 콘솔 모드
    python roblox_afk.py --cli -i 3      # 3분 간격
    python roblox_afk.py --cli --dry-run # 실제 입력 없이 동작만 확인
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import sys
import threading
import time
from dataclasses import dataclass, field
from typing import Callable, List, Optional, Sequence

APP_NAME = "Roblox AFK Keeper"
APP_VERSION = "1.0.0"

IS_WINDOWS = sys.platform.startswith("win")

# 로블록스 기본 강퇴 시간(초). Player.Idled 는 20분 무입력에서 발생한다.
ROBLOX_IDLE_KICK_SECONDS = 20 * 60

log = logging.getLogger("roblox_afk")


# ---------------------------------------------------------------------------
# 입력 액션 정의
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Action:
    """로블록스에 보낼 입력 하나."""

    key: str            # 내부 식별자
    label: str          # 사용자에게 보여줄 이름
    kind: str           # "key" | "mouse_move" | "click"
    payload: object     # 키 이름 / (dx, dy) / 버튼 이름
    safe: bool          # 캐릭터를 움직이지 않는 "무해한" 입력인가
    hold: float = 0.05  # 누르고 있는 시간(초)


#: 기본 액션 풀. safe=True 인 것들은 캐릭터 위치에 영향을 주지 않는다.
ACTIONS: Sequence[Action] = (
    Action("camera_left",  "카메라 좌회전 (←)", "key", "left",  True),
    Action("camera_right", "카메라 우회전 (→)", "key", "right", True),
    Action("zoom_in",      "줌 인 (I)",         "key", "i",     True),
    Action("zoom_out",     "줌 아웃 (O)",       "key", "o",     True),
    Action("mouse_jiggle", "마우스 미세 이동",   "mouse_move", (3, 0), True),
    Action("jump",         "점프 (Space)",      "key", "space", False, hold=0.08),
    Action("shift",        "Shift 탭",          "key", "shift", False),
    Action("click",        "좌클릭",             "click", "left", False),
)

ACTIONS_BY_KEY = {a.key: a for a in ACTIONS}

#: 아무것도 고르지 않았을 때 쓰는 기본 조합 (전부 무해한 입력)
DEFAULT_ACTION_KEYS = ("camera_left", "camera_right", "zoom_in", "zoom_out", "mouse_jiggle")


def resolve_actions(keys: Sequence[str]) -> List[Action]:
    """액션 키 목록을 Action 객체로 바꾼다. 알 수 없는 키는 무시."""
    picked = [ACTIONS_BY_KEY[k] for k in keys if k in ACTIONS_BY_KEY]
    return picked or [ACTIONS_BY_KEY[k] for k in DEFAULT_ACTION_KEYS]


# ---------------------------------------------------------------------------
# 백엔드 공통 인터페이스
# ---------------------------------------------------------------------------

@dataclass
class WindowInfo:
    handle: int
    title: str
    cls: str
    pid: int


class Backend:
    """OS 입력/창 제어 추상화."""

    name = "base"

    def find_roblox(self) -> Optional[WindowInfo]:
        raise NotImplementedError

    def get_foreground(self) -> int:
        raise NotImplementedError

    def focus(self, handle: int) -> bool:
        raise NotImplementedError

    def send_key(self, key: str, hold: float) -> None:
        raise NotImplementedError

    def move_mouse(self, dx: int, dy: int) -> None:
        raise NotImplementedError

    def click(self, button: str) -> None:
        raise NotImplementedError

    def user_idle_seconds(self) -> Optional[float]:
        """마지막 사용자 입력 이후 경과 초. 알 수 없으면 None."""
        return None

    def perform(self, action: Action) -> None:
        if action.kind == "key":
            self.send_key(str(action.payload), action.hold)
        elif action.kind == "mouse_move":
            dx, dy = action.payload  # type: ignore[misc]
            self.move_mouse(int(dx), int(dy))
            time.sleep(0.03)
            self.move_mouse(-int(dx), -int(dy))
        elif action.kind == "click":
            self.click(str(action.payload))
        else:  # pragma: no cover - 방어적
            raise ValueError(f"알 수 없는 액션 종류: {action.kind}")


class DryRunBackend(Backend):
    """실제 입력 없이 로그만 남기는 백엔드 (테스트 / 리눅스·맥 확인용)."""

    name = "dry-run"

    def __init__(self, roblox_present: bool = True) -> None:
        self.roblox_present = roblox_present
        self.events: List[str] = []

    def _record(self, msg: str) -> None:
        self.events.append(msg)
        log.debug("[dry-run] %s", msg)

    def find_roblox(self) -> Optional[WindowInfo]:
        if not self.roblox_present:
            return None
        return WindowInfo(handle=1, title="Roblox", cls="WINDOWSCLIENT", pid=0)

    def get_foreground(self) -> int:
        return 1 if self.roblox_present else 0

    def focus(self, handle: int) -> bool:
        self._record(f"focus({handle})")
        return True

    def send_key(self, key: str, hold: float) -> None:
        self._record(f"key({key}, hold={hold})")

    def move_mouse(self, dx: int, dy: int) -> None:
        self._record(f"mouse({dx},{dy})")

    def click(self, button: str) -> None:
        self._record(f"click({button})")


# ---------------------------------------------------------------------------
# Windows 백엔드 (ctypes / SendInput)
# ---------------------------------------------------------------------------

def _build_windows_backend() -> Backend:
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.WinDLL("user32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

    ULONG_PTR = ctypes.POINTER(ctypes.c_ulong)

    INPUT_MOUSE = 0
    INPUT_KEYBOARD = 1

    KEYEVENTF_EXTENDEDKEY = 0x0001
    KEYEVENTF_KEYUP = 0x0002
    KEYEVENTF_SCANCODE = 0x0008

    MOUSEEVENTF_MOVE = 0x0001
    MOUSEEVENTF_LEFTDOWN = 0x0002
    MOUSEEVENTF_LEFTUP = 0x0004
    MOUSEEVENTF_RIGHTDOWN = 0x0008
    MOUSEEVENTF_RIGHTUP = 0x0010

    SW_RESTORE = 9

    class KEYBDINPUT(ctypes.Structure):
        _fields_ = [
            ("wVk", wintypes.WORD),
            ("wScan", wintypes.WORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ULONG_PTR),
        ]

    class MOUSEINPUT(ctypes.Structure):
        _fields_ = [
            ("dx", wintypes.LONG),
            ("dy", wintypes.LONG),
            ("mouseData", wintypes.DWORD),
            ("dwFlags", wintypes.DWORD),
            ("time", wintypes.DWORD),
            ("dwExtraInfo", ULONG_PTR),
        ]

    class HARDWAREINPUT(ctypes.Structure):
        _fields_ = [
            ("uMsg", wintypes.DWORD),
            ("wParamL", wintypes.WORD),
            ("wParamH", wintypes.WORD),
        ]

    class _InputUnion(ctypes.Union):
        _fields_ = [("ki", KEYBDINPUT), ("mi", MOUSEINPUT), ("hi", HARDWAREINPUT)]

    class INPUT(ctypes.Structure):
        _anonymous_ = ("u",)
        _fields_ = [("type", wintypes.DWORD), ("u", _InputUnion)]

    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]

    user32.SendInput.argtypes = (wintypes.UINT, ctypes.POINTER(INPUT), ctypes.c_int)
    user32.SendInput.restype = wintypes.UINT
    user32.GetForegroundWindow.restype = wintypes.HWND
    user32.SetForegroundWindow.argtypes = (wintypes.HWND,)
    user32.IsWindowVisible.argtypes = (wintypes.HWND,)
    user32.IsIconic.argtypes = (wintypes.HWND,)
    user32.ShowWindow.argtypes = (wintypes.HWND, ctypes.c_int)
    user32.GetWindowThreadProcessId.argtypes = (wintypes.HWND, ctypes.POINTER(wintypes.DWORD))
    user32.GetWindowThreadProcessId.restype = wintypes.DWORD
    user32.AttachThreadInput.argtypes = (wintypes.DWORD, wintypes.DWORD, wintypes.BOOL)
    user32.GetLastInputInfo.argtypes = (ctypes.POINTER(LASTINPUTINFO),)
    user32.BringWindowToTop.argtypes = (wintypes.HWND,)
    user32.GetClassNameW.argtypes = (wintypes.HWND, wintypes.LPWSTR, ctypes.c_int)
    user32.GetWindowTextW.argtypes = (wintypes.HWND, wintypes.LPWSTR, ctypes.c_int)
    user32.GetWindowTextLengthW.argtypes = (wintypes.HWND,)
    user32.GetWindowTextLengthW.restype = ctypes.c_int
    kernel32.GetCurrentThreadId.restype = wintypes.DWORD
    kernel32.GetTickCount.restype = wintypes.DWORD

    # 스캔코드 (Set 1). extended=True 면 KEYEVENTF_EXTENDEDKEY 가 필요하다.
    SCANCODES = {
        "left":  (0x4B, True),
        "right": (0x4D, True),
        "up":    (0x48, True),
        "down":  (0x50, True),
        "space": (0x39, False),
        "shift": (0x2A, False),
        "ctrl":  (0x1D, False),
        "i":     (0x17, False),
        "o":     (0x18, False),
        "w":     (0x11, False),
        "a":     (0x1E, False),
        "s":     (0x1F, False),
        "d":     (0x20, False),
        "f":     (0x21, False),
    }

    WNDENUMPROC = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    class WindowsBackend(Backend):
        name = "windows"

        # --- 창 찾기 -------------------------------------------------------
        def find_roblox(self) -> Optional[WindowInfo]:
            found: List[WindowInfo] = []

            def callback(hwnd, _lparam):
                if not user32.IsWindowVisible(hwnd):
                    return True
                buf_cls = ctypes.create_unicode_buffer(256)
                user32.GetClassNameW(hwnd, buf_cls, 256)
                cls = buf_cls.value
                length = user32.GetWindowTextLengthW(hwnd)
                buf_title = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf_title, length + 1)
                title = buf_title.value

                is_roblox = cls == "WINDOWSCLIENT" or title.strip().lower().startswith("roblox")
                # Roblox Studio 는 대상에서 제외한다.
                if is_roblox and "studio" not in title.lower():
                    pid = wintypes.DWORD()
                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                    found.append(WindowInfo(handle=hwnd, title=title, cls=cls, pid=pid.value))
                return True

            user32.EnumWindows(WNDENUMPROC(callback), 0)
            if not found:
                return None
            # 클라이언트 창(WINDOWSCLIENT)을 우선한다.
            found.sort(key=lambda w: 0 if w.cls == "WINDOWSCLIENT" else 1)
            return found[0]

        # --- 포커스 --------------------------------------------------------
        def get_foreground(self) -> int:
            return int(user32.GetForegroundWindow() or 0)

        def focus(self, handle: int) -> bool:
            if not handle:
                return False
            current = user32.GetForegroundWindow()
            if current == handle:
                return True

            if user32.IsIconic(handle):
                user32.ShowWindow(handle, SW_RESTORE)

            this_thread = kernel32.GetCurrentThreadId()
            target_thread = user32.GetWindowThreadProcessId(handle, None)
            fg_thread = user32.GetWindowThreadProcessId(current, None) if current else 0

            attached = []
            for tid in {target_thread, fg_thread}:
                if tid and tid != this_thread and user32.AttachThreadInput(this_thread, tid, True):
                    attached.append(tid)
            try:
                user32.SetForegroundWindow(handle)
                user32.BringWindowToTop(handle)
            finally:
                for tid in attached:
                    user32.AttachThreadInput(this_thread, tid, False)

            # SetForegroundWindow 는 포그라운드 락 때문에 실패할 수 있다.
            for _ in range(10):
                if user32.GetForegroundWindow() == handle:
                    return True
                time.sleep(0.02)
            return False

        # --- 입력 주입 -----------------------------------------------------
        def _send(self, inputs: Sequence) -> None:
            n = len(inputs)
            arr = (INPUT * n)(*inputs)
            sent = user32.SendInput(n, arr, ctypes.sizeof(INPUT))
            if sent != n:
                raise OSError(
                    f"SendInput 실패 ({sent}/{n}). "
                    f"WinError={ctypes.get_last_error()}. "
                    "로블록스가 관리자 권한으로 실행 중이면 이 프로그램도 "
                    "관리자 권한으로 실행해야 한다."
                )

        def _key_input(self, scan: int, extended: bool, up: bool) -> "INPUT":
            flags = KEYEVENTF_SCANCODE
            if extended:
                flags |= KEYEVENTF_EXTENDEDKEY
            if up:
                flags |= KEYEVENTF_KEYUP
            inp = INPUT(type=INPUT_KEYBOARD)
            inp.ki = KEYBDINPUT(wVk=0, wScan=scan, dwFlags=flags, time=0, dwExtraInfo=None)
            return inp

        def send_key(self, key: str, hold: float) -> None:
            if key not in SCANCODES:
                raise ValueError(f"지원하지 않는 키: {key}")
            scan, extended = SCANCODES[key]
            self._send([self._key_input(scan, extended, up=False)])
            time.sleep(max(0.01, hold))
            self._send([self._key_input(scan, extended, up=True)])

        def move_mouse(self, dx: int, dy: int) -> None:
            inp = INPUT(type=INPUT_MOUSE)
            inp.mi = MOUSEINPUT(dx=dx, dy=dy, mouseData=0,
                                dwFlags=MOUSEEVENTF_MOVE, time=0, dwExtraInfo=None)
            self._send([inp])

        def click(self, button: str) -> None:
            down, up = (
                (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP)
                if button == "right"
                else (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP)
            )
            for flag in (down, up):
                inp = INPUT(type=INPUT_MOUSE)
                inp.mi = MOUSEINPUT(dx=0, dy=0, mouseData=0,
                                    dwFlags=flag, time=0, dwExtraInfo=None)
                self._send([inp])
                time.sleep(0.04)

        # --- 사용자 활동 감지 ------------------------------------------------
        def user_idle_seconds(self) -> Optional[float]:
            lii = LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
            if not user32.GetLastInputInfo(ctypes.byref(lii)):
                return None
            # GetTickCount 는 49.7일마다 랩어라운드 한다. 부호 없는 32비트 차로 계산.
            elapsed_ms = (kernel32.GetTickCount() - lii.dwTime) & 0xFFFFFFFF
            return elapsed_ms / 1000.0

    return WindowsBackend()


def make_backend(dry_run: bool = False) -> Backend:
    if dry_run or not IS_WINDOWS:
        if not dry_run:
            log.warning("Windows 가 아니라서 dry-run 백엔드로 동작한다 (실제 입력 없음).")
        return DryRunBackend()
    return _build_windows_backend()


# ---------------------------------------------------------------------------
# 설정 + 엔진
# ---------------------------------------------------------------------------

@dataclass
class Config:
    interval_minutes: float = 3.0
    #: 간격에 더할 무작위 흔들림(초). 완전히 기계적인 주기를 피한다.
    jitter_seconds: float = 20.0
    action_keys: List[str] = field(default_factory=lambda: list(DEFAULT_ACTION_KEYS))
    #: 로블록스가 앞에 없어도 잠깐 포커스를 뺏어서 입력할지
    steal_focus: bool = True
    #: 입력 후 원래 창으로 되돌릴지
    restore_focus: bool = True
    #: 사용자가 최근 이 시간 안에 직접 입력했으면 건너뛴다(초). 0이면 항상 보냄.
    skip_if_user_active_seconds: float = 45.0
    #: 총 실행 시간 제한(분). 0이면 무제한.
    max_runtime_minutes: float = 0.0
    dry_run: bool = False

    def validate(self) -> None:
        if not 0.1 <= self.interval_minutes <= 19.0:
            raise ValueError(
                "간격은 0.1 ~ 19 분 사이여야 한다 "
                "(로블록스 강퇴는 20분이라 그보다 짧아야 의미가 있다)."
            )
        if self.jitter_seconds < 0:
            raise ValueError("흔들림 값은 0 이상이어야 한다.")
        if self.interval_minutes * 60 + self.jitter_seconds >= ROBLOX_IDLE_KICK_SECONDS:
            raise ValueError("간격 + 흔들림이 20분을 넘으면 강퇴를 못 막는다.")

    def interval_seconds(self) -> float:
        base = self.interval_minutes * 60.0
        if self.jitter_seconds <= 0:
            return base
        return max(5.0, base + random.uniform(-self.jitter_seconds, self.jitter_seconds))


@dataclass
class Stats:
    sent: int = 0
    skipped: int = 0
    errors: int = 0
    started_at: float = field(default_factory=time.monotonic)
    last_action: str = "-"
    last_sent_at: Optional[float] = None

    def uptime(self) -> float:
        return time.monotonic() - self.started_at


class AntiAFK:
    """잠수 방지 엔진. GUI / CLI 양쪽에서 같이 쓴다."""

    def __init__(
        self,
        config: Config,
        backend: Optional[Backend] = None,
        on_log: Optional[Callable[[str], None]] = None,
    ) -> None:
        config.validate()
        self.config = config
        self.backend = backend or make_backend(config.dry_run)
        self.stats = Stats()
        self._on_log = on_log or (lambda msg: log.info(msg))
        self._actions = resolve_actions(config.action_keys)
        self._last_self_input = 0.0
        self._recent: List[str] = []

    # -- 유틸 ---------------------------------------------------------------
    def say(self, msg: str) -> None:
        self._on_log(msg)

    def pick_action(self) -> Action:
        """같은 입력이 연속으로 나오지 않게 고른다."""
        if len(self._actions) == 1:
            return self._actions[0]
        choices = [a for a in self._actions if a.key not in self._recent[-1:]]
        action = random.choice(choices or self._actions)
        self._recent.append(action.key)
        self._recent = self._recent[-3:]
        return action

    def _user_is_active(self) -> bool:
        """우리가 보낸 입력이 아니라 사람이 실제로 조작 중인지 판단."""
        threshold = self.config.skip_if_user_active_seconds
        if threshold <= 0:
            return False
        idle = self.backend.user_idle_seconds()
        if idle is None:
            return False
        if idle >= threshold:
            return False
        # 우리가 보낸 입력도 idle 타이머를 초기화한다.
        # 마지막 자체 입력이 idle 시점보다 더 오래됐으면 = 사람이 방금 조작한 것.
        since_self = time.monotonic() - self._last_self_input
        return since_self > idle + 0.5

    # -- 한 사이클 ----------------------------------------------------------
    def tick(self) -> str:
        """입력 한 번 보내고 결과 메시지를 돌려준다."""
        window = self.backend.find_roblox()
        if window is None:
            self.stats.skipped += 1
            return "로블록스 창을 못 찾았다 — 건너뜀 (게임을 켜면 자동으로 다시 붙는다)"

        if self._user_is_active():
            self.stats.skipped += 1
            return "직접 플레이 중이라 건너뜀"

        previous = self.backend.get_foreground()
        is_front = previous == window.handle

        if not is_front:
            if not self.config.steal_focus:
                self.stats.skipped += 1
                return "로블록스가 앞에 없어서 건너뜀 (포커스 뺏기 꺼짐)"
            if not self.backend.focus(window.handle):
                self.stats.errors += 1
                return "로블록스 창 포커스 실패 — 다음 차례에 재시도"
            time.sleep(0.12)  # 창 전환이 안정될 때까지 잠깐 대기

        action = self.pick_action()
        try:
            self.backend.perform(action)
            self._last_self_input = time.monotonic()
            self.stats.sent += 1
            self.stats.last_action = action.label
            self.stats.last_sent_at = time.time()
            result = f"입력 전송: {action.label}"
        except Exception as exc:  # noqa: BLE001 - 어떤 실패든 루프는 계속 돈다
            self.stats.errors += 1
            result = f"입력 실패: {exc}"
        finally:
            if not is_front and self.config.restore_focus and previous:
                self.backend.focus(previous)

        return result

    # -- 루프 ---------------------------------------------------------------
    def run(self, stop_event: Optional[threading.Event] = None) -> None:
        stop = stop_event or threading.Event()
        cfg = self.config
        deadline = (
            time.monotonic() + cfg.max_runtime_minutes * 60
            if cfg.max_runtime_minutes > 0
            else None
        )

        window = self.backend.find_roblox()
        if window:
            self.say(f"로블록스 연결됨 — \"{window.title}\" (PID {window.pid})")
        else:
            self.say("로블록스가 아직 안 켜졌다. 켜지면 자동으로 연결한다.")

        self.say(
            f"시작 — {cfg.interval_minutes:g}분 간격 "
            f"(±{cfg.jitter_seconds:g}초), 액션 {len(self._actions)}개"
            + (" [DRY-RUN]" if self.backend.name == "dry-run" else "")
        )

        while not stop.is_set():
            wait = cfg.interval_seconds()
            if deadline is not None:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    self.say("설정한 최대 실행 시간에 도달해서 종료한다.")
                    break
                wait = min(wait, remaining)

            self.say(f"다음 입력까지 {wait/60:.1f}분 대기")
            if stop.wait(wait):
                break

            self.say(self.tick())

        self.say(
            f"정지 — 전송 {self.stats.sent}회 / 건너뜀 {self.stats.skipped}회 / "
            f"오류 {self.stats.errors}회 / 가동 {self.stats.uptime()/60:.1f}분"
        )


# ---------------------------------------------------------------------------
# 설정 저장 / 불러오기
# ---------------------------------------------------------------------------

def config_path() -> str:
    base = os.environ.get("APPDATA") or os.path.expanduser("~/.config")
    return os.path.join(base, "RobloxAFK", "config.json")


def load_config() -> Config:
    import json

    path = config_path()
    cfg = Config()
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, ValueError):
        return cfg

    for key, value in data.items():
        if hasattr(cfg, key):
            setattr(cfg, key, value)
    try:
        cfg.validate()
    except ValueError:
        return Config()
    return cfg


def save_config(cfg: Config) -> None:
    import json
    from dataclasses import asdict

    path = config_path()
    data = asdict(cfg)
    data.pop("dry_run", None)  # 실행 시 옵션이라 저장하지 않는다
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except OSError as exc:
        log.warning("설정 저장 실패: %s", exc)


# ---------------------------------------------------------------------------
# GUI
# ---------------------------------------------------------------------------

def run_gui(cfg: Config) -> int:
    import queue
    import tkinter as tk
    from tkinter import messagebox, ttk

    log_queue: "queue.Queue[str]" = queue.Queue()

    root = tk.Tk()
    root.title(f"{APP_NAME} v{APP_VERSION}")
    root.geometry("520x600")
    root.minsize(480, 540)

    state = {
        "engine": None,       # AntiAFK
        "thread": None,       # threading.Thread
        "stop": None,         # threading.Event
        "next_at": None,      # time.monotonic() 기준 다음 입력 시각
    }

    # --- 위젯 구성 ---------------------------------------------------------
    pad = {"padx": 10, "pady": 4}

    header = ttk.Frame(root)
    header.pack(fill="x", **pad)
    ttk.Label(header, text="로블록스 잠수 방지", font=("Malgun Gothic", 14, "bold")).pack(anchor="w")
    status_var = tk.StringVar(value="대기 중")
    ttk.Label(header, textvariable=status_var, foreground="#555").pack(anchor="w")

    settings = ttk.LabelFrame(root, text="설정")
    settings.pack(fill="x", **pad)

    row = ttk.Frame(settings)
    row.pack(fill="x", padx=8, pady=6)
    ttk.Label(row, text="입력 간격(분)").pack(side="left")
    interval_var = tk.DoubleVar(value=cfg.interval_minutes)
    ttk.Spinbox(row, from_=0.5, to=19.0, increment=0.5, width=6,
                textvariable=interval_var).pack(side="left", padx=(8, 20))
    ttk.Label(row, text="흔들림(초)").pack(side="left")
    jitter_var = tk.DoubleVar(value=cfg.jitter_seconds)
    ttk.Spinbox(row, from_=0, to=120, increment=5, width=6,
                textvariable=jitter_var).pack(side="left", padx=8)

    actions_frame = ttk.LabelFrame(root, text="보낼 입력 (여러 개 고르면 무작위로 번갈아 보낸다)")
    actions_frame.pack(fill="x", **pad)
    action_vars = {}
    for action in ACTIONS:
        var = tk.BooleanVar(value=action.key in cfg.action_keys)
        action_vars[action.key] = var
        text = action.label + ("" if action.safe else "  ⚠ 캐릭터가 움직임")
        ttk.Checkbutton(actions_frame, text=text, variable=var).pack(anchor="w", padx=10)

    options = ttk.LabelFrame(root, text="옵션")
    options.pack(fill="x", **pad)
    steal_var = tk.BooleanVar(value=cfg.steal_focus)
    ttk.Checkbutton(options, text="다른 창을 쓰고 있어도 로블록스를 잠깐 활성화해서 입력",
                    variable=steal_var).pack(anchor="w", padx=10)
    restore_var = tk.BooleanVar(value=cfg.restore_focus)
    ttk.Checkbutton(options, text="입력 후 원래 쓰던 창으로 되돌리기",
                    variable=restore_var).pack(anchor="w", padx=10)
    skip_var = tk.BooleanVar(value=cfg.skip_if_user_active_seconds > 0)
    ttk.Checkbutton(options, text="내가 직접 조작 중이면 입력 건너뛰기",
                    variable=skip_var).pack(anchor="w", padx=10)

    buttons = ttk.Frame(root)
    buttons.pack(fill="x", **pad)
    start_btn = ttk.Button(buttons, text="시작")
    start_btn.pack(side="left")
    stop_btn = ttk.Button(buttons, text="정지", state="disabled")
    stop_btn.pack(side="left", padx=6)
    test_btn = ttk.Button(buttons, text="지금 한 번 테스트")
    test_btn.pack(side="left")

    log_frame = ttk.LabelFrame(root, text="기록")
    log_frame.pack(fill="both", expand=True, **pad)
    log_box = tk.Text(log_frame, height=10, wrap="word", state="disabled",
                      font=("Consolas", 9))
    scrollbar = ttk.Scrollbar(log_frame, command=log_box.yview)
    log_box.configure(yscrollcommand=scrollbar.set)
    scrollbar.pack(side="right", fill="y")
    log_box.pack(side="left", fill="both", expand=True, padx=4, pady=4)

    # --- 로직 --------------------------------------------------------------
    def append_log(message: str) -> None:
        log_queue.put(f"[{time.strftime('%H:%M:%S')}] {message}")

    def collect_config() -> Config:
        keys = [k for k, v in action_vars.items() if v.get()]
        return Config(
            interval_minutes=float(interval_var.get()),
            jitter_seconds=float(jitter_var.get()),
            action_keys=keys or list(DEFAULT_ACTION_KEYS),
            steal_focus=steal_var.get(),
            restore_focus=restore_var.get(),
            skip_if_user_active_seconds=45.0 if skip_var.get() else 0.0,
            dry_run=cfg.dry_run,
        )

    def set_running(running: bool) -> None:
        start_btn.config(state="disabled" if running else "normal")
        stop_btn.config(state="normal" if running else "disabled")
        for child in settings.winfo_children() + actions_frame.winfo_children() + options.winfo_children():
            try:
                child.config(state="disabled" if running else "normal")
            except tk.TclError:
                pass

    def on_start() -> None:
        try:
            new_cfg = collect_config()
            new_cfg.validate()
        except ValueError as exc:
            messagebox.showerror("설정 오류", str(exc))
            return

        save_config(new_cfg)
        engine = AntiAFK(new_cfg, on_log=append_log)
        stop = threading.Event()

        def worker() -> None:
            try:
                engine.run(stop)
            except Exception as exc:  # noqa: BLE001
                append_log(f"치명적 오류: {exc}")
            finally:
                root.after(0, lambda: set_running(False))
                root.after(0, lambda: status_var.set("대기 중"))

        thread = threading.Thread(target=worker, daemon=True, name="anti-afk")
        state.update(engine=engine, thread=thread, stop=stop)
        thread.start()
        set_running(True)
        status_var.set("실행 중")

    def on_stop() -> None:
        if state["stop"]:
            state["stop"].set()
            append_log("정지 요청됨…")
        status_var.set("정지하는 중…")

    def on_test() -> None:
        engine = state["engine"] or AntiAFK(collect_config(), on_log=append_log)
        threading.Thread(target=lambda: append_log("[테스트] " + engine.tick()),
                         daemon=True).start()

    start_btn.config(command=on_start)
    stop_btn.config(command=on_stop)
    test_btn.config(command=on_test)

    def pump() -> None:
        while True:
            try:
                line = log_queue.get_nowait()
            except queue.Empty:
                break
            log_box.config(state="normal")
            log_box.insert("end", line + "\n")
            # 로그가 무한히 쌓이지 않게 최근 500줄만 유지한다.
            if int(log_box.index("end-1c").split(".")[0]) > 500:
                log_box.delete("1.0", "100.0")
            log_box.see("end")
            log_box.config(state="disabled")

        engine = state["engine"]
        if engine and state["thread"] and state["thread"].is_alive():
            status_var.set(
                f"실행 중 · 전송 {engine.stats.sent}회 · "
                f"건너뜀 {engine.stats.skipped}회 · "
                f"마지막: {engine.stats.last_action}"
            )
        root.after(250, pump)

    def on_close() -> None:
        if state["stop"]:
            state["stop"].set()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    append_log(f"{APP_NAME} v{APP_VERSION} 준비 완료")
    if not IS_WINDOWS:
        append_log("경고: Windows 가 아니라 실제 입력은 전송되지 않는다 (동작 확인용).")
    pump()
    root.mainloop()
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _attach_console() -> None:
    """GUI(-noconsole)로 빌드된 exe 를 --cli 로 실행했을 때 부모 콘솔에 붙는다.

    이렇게 하지 않으면 windowed exe 에서는 sys.stdout 이 None 이라 로그가
    아무 데도 보이지 않는다.
    """
    if not IS_WINDOWS:
        return
    try:
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        if kernel32.GetConsoleWindow():
            return  # 이미 콘솔이 있음 (console 빌드 또는 cmd 에서 python 실행)
        ATTACH_PARENT_PROCESS = -1
        if not kernel32.AttachConsole(ATTACH_PARENT_PROCESS):
            if not kernel32.AllocConsole():
                return
        sys.stdout = open("CONOUT$", "w", encoding="utf-8", buffering=1)
        sys.stderr = open("CONOUT$", "w", encoding="utf-8", buffering=1)
    except Exception:  # noqa: BLE001 - 콘솔이 없어도 프로그램은 돌아야 한다
        pass


def run_cli(cfg: Config) -> int:
    _attach_console()
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(message)s",
        datefmt="%H:%M:%S",
    )
    engine = AntiAFK(cfg, on_log=lambda msg: log.info(msg))
    stop = threading.Event()
    try:
        engine.run(stop)
    except KeyboardInterrupt:
        stop.set()
        log.info("사용자가 중단했다 (Ctrl+C).")
    return 0


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="roblox_afk",
        description="로블록스 잠수(AFK) 자동 강퇴 방지 프로그램",
    )
    parser.add_argument("--cli", action="store_true", help="GUI 없이 콘솔로 실행")
    parser.add_argument("-i", "--interval", type=float, metavar="분",
                        help="입력 간격 (분, 기본 3)")
    parser.add_argument("-j", "--jitter", type=float, metavar="초",
                        help="간격에 더할 무작위 흔들림 (초, 기본 20)")
    parser.add_argument("-a", "--action", action="append", metavar="이름",
                        choices=[a.key for a in ACTIONS],
                        help="보낼 입력 (여러 번 지정 가능). 선택: "
                             + ", ".join(a.key for a in ACTIONS))
    parser.add_argument("--no-steal-focus", action="store_true",
                        help="로블록스가 이미 활성 창일 때만 입력한다")
    parser.add_argument("--no-restore-focus", action="store_true",
                        help="입력 후 원래 창으로 되돌리지 않는다")
    parser.add_argument("--always", action="store_true",
                        help="직접 조작 중이어도 무조건 입력한다")
    parser.add_argument("--max-runtime", type=float, metavar="분", default=None,
                        help="이 시간이 지나면 자동 종료 (기본: 무제한)")
    parser.add_argument("--dry-run", action="store_true",
                        help="실제 입력 없이 동작만 확인")
    parser.add_argument("--list-actions", action="store_true", help="가능한 입력 목록 출력")
    parser.add_argument("--version", action="version", version=f"{APP_NAME} {APP_VERSION}")
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv)

    if args.list_actions:
        print("사용 가능한 입력:")
        for action in ACTIONS:
            mark = "안전" if action.safe else "주의: 캐릭터가 움직임"
            print(f"  {action.key:<14} {action.label}  ({mark})")
        return 0

    cfg = load_config()
    if args.interval is not None:
        cfg.interval_minutes = args.interval
    if args.jitter is not None:
        cfg.jitter_seconds = args.jitter
    if args.action:
        cfg.action_keys = list(dict.fromkeys(args.action))
    if args.no_steal_focus:
        cfg.steal_focus = False
    if args.no_restore_focus:
        cfg.restore_focus = False
    if args.always:
        cfg.skip_if_user_active_seconds = 0.0
    if args.max_runtime is not None:
        cfg.max_runtime_minutes = args.max_runtime
    cfg.dry_run = args.dry_run

    try:
        cfg.validate()
    except ValueError as exc:
        print(f"설정 오류: {exc}", file=sys.stderr)
        return 2

    if args.cli:
        return run_cli(cfg)

    try:
        return run_gui(cfg)
    except ImportError:
        print("tkinter 를 못 찾았다. --cli 로 실행한다.", file=sys.stderr)
        return run_cli(cfg)


if __name__ == "__main__":
    sys.exit(main())
