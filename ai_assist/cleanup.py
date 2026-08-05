"""Sketch cleanup: snap rough strokes to clean geometry.

The :class:`SketchCleaner` reuses the shape recogniser to classify each stroke
and then regenerates an idealised version of it — a wobbly circle becomes a
perfect circle, a squiggly line becomes a straight segment, a sloppy box gets
square corners and an arrow gets a crisp shaft + head.  Unknown strokes are
left untouched.
"""

from __future__ import annotations

import math

import numpy as np

import config
from canvas.strokes import Point, Stroke
from recognition.shapes import Shape, ShapeRecognizer


class SketchCleaner:
    """Snaps recognised shapes to clean, idealised geometry."""

    def __init__(
        self,
        recognizer: ShapeRecognizer | None = None,
        samples: int = 72,
    ) -> None:
        self.recognizer = recognizer or ShapeRecognizer()
        self.samples = samples

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def clean_stroke(self, stroke: Stroke) -> Stroke:
        """Return a cleaned version of a single stroke (same attrs)."""
        shape = self.recognizer.recognize_stroke(stroke)
        return self._render_shape(shape, stroke)

    def clean_strokes(self, strokes: list[Stroke]) -> list[Stroke]:
        """Clean every stroke; unrecognised strokes pass through unchanged."""
        return [self.clean_stroke(s) for s in strokes]

    # ------------------------------------------------------------------
    # Ideal geometry generation
    # ------------------------------------------------------------------
    def _render_shape(self, shape: Shape, stroke: Stroke) -> Stroke:
        """Turn a recognised shape into a clean stroke using stroke's attrs."""
        clean = Stroke(
            color_hex=stroke.color_hex,
            thickness=stroke.thickness,
            layer_id=stroke.layer_id,
        )
        if shape.kind == "line":
            clean.points = self._line_points(shape)
        elif shape.kind == "circle":
            clean.points = self._circle_points(shape)
        elif shape.kind == "rectangle":
            clean.points = self._rectangle_points(shape)
        elif shape.kind == "arrow":
            clean.points = self._arrow_points(shape)
        else:
            clean.points = list(stroke.points)
        return clean

    @staticmethod
    def _line_points(shape: Shape) -> list[Point]:
        p1 = shape.params.get("p1", (0, 0))
        p2 = shape.params.get("p2", (0, 0))
        return [p1, p2]

    def _circle_points(self, shape: Shape) -> list[Point]:
        center = shape.params.get("center", (0, 0))
        radius = shape.params.get("radius", 50.0)
        return self._sample_ellipse(center, radius, radius)

    def _rectangle_points(self, shape: Shape) -> list[Point]:
        corners = shape.params.get("corners", [(0, 0)] * 4)
        points: list[Point] = []
        for i in range(4):
            a = corners[i]
            b = corners[(i + 1) % 4]
            points.extend(self._interpolate(a, b))
        return points

    def _arrow_points(self, shape: Shape) -> list[Point]:
        tail = shape.params.get("p1", (0, 0))
        tip = shape.params.get("p2", tail)
        dx, dy = tip[0] - tail[0], tip[1] - tail[1]
        length = math.hypot(dx, dy)
        if length < 1e-6:
            return [tail, tip]
        ux, uy = dx / length, dy / length
        head_len = 0.14 * length
        head_w = 0.055 * length
        px, py = -uy, ux  # perpendicular
        base = (tip[0] - ux * head_len, tip[1] - uy * head_len)
        v1 = (base[0] + px * head_w, base[1] + py * head_w)
        v2 = (base[0] - px * head_w, base[1] - py * head_w)
        points = self._interpolate(tail, base)
        points += [self._round(v1), self._round(tip), self._round(v2), self._round(base)]
        return points

    # ------------------------------------------------------------------
    # Sampling helpers
    # ------------------------------------------------------------------
    def _interpolate(self, a: Point, b: Point, steps: int = 3) -> list[Point]:
        return [
            self._round(
                (
                    a[0] + (b[0] - a[0]) * (i / steps),
                    a[1] + (b[1] - a[1]) * (i / steps),
                )
            )
            for i in range(steps + 1)
        ]

    def _sample_ellipse(
        self, center: Point, rx: float, ry: float, start_angle: float = 0.0
    ) -> list[Point]:
        points = []
        for i in range(self.samples):
            ang = start_angle + 2 * math.pi * i / self.samples
            x = center[0] + rx * math.cos(ang)
            y = center[1] + ry * math.sin(ang)
            points.append(self._round((x, y)))
        return points

    @staticmethod
    def _round(point: tuple[float, float]) -> Point:
        return int(round(point[0])), int(round(point[1]))
