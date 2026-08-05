"""Export a machine-readable JSON recognition report.

The report captures everything the pipeline produced: canvas size, recognised
shapes (with fit parameters), OCR text regions, the assembled diagram graph,
LaTeX formulas and the natural-language summary.  This is the format a
portfolio project can point at to show the whole vision -> understanding
pipeline in one file.
"""

from __future__ import annotations

import json
from pathlib import Path

from export.bundle import ExportBundle


class JsonExporter:
    """Writes the recognition report to a ``.json`` file."""

    def export(self, bundle: ExportBundle, path: Path | str) -> Path:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "canvas": {
                "width": bundle.canvas.width,
                "height": bundle.canvas.height,
                "strokes": len(bundle.canvas.strokes()),
                "points": bundle.canvas.point_count,
            },
            "shapes": [
                {
                    "kind": shape.kind,
                    "bbox": list(shape.bbox),
                    "fit_error": shape.fit_error,
                    "params": shape.params,
                }
                for shape in bundle.shapes
            ],
            "text_regions": [
                {
                    "text": region.text,
                    "confidence": region.confidence,
                    "box": list(region.box),
                }
                for region in bundle.text_regions
            ],
            "diagram": bundle.diagram.to_dict() if bundle.diagram is not None else None,
            "latex": list(bundle.latex),
            "summary": bundle.summary,
        }
        path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        return path
