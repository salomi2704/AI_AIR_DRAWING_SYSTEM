"""Export the final canvas to a PDF using reportlab.

Canvas pixels are mapped to PDF points (72 per inch) using the configured
DPI, so a 1920x1080 canvas at 150 DPI produces a 2000x1125pt page.
"""

from __future__ import annotations

from pathlib import Path

import config
from export.bundle import ExportBundle

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("PDF export needs 'opencv-python'.") from exc


class PdfExporter:
    """Writes the canvas strokes (and OCR text) into a single-page PDF."""

    def __init__(
        self,
        dpi: int = config.EXPORT_DPI,
        background: tuple[int, int, int] = (255, 255, 255),
    ) -> None:
        self.dpi = dpi
        self.background = background
        # Canvas pixels -> PDF points: 96 px/inch (screen) converted to 72 pt/inch.
        self.scale = self.dpi / 96.0

    def _flip_y(self, y: float, page_height: float) -> float:
        """reportlab's origin is bottom-left; flip the canvas y coordinate."""
        return page_height - y * self.scale

    def export(self, bundle: ExportBundle, path: Path | str) -> Path:
        """Save ``bundle`` as PDF at ``path``; returns the resolved path."""
        try:
            from reportlab.pdfgen import canvas as pdf_canvas
        except ImportError as exc:
            raise RuntimeError(
                "PDF export needs 'reportlab' installed (pip install reportlab)."
            ) from exc

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        canvas = bundle.canvas
        page_w = canvas.width * self.scale
        page_h = canvas.height * self.scale
        pdf = pdf_canvas.Canvas(str(path), pagesize=(page_w, page_h))

        r, g, b = (c / 255.0 for c in self.background)
        pdf.setFillColorRGB(r, g, b)
        pdf.rect(0, 0, page_w, page_h, stroke=0, fill=1)

        for stroke in canvas.strokes():
            cr, cg, cb = config.hex_to_rgb(stroke.color_hex)
            pdf.setStrokeColorRGB(cr / 255.0, cg / 255.0, cb / 255.0)
            pdf.setLineWidth(max(0.5, stroke.thickness * self.scale))
            pdf.setLineCap(1)  # round caps
            stroke_path = pdf.beginPath()
            for idx, (x, y) in enumerate(stroke.points):
                px = x * self.scale
                py = self._flip_y(y, page_h)
                if idx == 0:
                    stroke_path.moveTo(px, py)
                else:
                    stroke_path.lineTo(px, py)
            pdf.drawPath(stroke_path, stroke=1, fill=0)

        pdf.setFont("Helvetica", 28 * self.scale)
        for region in bundle.text_regions:
            x, y, _, _ = region.box
            safe = region.text.encode("latin-1", "replace").decode("latin-1")
            pdf.drawString(x * self.scale, self._flip_y(y + 30, page_h), safe)

        pdf.save()
        return path
