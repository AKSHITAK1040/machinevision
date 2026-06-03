from __future__ import annotations

import base64
import os
import shutil
import sys
import tempfile
import time
import uuid
from pathlib import Path

# Load .env if present (so users can place OPENAI_API_KEY in backend/.env)
try:
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except Exception:
    # dotenv is optional; env vars can be supplied by the OS/CI.
    pass

from typing import Dict

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(REPO_ROOT / "ai-services"))
sys.path.append(str(REPO_ROOT / "workers"))

from ai_services import VideoAIService  # noqa: E402
from workers import AnalysisJobRunner  # noqa: E402


ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/webm",
}

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
WORKER_COUNT = int(os.getenv("WORKER_COUNT", "2"))
PUBLIC_IMAGE_ROOT = Path(tempfile.gettempdir()) / "machinevision_public_images"
PUBLIC_IMAGE_TTL_SEC = int(os.getenv("PUBLIC_IMAGE_TTL_SEC", "21600"))

app = FastAPI(title="MachineVision Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
PUBLIC_IMAGE_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/public-images", StaticFiles(directory=str(PUBLIC_IMAGE_ROOT)), name="public-images")

ai_service = VideoAIService(
    sample_interval_sec=float(os.getenv("AI_SAMPLE_INTERVAL_SEC", "2.0")),
    max_frames=int(os.getenv("AI_MAX_FRAMES", "24")),
)
job_runner = AnalysisJobRunner(worker_count=WORKER_COUNT)


def _store_upload(file: UploadFile) -> Path:
    suffix = Path(file.filename or "uploaded.mp4").suffix or ".mp4"
    temp_dir = Path(tempfile.gettempdir()) / "machinevision_uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    target_path = temp_dir / f"mv_{next(tempfile._get_candidate_names())}{suffix}"  # noqa: SLF001
    with target_path.open("wb") as output:
        shutil.copyfileobj(file.file, output)
    return target_path


def _guess_extension_from_mime(mime_type: str) -> str:
    mime_type = mime_type.lower().strip()
    if "png" in mime_type:
        return ".png"
    if "webp" in mime_type:
        return ".webp"
    if "gif" in mime_type:
        return ".gif"
    return ".jpg"


def _cleanup_public_images() -> None:
    cutoff = time.time() - PUBLIC_IMAGE_TTL_SEC
    for path in PUBLIC_IMAGE_ROOT.iterdir():
        try:
            if path.is_file() and path.stat().st_mtime < cutoff:
                path.unlink(missing_ok=True)
        except OSError:
            continue


def _persist_data_url_image(data_url: str, request: Request) -> str:
    header, encoded = data_url.split(",", 1)
    mime_type = header.partition(":")[2].partition(";")[0] or "image/jpeg"
    file_ext = _guess_extension_from_mime(mime_type)
    file_name = f"{uuid.uuid4().hex}{file_ext}"
    target_path = PUBLIC_IMAGE_ROOT / file_name
    target_path.write_bytes(base64.b64decode(encoded))
    return str(request.url_for("public-images", path=file_name))


def _make_detection_images_public(payload: Dict, request: Request) -> Dict:
    _cleanup_public_images()
    detections = payload.get("detections")
    if not isinstance(detections, list):
        return payload

    for item in detections:
        image = item.get("image")
        if isinstance(image, str) and image.startswith("data:image/"):
            item["image"] = _persist_data_url_image(image, request)
    return payload


@app.get("/health")
def health() -> Dict:
    return {"status": "ok", "service": "machinevision-backend"}


@app.post("/api/analyze")
async def analyze_video(file: UploadFile = File(...)) -> Dict:
    if file.content_type and file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported video type: {file.content_type}")
    stored_path = _store_upload(file)
    original_name = file.filename or "uploaded_video"

    def _handler() -> Dict:
        try:
            return ai_service.analyze_video(str(stored_path), original_name)
        finally:
            if stored_path.exists():
                stored_path.unlink(missing_ok=True)

    job_id = job_runner.submit(file_name=original_name, handler=_handler)
    return {"jobId": job_id, "status": "queued"}


@app.get("/api/jobs/{job_id}")
def get_job_status(job_id: str) -> Dict:
    status = job_runner.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@app.get("/api/jobs/{job_id}/result")
def get_job_result(job_id: str, request: Request) -> Dict:
    status = job_runner.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    if status["status"] == "failed":
        raise HTTPException(status_code=500, detail=status["error"] or "Analysis failed")
    if status["status"] != "completed":
        raise HTTPException(status_code=202, detail="Job is still processing")
    result = job_runner.get_result(job_id)
    if result is None:
        raise HTTPException(status_code=500, detail="Result is unavailable")
    return _make_detection_images_public(result, request)


@app.post("/api/analyze-sync")
async def analyze_video_sync(request: Request, file: UploadFile = File(...)) -> Dict:
    # Some clients (curl, certain browsers) may not reliably send `content_type`.
    # Trust the filename extension as a best-effort fallback.
    ct = (file.content_type or "").lower().strip()
    if ct and ct not in ALLOWED_VIDEO_TYPES:
        ext = (Path(file.filename or "").suffix or "").lower()
        allowed_ext = {".mp4", ".webm", ".mov", ".mkv", ".avi"}
        if ext not in allowed_ext:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported video type: {file.content_type} (ext={ext})",
            )

    stored_path = _store_upload(file)
    original_name = file.filename or "uploaded_video"
    try:
        result = ai_service.analyze_video(str(stored_path), original_name)
        return _make_detection_images_public(result, request)
    finally:
        if stored_path.exists():
            stored_path.unlink(missing_ok=True)
