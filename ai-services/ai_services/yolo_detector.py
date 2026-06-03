from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import os


@dataclass
class Detection:
    x1: int
    y1: int
    x2: int
    y2: int
    conf: float
    cls_id: int
    cls_name: str


class YoloDetector:
    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        device: Optional[str] = None,
        conf_threshold: float = 0.25,
        iou_threshold: float = 0.45,
    ) -> None:
        """YOLO detector wrapper using Ultralytics."""

        try:
            from ultralytics import YOLO
        except Exception as e:  # pragma: no cover
            raise RuntimeError(
                "ultralytics package not installed. Install `ultralytics` to enable YOLO detections."
            ) from e

        self._yolo = YOLO(model_name)
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.device = device

    def detect(self, bgr_image) -> List[Detection]:
        results = self._yolo.predict(
            bgr_image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
        )
        if not results:
            return []

        r = results[0]
        names = getattr(r, "names", None) or {}

        dets: List[Detection] = []
        # boxes: xyxy, conf, cls
        for xyxy, conf, cls_id in zip(r.boxes.xyxy, r.boxes.conf, r.boxes.cls):
            x1, y1, x2, y2 = [int(v.item()) for v in xyxy]
            conf_f = float(conf.item())
            cls_i = int(cls_id.item())
            cls_name = names.get(cls_i, str(cls_i))
            dets.append(
                Detection(
                    x1=x1,
                    y1=y1,
                    x2=x2,
                    y2=y2,
                    conf=conf_f,
                    cls_id=cls_i,
                    cls_name=cls_name,
                )
            )
        return dets


def clamp_box(x1: int, y1: int, x2: int, y2: int, w: int, h: int) -> Tuple[int, int, int, int]:
    x1 = max(0, min(x1, w - 1))
    y1 = max(0, min(y1, h - 1))
    x2 = max(0, min(x2, w))
    y2 = max(0, min(y2, h))
    if x2 <= x1:
        x2 = min(w, x1 + 1)
    if y2 <= y1:
        y2 = min(h, y1 + 1)
    return x1, y1, x2, y2


def padded_crop(
    bgr_image,
    det: Detection,
    pad_ratio: float = 0.10,
    min_side_px: int = 40,
):
    import cv2

    h, w = bgr_image.shape[:2]
    bw = det.x2 - det.x1
    bh = det.y2 - det.y1

    pad_x = int(bw * pad_ratio)
    pad_y = int(bh * pad_ratio)

    x1, y1, x2, y2 = clamp_box(det.x1 - pad_x, det.y1 - pad_y, det.x2 + pad_x, det.y2 + pad_y, w, h)

    crop = bgr_image[y1:y2, x1:x2]

    ch, cw = crop.shape[:2]
    if cw < min_side_px or ch < min_side_px:
        # Upscale small crops to help the VLM.
        scale = max(min_side_px / max(cw, 1), min_side_px / max(ch, 1), 1.0)
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        crop = cv2.resize(crop, (new_w, new_h), interpolation=cv2.INTER_CUBIC)

    return crop, (x1, y1, x2, y2)

