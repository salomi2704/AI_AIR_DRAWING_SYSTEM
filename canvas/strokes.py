"""Data model for strokes.

A :class:`Stroke` is a polyline of canvas pixel points plus its visual
attributes.  Layer containers live in :mod:`canvas.layers`.  Both are pure
data containers: all behaviour lives in :mod:`canvas.virtual_canvas`.
"""

from __future__ import annotations

from dataclasses import dataclass, field

Point = tuple[int, int]


@dataclass
class Stroke:
    """A single drawn stroke: a polyline of canvas pixel coordinates."""

    points: list[Point] = field(default_factory=list)
    color_hex: str = "#000000"
    thickness: int = 10
    layer_id: int = 0

    def copy(self) -> "Stroke":
        """Return a deep copy with an independent point list."""
        return Stroke(
            points=list(self.points),
            color_hex=self.color_hex,
            thickness=self.thickness,
            layer_id=self.layer_id,
        )

    @property
    def length(self) -> int:
        """Number of recorded points."""
        return len(self.points)
