"""Export data bundle: everything needed to render a finished drawing.

A :class:`ExportBundle` wraps the :class:`~canvas.VirtualCanvas` plus any
recognised content (OCR text regions, recognised shapes, an assembled diagram
and LaTeX formulas) so all exporters share one source of truth.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from canvas import VirtualCanvas
from recognition import Diagram, OCRResult, Shape


@dataclass
class ExportBundle:
    """The full output of the pipeline, ready to be exported."""

    canvas: VirtualCanvas
    text_regions: list[OCRResult] = field(default_factory=list)
    shapes: list[Shape] = field(default_factory=list)
    diagram: Optional[Diagram] = None
    latex: list[str] = field(default_factory=list)
    summary: str = ""  # natural-language summary (offline or LLM generated)
