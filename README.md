# MachineVision
MachineVision is now a complete full-stack project:
- React frontend (`frontend/frontend`)
- FastAPI backend (`backend`)
- AI inference service (`ai-services`)
- Worker orchestration layer (`workers`)

## What is implemented
- Upload a video in the frontend.
- Frontend sends it to backend `/api/analyze`.
- Backend creates an async analysis job and runs AI inference in workers.
- AI service samples video frames and runs pretrained visual inference (with heuristic fallback).
- Frontend polls job status and renders real detections from backend results.

## Run locally
1. Install frontend dependencies:
   - `npm --prefix frontend/frontend install`
2. Install backend dependencies:
   - `pip install -r backend/requirements.txt`
   - `pip install -r ai-services/requirements.txt`
3. Start backend API:
   - `python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload`
4. **Start Workers/AI Service (Required for Detections):**
   - Open a new terminal and run the worker entry point (e.g., `python -m workers.main` or similar).
5. Start frontend:
   - (Optional) Set `REACT_APP_API_BASE_URL=http://localhost:8000`
   - `npm --prefix frontend/frontend start`

Frontend reads backend URL from `REACT_APP_API_BASE_URL` (defaults to `http://localhost:8000`).

## API endpoints
- `GET /health`
- `POST /api/analyze` (multipart file upload, async job creation)
- `GET /api/jobs/{jobId}` (job status)
- `GET /api/jobs/{jobId}/result` (completed result)
- `POST /api/analyze-sync` (single-request sync analysis)

## Notes
- If model weights cannot be downloaded/loaded, the AI service automatically falls back to visual-heuristic predictions, so the pipeline still works.
- Uploaded video analysis in UI now uses backend AI response; static uploaded detections are used only as fallback if backend is unavailable.

## Deploy on Railway
Deploy this repo as two Railway services.

### 1. Backend service
- Create a Railway service from this repo.
- Set `Root Directory` to `/`.
- Set `Config File Path` to `/backend/railway.json`.
- Generate a public domain for the service.

Environment variables for backend:
- `FRONTEND_ORIGIN=https://your-frontend-domain`
- `OPENAI_API_KEY=...` if you want GPT-4o VLM inference
- Optional: `WORKER_COUNT=2`
- Optional: `AI_SAMPLE_INTERVAL_SEC=2.0`
- Optional: `AI_MAX_FRAMES=24`
- Optional: `VLM_MAX_CROPS=10`

The backend serves:
- API routes such as `/api/analyze`
- public crop images under `/public-images/...`

### 2. Frontend service
- Create a second Railway service from the same repo.
- Set `Root Directory` to `/frontend/frontend`.
- Set `Config File Path` to `/frontend/frontend/railway.json`.
- Generate a public domain for the service.

Environment variables for frontend:
- `REACT_APP_API_BASE_URL=https://your-backend-domain`

### 3. Connect them
- Put the final frontend domain into the backend `FRONTEND_ORIGIN`.
- Put the final backend domain into the frontend `REACT_APP_API_BASE_URL`.
- Redeploy both services after setting env vars.

### 4. Why this setup
- Frontend is a static React build served by `serve`.
- Backend stays at repo root so it can import `backend`, `ai-services`, and `workers`.
- Uploaded AI crop images become public backend URLs, which is required for one-click Google image search.
