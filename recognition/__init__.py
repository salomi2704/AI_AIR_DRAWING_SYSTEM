"""Recognition: OCR, shape/diagram detection and formula detection.

Public API::

    from recognition import OCRRecognizer, OCRResult, ShapeRecognizer, Shape, FormulaDetector
"""

from recognition.formulas import FormulaDetector
from recognition.ocr import OCRRecognizer, OCRResult
from recognition.shapes import (
    Diagram,
    DiagramEdge,
    DiagramNode,
    Shape,
    ShapeRecognizer,
)

__all__ = [
    "Diagram",
    "DiagramEdge",
    "DiagramNode",
    "FormulaDetector",
    "OCRRecognizer",
    "OCRResult",
    "Shape",
    "ShapeRecognizer",
]
