"""OCR for handwritten text using Tesseract (via pytesseract).

The recogniser renders a group of canvas strokes to a black-on-white image,
crops it to its bounding box, pre-processes it and asks Tesseract for the
text.  :meth:`OCRRecognizer.is_available` reports whether the Tesseract
binary is installed so callers can degrade gracefully.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

import config
from canvas.strokes import Point, Stroke

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("The recognition module needs 'opencv-python'.") from exc

try:
    import pytesseract
    from pytesseract import Output
except ImportError:  # pragma: no cover - optional runtime dependency
    pytesseract = None
    Output = None


@dataclass(frozen=True)
class OCRResult:
    """Recognised text plus its location and confidence."""

    text: str
    confidence: float
    box: tuple[int, int, int, int]  # (x, y, w, h) in canvas pixels

    @property
    def center(self) -> Point:
        x, y, w, h = self.box
        return x + w // 2, y + h // 2


class OCRRecognizer:
    """Recognises handwritten text from stroke groups."""

    def __init__(
        self,
        lang: str = config.OCR_LANGUAGE,
        psm: str = "7",
        thickness: int = 6,
    ) -> None:
        self.lang = lang
        self.psm = psm
        self.thickness = thickness
        if pytesseract is not None and config.TESSERACT_CMD != "tesseract":
            pytesseract.pytesseract.tesseract_cmd = config.TESSERACT_CMD

    # ------------------------------------------------------------------
    # Availability
    # ------------------------------------------------------------------
    def is_available(self) -> bool:
        """True when pytesseract is installed and the binary responds."""
        if pytesseract is None:
            return False
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Rendering helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _stroke_bounds(
        strokes: list[Stroke],
    ) -> Optional[tuple[int, int, int, int]]:
        all_points = [p for s in strokes for p in s.points]
        if not all_points:
            return None
        xs = [p[0] for p in all_points]
        ys = [p[1] for p in all_points]
        return min(xs), min(ys), max(xs), max(ys)

    def render_strokes(
        self, strokes: list[Stroke], padding: int = 30
    ) -> Optional[tuple[np.ndarray, tuple[int, int, int, int]]]:
        """Render strokes to a cropped black-on-white image.

        Returns ``(image, bbox)`` where ``bbox`` is ``(x, y, w, h)`` in canvas
        coordinates, or None when ``strokes`` is empty.
        """
        bounds = self._stroke_bounds(strokes)
        if bounds is None:
            return None
        x0, y0, x1, y1 = bounds
        x0 = max(x0 - padding, 0)
        y0 = max(y0 - padding, 0)
        width = (x1 + padding) - x0
        height = (y1 + padding) - y0
        image = np.full((height, width), 255, dtype=np.uint8)
        for stroke in strokes:
            pts = [
                (p[0] - x0, p[1] - y0) for p in stroke.points if x0 <= p[0] and y0 <= p[1]
            ]
            if len(pts) >= 2:
                arr = np.asarray(pts, dtype=np.int32).reshape(-1, 1, 2)
                cv2.polylines(image, [arr], False, 0, self.thickness, cv2.LINE_AA)
            elif len(pts) == 1:
                cv2.circle(image, pts[0], max(1, self.thickness // 2), 0, -1)
        return image, (x0, y0, width, height)

    @staticmethod
    def _preprocess(image: np.ndarray) -> np.ndarray:
        """Threshold to clean strokes and guarantee dark text on light paper."""
        if image.ndim == 3:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(
            image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
        )
        if float(binary.mean()) < 127.0:  # inverted -> flip to black-on-white
            binary = cv2.bitwise_not(binary)
        return binary

    # ------------------------------------------------------------------
    # Recognition
    # ------------------------------------------------------------------
    def recognize(
        self, strokes: list[Stroke], psm: Optional[str] = None
    ) -> Optional[OCRResult]:
        """OCR the given strokes as one text block; None if no text found."""
        if not self.is_available():
            raise RuntimeError(
                "Tesseract is not available. Install it and point "
                "config.TESSERACT_CMD at the binary."
            )
        rendered = self.render_strokes(strokes)
        if rendered is None:
            return None
        image, bbox = rendered
        binary = self._preprocess(image)
        config_str = f"--psm {psm or self.psm} --oem 1"
        data = pytesseract.image_to_data(
            binary, lang=self.lang, config=config_str, output_type=Output.DICT
        )
        words = [
            w
            for w, conf in zip(data["text"], data["conf"])
            if w.strip() and float(conf) > 0
        ]
        confs = [
            float(c) for c in data["conf"] if c != "-1" and float(c) > 0
        ]
        text = " ".join(words).strip()
        if not text:
            return None
        confidence = float(np.mean(confs)) if confs else 0.0
        return OCRResult(text=text, confidence=confidence, box=bbox)

    def _cluster_strokes(
        self, strokes: list[Stroke], gap: float
    ) -> list[list[Stroke]]:
        """Group strokes into regions by proximity of their bounding boxes."""
        regions: list[list[Stroke]] = []
        for stroke in strokes:
            placed = False
            for region in regions:
                for other in region:
                    sx, sy, sw, sh = self._stroke_bounds([stroke])
                    ox, oy, ow, oh = self._stroke_bounds([other])
                    cx1, cy1 = sx + sw / 2, sy + sh / 2
                    cx2, cy2 = ox + ow / 2, oy + oh / 2
                    if abs(cx1 - cx2) <= gap and abs(cy1 - cy2) <= gap:
                        region.append(stroke)
                        placed = True
                        break
                if placed:
                    break
            if not placed:
                regions.append([stroke])
        return regions

    def recognize_regions(
        self,
        strokes: list[Stroke],
        canvas_width: int = config.CANVAS_WIDTH,
        canvas_height: int = config.CANVAS_HEIGHT,
    ) -> list[OCRResult]:
        """Cluster strokes into nearby groups and OCR each group separately."""
        gap = 0.3 * float(np.hypot(canvas_width, canvas_height))
        results: list[OCRResult] = []
        for region in self._cluster_strokes(strokes, gap):
            result = self.recognize(region)
            if result is not None:
                results.append(result)
        return results
