"""Virtual canvas engine: strokes, layers, erasing, undo/redo, rendering.

Public API::

    from canvas import VirtualCanvas, Layer, Stroke, Action
"""

from canvas.layers import Layer
from canvas.strokes import Point, Stroke
from canvas.virtual_canvas import Action, EraseRecord, VirtualCanvas

__all__ = [
    "Action",
    "EraseRecord",
    "Layer",
    "Point",
    "Stroke",
    "VirtualCanvas",
]
