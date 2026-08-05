"""The virtual canvas engine.

Maps normalised fingertip coordinates to canvas pixels, records strokes on
layers, supports point-based erasing, undo/redo and renders the result back to
a NumPy image for display and export.

Coordinate space: the canvas is ``width x height`` pixels; normalised
coordinates in ``[0, 1]`` map linearly onto it (see :meth:`map_normalized`).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterator, Optional

import numpy as np

import config
from canvas.layers import Layer
from canvas.strokes import Point, Stroke

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("The canvas module needs 'opencv-python' installed.") from exc


@dataclass
class EraseRecord:
    """Snapshot of one stroke before/after an erase operation (for undo/redo)."""

    layer_id: int
    stroke_index: int
    stroke: Stroke  # live object, keeps identity across undo/redo
    before: Stroke  # copy of the stroke before erasing
    after: Stroke  # copy of the stroke after erasing


@dataclass
class Action:
    """An undoable action; ``kind`` is ``add_stroke``, ``erase`` or ``clear``."""

    kind: str
    layer_id: int = 0
    stroke: Optional[Stroke] = None
    stroke_index: int = -1
    records: list[EraseRecord] = field(default_factory=list)
    old_strokes: list[Stroke] = field(default_factory=list)


class VirtualCanvas:
    """Multi-layer canvas with stroke recording, erasing and undo/redo."""

    def __init__(
        self,
        width: int = config.CANVAS_WIDTH,
        height: int = config.CANVAS_HEIGHT,
    ) -> None:
        self.width = width
        self.height = height
        self.layers: list[Layer] = [Layer(id=0, name="Layer 1")]
        self._active_layer_id = 0
        self._active_stroke: Optional[Stroke] = None
        self._undo_stack: list[Action] = []
        self._redo_stack: list[Action] = []
        self._history_limit = config.HISTORY_LIMIT

    # ------------------------------------------------------------------
    # Coordinate mapping
    # ------------------------------------------------------------------
    def map_normalized(self, nx: float, ny: float) -> Point:
        """Map normalised ``(0..1, 0..1)`` coordinates to canvas pixels."""
        x = int(nx * self.width)
        y = int(ny * self.height)
        return min(max(x, 0), self.width - 1), min(max(y, 0), self.height - 1)

    # ------------------------------------------------------------------
    # Layers
    # ------------------------------------------------------------------
    def add_layer(self, name: Optional[str] = None) -> int:
        """Create a layer, make it active and return its id."""
        if len(self.layers) >= config.MAX_LAYERS:
            raise ValueError("Layer limit reached")
        new_id = max(l.id for l in self.layers) + 1
        self.layers.append(Layer(id=new_id, name=name or f"Layer {new_id + 1}"))
        self._active_layer_id = new_id
        return new_id

    def layer(self, layer_id: int) -> Layer:
        """Return the layer with ``layer_id``."""
        return next(l for l in self.layers if l.id == layer_id)

    @property
    def active_layer(self) -> Layer:
        """The layer new strokes are added to."""
        return self.layer(self._active_layer_id)

    def set_active_layer(self, layer_id: int) -> None:
        if not any(l.id == layer_id for l in self.layers):
            raise ValueError(f"Unknown layer id {layer_id}")
        self._active_layer_id = layer_id

    def set_layer_visible(self, layer_id: int, visible: bool) -> None:
        self.layer(layer_id).visible = visible

    def iter_visible_layers(self) -> Iterator[Layer]:
        """Layers to draw, in stacking order (lowest id first)."""
        yield from (l for l in sorted(self.layers, key=lambda x: x.id) if l.visible)

    # ------------------------------------------------------------------
    # Stroke recording
    # ------------------------------------------------------------------
    def begin_stroke(
        self,
        point: Point,
        color_hex: str = config.DEFAULT_COLOR,
        thickness: int = config.DEFAULT_BRUSH_SIZE,
        layer_id: Optional[int] = None,
    ) -> Stroke:
        """Start a new stroke; subsequent :meth:`extend_stroke` calls append."""
        target = layer_id if layer_id is not None else self._active_layer_id
        stroke = Stroke(
            points=[point],
            color_hex=color_hex,
            thickness=thickness,
            layer_id=target,
        )
        self._active_stroke = stroke
        return stroke

    def extend_stroke(self, point: Point) -> None:
        """Append a point to the in-progress stroke, skipping tiny moves."""
        if self._active_stroke is None:
            return
        last = self._active_stroke.points[-1]
        if (point[0] - last[0]) ** 2 + (point[1] - last[1]) ** 2 < (
            config.MIN_STROKE_DISTANCE ** 2
        ):
            return
        self._active_stroke.points.append(point)

    def end_stroke(self) -> Optional[Stroke]:
        """Finish the active stroke, making it undoable, and return it."""
        stroke = self._active_stroke
        self._active_stroke = None
        if stroke is None:
            return None
        layer = self.layer(stroke.layer_id)
        layer.strokes.append(stroke)
        action = Action(
            kind="add_stroke",
            layer_id=stroke.layer_id,
            stroke=stroke,
            stroke_index=len(layer.strokes) - 1,
        )
        self._commit(action)
        return stroke

    def cancel_stroke(self) -> None:
        """Discard the in-progress stroke without recording it."""
        self._active_stroke = None

    # ------------------------------------------------------------------
    # Erasing
    # ------------------------------------------------------------------
    def erase_at(
        self, point: Point, radius: Optional[float] = None
    ) -> int:
        """Remove stroke points within ``radius`` px of ``point``.

        Returns the number of points erased.  Empty strokes are deleted.
        """
        if radius is None:
            radius = config.ERASE_RADIUS * float(np.hypot(self.width, self.height))
        records: list[EraseRecord] = []
        for layer in self.iter_visible_layers():
            for index, stroke in enumerate(list(layer.strokes)):
                before = stroke.copy()
                stroke.points = [
                    p
                    for p in stroke.points
                    if (p[0] - point[0]) ** 2 + (p[1] - point[1]) ** 2 > radius**2
                ]
                if len(stroke.points) != len(before.points):
                    records.append(
                        EraseRecord(
                            layer_id=layer.id,
                            stroke_index=index,
                            stroke=stroke,
                            before=before,
                            after=stroke.copy(),
                        )
                    )
        # delete strokes that were erased down to zero points
        for record in records:
            if not record.after.points:
                self.layer(record.layer_id).strokes.remove(record.stroke)
        erased = sum(len(r.before.points) - len(r.after.points) for r in records)
        if records:
            self._commit(Action(kind="erase", records=records))
        return erased

    # ------------------------------------------------------------------
    # Clearing
    # ------------------------------------------------------------------
    def clear_layer(self, layer_id: Optional[int] = None) -> None:
        """Remove every stroke from a layer (undoable)."""
        target_id = layer_id if layer_id is not None else self._active_layer_id
        layer = self.layer(target_id)
        if not layer.strokes:
            return
        self._commit(
            Action(
                kind="clear",
                layer_id=target_id,
                old_strokes=[s.copy() for s in layer.strokes],
            )
        )
        layer.strokes.clear()

    def clear_all(self) -> None:
        """Clear every layer (each clear is undoable independently)."""
        for layer in list(self.layers):
            self.clear_layer(layer.id)

    # ------------------------------------------------------------------
    # Undo / redo
    # ------------------------------------------------------------------
    def _commit(self, action: Action) -> None:
        self._undo_stack.append(action)
        if len(self._undo_stack) > self._history_limit:
            self._undo_stack.pop(0)
        self._redo_stack.clear()

    def undo(self) -> bool:
        """Undo the most recent action.  Returns False if nothing to undo."""
        if not self._undo_stack:
            return False
        action = self._undo_stack.pop()
        self._undo(action)
        self._redo_stack.append(action)
        return True

    def redo(self) -> bool:
        """Redo the most recently undone action.  Returns False if nothing."""
        if not self._redo_stack:
            return False
        action = self._redo_stack.pop()
        self._redo(action)
        self._undo_stack.append(action)
        return True

    @staticmethod
    def _restore_live_stroke(layer: Layer, record: EraseRecord, source: Stroke) -> None:
        record.stroke.points = list(source.points)
        record.stroke.color_hex = source.color_hex
        record.stroke.thickness = source.thickness

    def _undo(self, action: Action) -> None:
        if action.kind == "add_stroke":
            self.layer(action.layer_id).strokes.remove(action.stroke)
        elif action.kind == "erase":
            for record in sorted(
                action.records, key=lambda r: r.stroke_index, reverse=True
            ):
                layer = self.layer(record.layer_id)
                if not record.after.points:
                    self._restore_live_stroke(layer, record, record.before)
                    layer.strokes.insert(
                        min(record.stroke_index, len(layer.strokes)), record.stroke
                    )
                else:
                    self._restore_live_stroke(layer, record, record.before)
        elif action.kind == "clear":
            layer = self.layer(action.layer_id)
            for i, stroke in enumerate(action.old_strokes):
                layer.strokes.insert(min(i, len(layer.strokes)), stroke.copy())

    def _redo(self, action: Action) -> None:
        if action.kind == "add_stroke":
            layer = self.layer(action.layer_id)
            layer.strokes.insert(
                min(action.stroke_index, len(layer.strokes)), action.stroke
            )
        elif action.kind == "erase":
            for record in sorted(
                action.records, key=lambda r: r.stroke_index, reverse=True
            ):
                layer = self.layer(record.layer_id)
                if not record.after.points:
                    if record.stroke in layer.strokes:
                        layer.strokes.remove(record.stroke)
                else:
                    self._restore_live_stroke(layer, record, record.after)
        elif action.kind == "clear":
            self.layer(action.layer_id).strokes.clear()

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------
    def strokes(self) -> list[Stroke]:
        """All strokes flattened across layers, in drawing order."""
        result: list[Stroke] = []
        for layer in self.iter_visible_layers():
            result.extend(layer.strokes)
        return result

    @property
    def point_count(self) -> int:
        """Total number of recorded points across all layers."""
        return sum(layer.point_count for layer in self.layers)

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------
    @staticmethod
    def _render_strokes(
        image: np.ndarray, strokes: list[Stroke]
    ) -> np.ndarray:
        for stroke in strokes:
            bgr = config.hex_to_bgr(stroke.color_hex)
            if len(stroke.points) >= 2:
                pts = np.asarray(stroke.points, dtype=np.int32).reshape(-1, 1, 2)
                cv2.polylines(
                    image, [pts], False, bgr, stroke.thickness, cv2.LINE_AA
                )
            elif len(stroke.points) == 1:
                x, y = stroke.points[0]
                cv2.circle(
                    image,
                    (x, y),
                    max(1, stroke.thickness // 2),
                    bgr,
                    -1,
                    cv2.LINE_AA,
                )
        return image

    def render_layer(self, layer_id: int) -> np.ndarray:
        """Render a single layer to a BGR image of canvas size."""
        layer = self.layer(layer_id)
        image = np.full((self.height, self.width, 3), 255, dtype=np.uint8)
        return self._render_strokes(image, layer.strokes)

    def render(
        self,
        background: tuple[int, int, int] = (255, 255, 255),
    ) -> np.ndarray:
        """Render the whole canvas (visible layers) to a BGR image."""
        image = np.full((self.height, self.width, 3), background, dtype=np.uint8)
        for layer in self.iter_visible_layers():
            if layer.opacity >= 1.0:
                self._render_strokes(image, layer.strokes)
            else:
                overlay = np.full_like(image, 255)
                self._render_strokes(overlay, layer.strokes)
                image = cv2.addWeighted(image, 1.0, overlay, layer.opacity, 0)
        return image
