"""JSON serialization for the canvas state.

The canvas is a collection of layers, each holding strokes (polylines of
pixel points with a colour and thickness).  This module converts that graph
to/from plain JSON-ready dictionaries so sessions can be autosaved and
restored.  The format is versioned (``version`` field) so future changes can
migrate old files instead of breaking them.

Serialization only touches the durable state (canvas size, layers, strokes,
active layer): undo/redo history is intentionally not persisted.
"""

from __future__ import annotations

from typing import Any

import config
from canvas.layers import Layer
from canvas.strokes import Stroke
from canvas.virtual_canvas import VirtualCanvas

CANVAS_FORMAT_VERSION = 1


def _stroke_to_dict(stroke: Stroke) -> dict[str, Any]:
    return {
        "points": [[x, y] for x, y in stroke.points],
        "color_hex": stroke.color_hex,
        "thickness": stroke.thickness,
        "layer_id": stroke.layer_id,
    }


def _layer_to_dict(layer: Layer) -> dict[str, Any]:
    return {
        "id": layer.id,
        "name": layer.name,
        "visible": bool(layer.visible),
        "opacity": float(layer.opacity),
        "strokes": [_stroke_to_dict(stroke) for stroke in layer.strokes],
    }


def canvas_to_dict(canvas: VirtualCanvas) -> dict[str, Any]:
    """Serialize a canvas (or any structural equivalent) to a JSON-ready dict."""
    return {
        "version": CANVAS_FORMAT_VERSION,
        "canvas": {
            "width": canvas.width,
            "height": canvas.height,
            "active_layer_id": canvas.active_layer.id,
        },
        "layers": [_layer_to_dict(layer) for layer in canvas.layers],
    }


def _stroke_from_dict(data: dict[str, Any]) -> Stroke:
    return Stroke(
        points=[(int(x), int(y)) for x, y in data["points"]],
        color_hex=data.get("color_hex", config.DEFAULT_COLOR),
        thickness=int(data.get("thickness", config.DEFAULT_BRUSH_SIZE)),
        layer_id=int(data.get("layer_id", 0)),
    )


def _layer_from_dict(data: dict[str, Any]) -> Layer:
    return Layer(
        id=int(data["id"]),
        name=data.get("name", "Layer"),
        visible=bool(data.get("visible", True)),
        opacity=float(data.get("opacity", 1.0)),
        strokes=[_stroke_from_dict(stroke) for stroke in data.get("strokes", [])],
    )


def canvas_from_dict(data: dict[str, Any]) -> VirtualCanvas:
    """Rebuild a :class:`VirtualCanvas` from :func:`canvas_to_dict` output.

    Raises ``ValueError`` for unsupported versions or malformed payloads.
    """
    if not isinstance(data, dict):
        raise ValueError("Autosave data is not an object")
    version = data.get("version")
    if version != CANVAS_FORMAT_VERSION:
        raise ValueError(f"Unsupported autosave format version: {version!r}")
    canvas_data = data.get("canvas")
    if not isinstance(canvas_data, dict):
        raise ValueError("Autosave data is missing the canvas section")
    layers = [_layer_from_dict(item) for item in data.get("layers", [])]
    if not layers:
        raise ValueError("Autosave data contains no layers")

    canvas = VirtualCanvas(
        width=int(canvas_data.get("width", config.CANVAS_WIDTH)),
        height=int(canvas_data.get("height", config.CANVAS_HEIGHT)),
    )
    canvas.layers = layers
    active_id = int(canvas_data.get("active_layer_id", layers[0].id))
    if not any(layer.id == active_id for layer in layers):
        active_id = layers[0].id
    canvas.set_active_layer(active_id)
    return canvas
