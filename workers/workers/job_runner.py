from __future__ import annotations

import threading
import traceback
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Dict, Optional


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class AnalysisJob:
    job_id: str
    file_name: str
    status: str = "queued"
    created_at: str = field(default_factory=_now_iso)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None
    result: Optional[Dict] = None
    future: Optional[Future] = None


class AnalysisJobRunner:
    def __init__(self, worker_count: int = 2) -> None:
        self._executor = ThreadPoolExecutor(max_workers=worker_count, thread_name_prefix="mv-worker")
        self._jobs: Dict[str, AnalysisJob] = {}
        self._lock = threading.Lock()

    def submit(self, file_name: str, handler: Callable[[], Dict]) -> str:
        job_id = f"job-{uuid.uuid4().hex[:10]}"
        job = AnalysisJob(job_id=job_id, file_name=file_name)
        with self._lock:
            self._jobs[job_id] = job

        def _run() -> Dict:
            self._set_job(job_id, status="running", started_at=_now_iso())
            try:
                result = handler()
                self._set_job(job_id, status="completed", result=result, completed_at=_now_iso())
                return result
            except Exception as exc:  # pragma: no cover - defensive
                self._set_job(
                    job_id,
                    status="failed",
                    error=f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}",
                    completed_at=_now_iso(),
                )
                raise

        future = self._executor.submit(_run)
        with self._lock:
            self._jobs[job_id].future = future
        return job_id

    def get_status(self, job_id: str) -> Optional[Dict]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            return {
                "jobId": job.job_id,
                "fileName": job.file_name,
                "status": job.status,
                "createdAt": job.created_at,
                "startedAt": job.started_at,
                "completedAt": job.completed_at,
                "error": job.error,
            }

    def get_result(self, job_id: str) -> Optional[Dict]:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None
            return job.result

    def _set_job(self, job_id: str, **updates) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return
            for key, value in updates.items():
                setattr(job, key, value)
