from __future__ import annotations

import base64
import os
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus

import cv2
import numpy as np

from ai_services.yolo_detector import YoloDetector, padded_crop
from ai_services.vlm.openai_gpt4o import infer_product_from_crop


CATEGORIES = ["Fashion", "Luxury", "Tech", "Food", "Travel", "Lifestyle"]

CATEGORY_IMAGE_FALLBACKS = {
    "Fashion": "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    "Luxury": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=80",
    "Tech": "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    "Food": "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80",
    "Travel": "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=900&q=80",
    "Lifestyle": "https://images.unsplash.com/photo-1616594039964-3f4d5f5f322d?auto=format&fit=crop&w=900&q=80",
}


def _build_google_search_url(query: str) -> str:
    return f"https://www.google.com/search?q={quote_plus(query.strip())}"


def _build_google_shopping_url(query: str) -> str:
    return f"https://www.google.com/search?tbm=shop&q={quote_plus(query.strip())}"


def _clean_hint_list(values: Any) -> List[str]:
    if not isinstance(values, list):
        return []
    cleaned: List[str] = []
    seen = set()
    for value in values:
        hint = str(value or "").strip()
        normalized = hint.lower()
        if not hint or normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(hint)
    return cleaned[:4]


def _format_duration(length_sec: int) -> str:
    mins = max(length_sec, 0) // 60
    secs = max(length_sec, 0) % 60
    return f"{mins:02d}:{secs:02d}"


class VlmVideoAIService:
    def __init__(
        self,
        *,
        sample_interval_sec: float = 2.0,
        max_frames: int = 24,
        yolo_model: str = "yolov8n.pt",
        yolo_conf: float = 0.25,
        openai_model: str = "gpt-4o-mini",
        max_crops: int = 10,
        tmp_dir: Optional[str] = None,
    ) -> None:
        self.sample_interval_sec = sample_interval_sec
        self.max_frames = max_frames
        self.max_crops = max_crops
        self.openai_model = openai_model

        self.detector = YoloDetector(
            model_name=yolo_model,
            conf_threshold=yolo_conf,
        )

        self._tmp_dir = Path(tmp_dir or (Path(tempfile.gettempdir()) / "machinevision_vlm_crops"))
        self._tmp_dir.mkdir(parents=True, exist_ok=True)

    def analyze_video(self, video_path: str, video_title: str) -> Dict[str, Any]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError("No readable frames found in video")

        fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        total_sec = frame_count / fps if fps > 0 and frame_count > 0 else 0
        length_sec = int(total_sec) if total_sec > 0 else 1

        interval = max(self.sample_interval_sec, 0.8)
        target_times: List[float] = []
        t = 0.0
        while t <= max(total_sec, 1.0) and len(target_times) < self.max_frames:
            target_times.append(t)
            t += interval

        detections_out: List[Dict[str, Any]] = []
        crop_idx = 0

        for sec in target_times:
            cap.set(cv2.CAP_PROP_POS_MSEC, sec * 1000)
            ok, frame = cap.read()
            if not ok or frame is None:
                continue

            dets = self.detector.detect(frame)
            # Sort by confidence desc.
            dets = sorted(dets, key=lambda d: d.conf, reverse=True)

            for det in dets[: max(1, self.max_crops - crop_idx)]:
                crop_bgr, _box = padded_crop(frame, det)
                crop_path = self._save_crop_png(crop_bgr)
                try:
                    vlm_data = infer_product_from_crop(
                        image_path=crop_path,
                        model=self.openai_model,
                    )
                finally:
                    Path(crop_path).unlink(missing_ok=True)

                product_type = vlm_data.get("product_type")
                brand = vlm_data.get("brand")
                model = vlm_data.get("model")
                official_brand_site = vlm_data.get("official_brand_site")
                search_query = vlm_data.get("search_query")
                description = vlm_data.get("description") or ""
                visual_hints = _clean_hint_list(vlm_data.get("visual_hints"))
                confidence = float(vlm_data.get("confidence") or 0.0)

                name = self._build_name(product_type=product_type, brand=brand, model=model)
                category = self._infer_category_from_text(str(product_type or ""), str(brand or ""))
                exact_query = (
                    str(search_query or "").strip()
                    or str(name or "").strip()
                    or str(product_type or "").strip()
                    or "product"
                )

                det_obj = {
                    "id": f"ai-{crop_idx+1}",
                    "name": name,
                    "brand": brand,
                    "model": model,
                    "productType": product_type,
                    "confidence": round(max(min(confidence, 0.99), 0.35), 3),
                    "category": category,
                    "timestampSec": int(max(sec, 0)),
                    "image": self._crop_to_data_url(crop_bgr)
                    or CATEGORY_IMAGE_FALLBACKS.get(category, CATEGORY_IMAGE_FALLBACKS["Lifestyle"]),
                    "buyLink": f"https://www.amazon.com/s?k={quote_plus(exact_query)}",
                    "externalLink": _build_google_search_url(exact_query),
                    "exactSearchLink": _build_google_search_url(exact_query),
                    "googleShoppingLink": _build_google_shopping_url(exact_query),
                    "brandLink": str(official_brand_site or "").strip()
                    or _build_google_search_url(str(brand or name or product_type or "brand")),
                    "searchQuery": exact_query,
                    "searchHints": visual_hints,
                    "summary": description
                    or f"VLM inferred {name} from the video crop with {round(confidence*100)}% confidence.",
                }

                detections_out.append(det_obj)
                crop_idx += 1

                if crop_idx >= self.max_crops:
                    break

            if crop_idx >= self.max_crops:
                break

        cap.release()

        timeline_events = [dict(item) for item in detections_out]
        for index, item in enumerate(timeline_events, start=1):
            item["id"] = f"event-{index}"

        if not detections_out:
            # last-resort fallback: keep UI working
            detections_out = [
                {
                    "id": "ai-1",
                    "name": "Lifestyle Signal",
                    "confidence": 0.52,
                    "category": "Lifestyle",
                    "timestampSec": 0,
                    "image": CATEGORY_IMAGE_FALLBACKS["Lifestyle"],
                    "buyLink": "https://www.amazon.com/s?k=product",
                    "externalLink": "https://www.google.com/search?q=product",
                    "exactSearchLink": "https://www.google.com/search?q=product",
                    "googleShoppingLink": "https://www.google.com/search?tbm=shop&q=product",
                    "brandLink": "https://www.google.com/search?q=product+brand",
                    "searchQuery": "product",
                    "searchHints": ["product close-up", "object from video", "consumer product"],
                    "summary": "No confident crops were found; generated a generic fallback suggestion.",
                }
            ]
            timeline_events = [dict(detections_out[0], id="event-1")]
        else:
            detections_out = self._merge_similar_detections(detections_out)

        return {
            "id": f"uploaded-{uuid.uuid4().hex[:8]}",
            "title": video_title,
            "duration": _format_duration(length_sec),
            "lengthSec": max(length_sec, 1),
            "detectionCount": len(detections_out),
            "tags": CATEGORIES,
            "detections": detections_out,
            "timelineEvents": timeline_events,
        }

    def _merge_similar_detections(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        merged: Dict[Tuple[str, str], Dict[str, Any]] = {}
        for detection in detections:
            key = (
                str(detection.get("name") or "").strip().lower(),
                str(detection.get("category") or "").strip().lower(),
            )
            if not key[0]:
                key = (f"unnamed-{len(merged)}", key[1])
            existing = merged.get(key)
            if existing is None:
                merged[key] = {
                    **dict(detection),
                    "_timestamps": [int(detection.get("timestampSec") or 0)],
                }
                continue

            existing["confidence"] = max(
                float(existing.get("confidence") or 0.0),
                float(detection.get("confidence") or 0.0),
            )
            existing["_timestamps"].append(int(detection.get("timestampSec") or 0))
            existing["timestampSec"] = round(sum(existing["_timestamps"]) / len(existing["_timestamps"]))
            if len(str(detection.get("summary") or "")) > len(str(existing.get("summary") or "")):
                existing["summary"] = detection.get("summary")
            if float(detection.get("confidence") or 0.0) >= float(existing.get("confidence") or 0.0):
                existing["image"] = detection.get("image") or existing.get("image")
                existing["buyLink"] = detection.get("buyLink") or existing.get("buyLink")
                existing["externalLink"] = detection.get("externalLink") or existing.get("externalLink")
                existing["exactSearchLink"] = (
                    detection.get("exactSearchLink") or existing.get("exactSearchLink")
                )
                existing["googleShoppingLink"] = (
                    detection.get("googleShoppingLink") or existing.get("googleShoppingLink")
                )
                existing["brandLink"] = detection.get("brandLink") or existing.get("brandLink")
                existing["searchQuery"] = detection.get("searchQuery") or existing.get("searchQuery")
                existing["brand"] = detection.get("brand") or existing.get("brand")
                existing["model"] = detection.get("model") or existing.get("model")
                existing["productType"] = detection.get("productType") or existing.get("productType")

        merged_list = sorted(
            merged.values(),
            key=lambda item: (
                -float(item.get("confidence") or 0.0),
                int(item.get("timestampSec") or 0),
            ),
        )[: self.max_crops]

        for index, item in enumerate(merged_list, start=1):
            item["id"] = f"ai-{index}"
            item.pop("_timestamps", None)

        return merged_list

    def _save_crop_png(self, crop_bgr) -> str:
        # VLM expects an image; we encode to PNG for portability.
        filename = f"crop_{uuid.uuid4().hex[:10]}.png"
        path = self._tmp_dir / filename
        # cv2 writes BGR fine
        cv2.imwrite(str(path), crop_bgr)
        return str(path)

    @staticmethod
    def _crop_to_data_url(crop_bgr) -> str:
        ok, encoded = cv2.imencode(".jpg", crop_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 78])
        if not ok:
            return ""
        return f"data:image/jpeg;base64,{base64.b64encode(encoded.tobytes()).decode('ascii')}"

    def _infer_category_from_text(self, product_type: str, brand: str) -> str:
        lower = f"{product_type} {brand}".lower()
        if any(k in lower for k in ["shoe", "sneaker", "dress", "bag", "jacket", "watch", "luxury"]):
            # more nuanced would come from model, but keep simple.
            if any(k in lower for k in ["watch", "luxury", "gold", "jewel"]):
                return "Luxury"
            return "Fashion"
        if any(k in lower for k in ["laptop", "phone", "camera", "keyboard", "tech"]):
            return "Tech"
        if any(k in lower for k in ["hotel", "beach", "travel", "resort", "airport", "city"]):
            return "Travel"
        if any(k in lower for k in ["pizza", "coffee", "burger", "restaurant", "wine", "cup"]):
            return "Food"
        return "Lifestyle"

    def _build_name(
        self,
        product_type: Optional[str],
        brand: Optional[str],
        model: Optional[str] = None,
    ) -> str:
        pt = (product_type or "Product").strip()
        br = (brand or "").strip()
        md = (model or "").strip()
        parts = [part for part in [br, md, pt] if part]
        if parts:
            return " ".join(parts).strip()
        return pt or "Product"

