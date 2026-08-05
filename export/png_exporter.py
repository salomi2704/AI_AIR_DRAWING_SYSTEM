"""Export the final canvas to a PNG image.

The canvas is rendered at its full resolution via the canvas renderer and
written with OpenCV.  The ``scale`` factor allows higher-resolution rasters
for printing.
"""

from __future__ import annotations

from pathlib import Path

import config
from export.bundle import ExportBundle

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("PNG export needs 'opencv-python'.") from exc


class PngExporter:
    """Renders the canvas and saves it as a PNG image."""

    def __init__(self, dpi: int = config.EXPORT_DPI, scale: float = 1.0) -> None:
        self.dpi = dpi
        self.scale = scale

    def export(
        self,
        bundle: ExportBundle,
        path: Path | str,
    ) -> Path:
        """Save ``bundle`` as PNG at ``path``; returns the resolved path."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        image = bundle.canvas.render(background=(255, 255, 255))
        if self.scale != 1.0:
            width = int(image.shape[1] * self.scale)
            height = int(image.shape[0] * self.scale)
            image = cv2.resize(
                image, (width, height), interpolation=cv2.INTER_CUBIC
            )
        ok = cv2.imwrite(str(path), image)
        if not ok:
            raise OSError(f"Failed to write PNG to {path}")
        return path
