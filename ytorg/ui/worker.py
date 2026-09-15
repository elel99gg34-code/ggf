"""백그라운드 작업.

API 호출을 UI 스레드에서 하면 앱이 통째로 얼어붙는다. 동기화는 수십 초,
대량 작업은 몇 분씩 걸리므로 반드시 별도 스레드에서 돌린다.

SQLite 연결은 Database가 스레드별로 관리하므로(threading.local) 워커
스레드에서 DB를 만져도 안전하다.
"""

from __future__ import annotations

import logging
import traceback

from PySide6.QtCore import QThread, Signal

log = logging.getLogger(__name__)


class Worker(QThread):
    """함수 하나를 백그라운드에서 돌리고 결과를 시그널로 돌려준다.

    대상 함수가 progress 인자를 받으면 진행 상황을 UI로 흘려보낸다.
    """

    progressed = Signal(int, int, str)   # 완료, 전체, 메시지
    succeeded = Signal(object)
    failed = Signal(str)

    def __init__(self, fn, *args, wants_progress: bool = True, **kwargs):
        super().__init__()
        self._fn = fn
        self._args = args
        self._kwargs = kwargs
        self._wants_progress = wants_progress

    def run(self) -> None:
        try:
            if self._wants_progress:
                self._kwargs["progress"] = self._emit_progress
            result = self._fn(*self._args, **self._kwargs)
        except Exception as exc:  # noqa: BLE001 - 워커에서 새는 예외는 앱을 죽인다
            log.error("백그라운드 작업 실패: %s\n%s", exc, traceback.format_exc())
            self.failed.emit(str(exc))
        else:
            self.succeeded.emit(result)

    def _emit_progress(self, *args) -> None:
        """호출부마다 progress 시그니처가 조금씩 달라 둘 다 받아준다.

        동기화: (단계이름, 완료, 전체)
        작업실행: (완료, 전체, 메시지)
        """
        if len(args) != 3:
            return
        first, second, third = args
        if isinstance(first, str):
            self.progressed.emit(int(second), int(third), first)
        else:
            self.progressed.emit(int(first), int(second), str(third))
