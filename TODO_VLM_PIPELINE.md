# TODO: YOLO + VLM (GPT-4o) pipeline

- [ ] Create VLM client (OpenAI GPT-4o) module
  - [ ] Add provider code under `ai-services/ai_services/vlm/openai_gpt4o.py`
  - [ ] Implement `infer_product_from_crop(crop_path, prompt) -> structured JSON`
- [ ] Add YOLO inference + crop extraction
  - [ ] Create `ai-services/ai_services/yolo_detector.py`
  - [ ] Use Ultralytics YOLOv8/YOLO11 to detect candidate product objects
  - [ ] Extract crops from frames (padding + min size)
- [ ] Implement end-to-end analyzer
  - [ ] Create `ai-services/ai_services/vlm_video_ai_service.py`
  - [ ] Pipeline: extract frames -> detect -> crop -> VLM -> aggregate detections
  - [ ] Output format must remain compatible with frontend: `detections[]` with `id,name,confidence,category,timestampSec,image,buyLink,externalLink,summary`
- [ ] Wire backend to new analyzer
  - [ ] Update `ai-services/ai_services/video_ai_service.py` (or swap export) to call new pipeline
- [ ] Add dependencies
  - [ ] Add ultralytics + openai python sdk to `backend/requirements.txt` or new requirements file
- [ ] Add environment variables
  - [ ] `OPENAI_API_KEY` (required for GPT-4o)
- [ ] Verify end-to-end
  - [ ] Start backend
  - [ ] Upload a short mp4
  - [ ] Confirm `/api/analyze` + `/result` returns VLM-enriched brand/product fields

