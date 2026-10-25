from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request

from .db import Database
from .jobs import JobManager


@dataclass
class AppContext:
    db: Database
    jobs: JobManager
    data_dir: Path


def get_ctx(request: Request) -> AppContext:
    return request.app.state.ctx


Ctx = Annotated[AppContext, Depends(get_ctx)]


def job_ref(job) -> dict:
    return {"job_id": job.id, "job": job.to_dict()}
