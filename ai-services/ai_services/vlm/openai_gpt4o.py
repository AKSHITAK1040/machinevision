from __future__ import annotations

import base64
import json
import os
from typing import Any, Dict, Optional


def _b64_png_from_path(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def infer_product_from_crop(
    *,
    image_path: str,
    model: str = "gpt-4o-mini",
    api_key: Optional[str] = None,
    timeout_sec: int = 120,
) -> Dict[str, Any]:
    """Infer product fields from an image crop using OpenAI GPT-4o.

    Returns JSON with (best-effort) keys:
      - product_type
      - brand
      - model
      - official_brand_site
      - search_query
      - description
      - visual_hints
      - confidence (0..1)
    """

    # Lazy import so the repo can still run without openai installed.
    try:
        from openai import OpenAI
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "openai package not installed. Install `openai` to enable GPT-4o VLM inference."
        ) from e

    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = OpenAI(api_key=api_key, timeout=timeout_sec)

    b64 = _b64_png_from_path(image_path)

    # Use a strict JSON-only contract.
    prompt = (
        "You are an expert product visual analyst. "
        "Given an image crop from a video, infer: "
        "1) product_type (noun phrase)\n"
        "2) brand (if visible/likely; otherwise null)\n"
        "3) model (specific model, line, or variant if plausible; otherwise null)\n"
        "4) official_brand_site (homepage or product page if confidently known; otherwise null)\n"
        "5) search_query (best query string for finding the exact item online)\n"
        "6) description (1-2 sentences)\n"
        "7) visual_hints (array of 2 to 4 short search phrases based on visible traits only, "
        "such as color, camera count, shape, material, logo placement, straps, or edges)\n"
        "8) confidence (0 to 1; how confident you are about brand+product_type+model)\n"
        "Rules: do not invent exact model names unless the visual evidence is reasonably strong. "
        "If uncertain, keep model null and make search_query broader. "
        "Keep visual_hints short and practical for a user to paste into Google.\n"
        "Return ONLY valid JSON with keys: "
        "product_type, brand, model, official_brand_site, search_query, description, visual_hints, confidence."
    )






    resp = client.chat.completions.create(


        model=model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    },
                ],
            }
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    content = resp.choices[0].message.content
    if not content:
        return {
            "product_type": None,
            "brand": None,
            "description": "",
            "visual_hints": [],
            "confidence": 0.0,
        }

    data = json.loads(content)
    return data

