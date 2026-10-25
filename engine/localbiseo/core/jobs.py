from __future__ import annotations

import threading
import time
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any, Callable

from .errors import AppError, Cancelled


@dataclass
class Job:
    id: str
    kind: str
    title: str
    status: str = "queued"  # queued | running | done | error | cancelled
    progress: float = 0.0
    message: str = ""
    result: Any = None
    error: str | None = None
    created_at: float = field(default_factory=time.time)
    finished_at: float | None = None
    _cancel: threading.Event = field(default_factory=threading.Event, repr=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "kind": self.kind,
            "title": self.title,
            "status": self.status,
            "progress": round(self.progress, 4),
            "message": self.message,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "finished_at": self.finished_at,
        }


class JobContext:
    """작업 함수에 넘겨지는 진행률/취소 핸들."""

    def __init__(self, job: Job):
        self._job = job

    def progress(self, value: float, message: str | None = None) -> None:
        self._job.progress = max(0.0, min(1.0, value))
        if message is not None:
            self._job.message = message
        self.check()

    def check(self) -> None:
        if self._job._cancel.is_set():
            raise Cancelled()

    @property
    def cancelled(self) -> bool:
        return self._job._cancel.is_set()


class NullContext(JobContext):
    """작업 큐 밖(테스트, 동기 호출)에서 쓰는 빈 컨텍스트."""

    def __init__(self):
        super().__init__(Job(id="-", kind="sync", title=""))


class JobManager:
    def __init__(self, max_workers: int = 2, keep: int = 200):
        self._pool = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="job")
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._keep = keep

    def submit(self, kind: str, title: str, fn: Callable[..., Any], *args, **kwargs) -> Job:
        job = Job(id=uuid.uuid4().hex[:12], kind=kind, title=title)
        with self._lock:
            self._jobs[job.id] = job
            self._trim()
        self._pool.submit(self._run, job, fn, args, kwargs)
        return job

    def _run(self, job: Job, fn, args, kwargs) -> None:
        if job._cancel.is_set():
            job.status = "cancelled"
            job.finished_at = time.time()
            return
        job.status = "running"
        try:
            job.result = fn(JobContext(job), *args, **kwargs)
            job.status = "done"
            job.progress = 1.0
        except Cancelled:
            job.status = "cancelled"
        except AppError as e:
            job.status = "error"
            job.error = e.message
        except Exception as e:  # noqa: BLE001 - 작업 실패는 사용자에게 보여준다
            traceback.print_exc()
            job.status = "error"
            job.error = f"처리 중 오류가 났어요: {e}"
        finally:
            job.finished_at = time.time()

    def _trim(self) -> None:
        finished = [j for j in self._jobs.values() if j.finished_at]
        if len(self._jobs) <= self._keep:
            return
        for j in sorted(finished, key=lambda j: j.finished_at or 0)[: len(self._jobs) - self._keep]:
            self._jobs.pop(j.id, None)

    def get(self, job_id: str) -> Job | None:
        return self._jobs.get(job_id)

    def list(self) -> list[Job]:
        return sorted(self._jobs.values(), key=lambda j: j.created_at, reverse=True)

    def cancel(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        if not job or job.finished_at:
            return False
        job._cancel.set()
        return True

    def wait(self, job_id: str, timeout: float = 60) -> Job:
        """테스트용: 작업이 끝날 때까지 기다린다."""
        deadline = time.time() + timeout
        job = self._jobs[job_id]
        while not job.finished_at and time.time() < deadline:
            time.sleep(0.02)
        return job

    def shutdown(self) -> None:
        for job in self._jobs.values():
            job._cancel.set()
        self._pool.shutdown(wait=False, cancel_futures=True)
