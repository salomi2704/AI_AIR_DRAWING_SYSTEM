"""Export the final canvas to an SVG file using svgwrite.

Strokes become polylines and recognised text becomes ``<text>`` elements, all
on a white page.  Vector output keeps the drawing crisp at any zoom level.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

import config
from export.bundle import ExportBundle


class SvgExporter:
    """Writes the canvas (plus OCR text) as a single SVG file."""

    def __init__(
        self,
        dpi: int = config.EXPORT_DPI,
        background: str = config.EXPORT_BACKGROUND,
    ) -> None:
        self.dpi = dpi
        self.background = background

    def export(
        self,
        bundle: ExportBundle,
        path: Path | str,
    ) -> Path:
        """Save ``bundle`` as SVG at ``path``; returns the resolved path."""
        try:
            import svgwrite
        except ImportError as exc:
            raise RuntimeError(
                "SVG export needs 'svgwrite' installed (pip install svgwrite)."
            ) from exc

        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        canvas = bundle.canvas
        dwg = svgwrite.Drawing(
            str(path),
            size=(f"{canvas.width}px", f"{canvas.height}px"),
            viewBox=(f"0 0 {canvas.width} {canvas.height}"),
        )
        dwg.add(
            dwg.rect(
                insert=(0, 0),
                size=(canvas.width, canvas.height),
                fill=self.background,
            )
        )

        for stroke in canvas.strokes():
            polyline = dwg.polyline(
                points=[(x, y) for x, y in stroke.points],
                stroke=stroke.color_hex,
                stroke_width=stroke.thickness,
                fill="none",
                stroke_linejoin="round",
                stroke_linecap="round",
            )
            dwg.add(polyline)

        for region in bundle.text_regions:
            x, y, _, _ = region.box
            dwg.add(
                dwg.text(
                    region.text,
                    insert=(x, y + 30),
                    font_size=28,
                    fill="#000000",
                )
            )

        dwg.save()
        return path
