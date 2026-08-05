"""Contour-based shape and diagram recognition.

Classifies each stroke as a basic shape (``line``, ``circle``, ``rectangle``,
``diamond``, ``triangle``, ``arrow``) by fitting primitives and measuring the
fit error, then optionally assembles recognised boxes/circles/diamonds and
arrows into a flow-chart style :class:`Diagram`.

Fit-based, not deep-learning based: a circle is a stroke whose points all sit
near a common radius, a rectangle is a hull with four near-right-angle
corners, a diamond is a closed rhombus and a triangle is a closed three-corner
hull.  Arrows are mostly straight strokes ending in a sharp V.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import numpy as np

import config
from canvas.strokes import Point, Stroke
from recognition.ocr import OCRResult

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("The recognition module needs 'opencv-python'.") from exc


@dataclass
class Shape:
    """A stroke classified as a primitive shape."""

    kind: str  # line | circle | rectangle | arrow | unknown
    points: list[Point] = field(default_factory=list)
    bbox: tuple[int, int, int, int] = (0, 0, 0, 0)
    params: dict = field(default_factory=dict)
    fit_error: float = 0.0

    @property
    def center(self) -> Point:
        x, y, w, h = self.bbox
        return x + w // 2, y + h // 2


@dataclass
class DiagramNode:
    """A box or circle in a detected flowchart."""

    id: str
    shape: Shape
    label: str = ""


@dataclass
class DiagramEdge:
    """An arrow connecting two flowchart nodes."""

    source: str
    target: str
    shape: Shape
    label: str = ""


@dataclass
class Diagram:
    """A structure graph extracted from the recognised shapes."""

    nodes: list[DiagramNode] = field(default_factory=list)
    edges: list[DiagramEdge] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "nodes": [{"id": n.id, "kind": n.shape.kind, "label": n.label} for n in self.nodes],
            "edges": [
                {"source": e.source, "target": e.target, "label": e.label} for e in self.edges
            ],
        }


class ShapeRecognizer:
    """Classifies strokes into primitive shapes and builds diagrams."""

    def __init__(
        self,
        min_points: int = config.SHAPE_MIN_POINTS,
        circle_tolerance: float = 0.12,
        line_tolerance: float = 0.12,
        turn_angle: float = 40.0,
    ) -> None:
        self.min_points = min_points
        self.circle_tolerance = circle_tolerance
        self.line_tolerance = line_tolerance
        self.turn_angle = turn_angle

    # ------------------------------------------------------------------
    # Primitives
    # ------------------------------------------------------------------
    @staticmethod
    def _fit_line(
        points: list[Point],
    ) -> tuple[Optional[dict], float]:
        """Least-squares line through the points.

        Returns ``(params, max_deviation)`` where ``params`` contains
        ``p1``/``p2`` (endpoints) and ``length``.
        """
        pts = np.asarray(points, dtype=float)
        if len(pts) < 2:
            return None, float("inf")
        mean = pts.mean(axis=0)
        centered = pts - mean
        cov = centered.T @ centered / len(pts)
        vals, vecs = np.linalg.eigh(cov)
        direction = vecs[:, int(np.argmax(vals))]
        if np.linalg.norm(direction) == 0:
            return None, float("inf")
        direction = direction / np.linalg.norm(direction)
        proj = centered @ direction
        p1 = mean + direction * proj.min()
        p2 = mean + direction * proj.max()
        perp = centered - np.outer(proj, direction)
        dev = float(np.linalg.norm(perp, axis=1).max())
        return {
            "p1": (int(p1[0]), int(p1[1])),
            "p2": (int(p2[0]), int(p2[1])),
            "length": float(np.linalg.norm(p2 - p1)),
        }, dev

    @staticmethod
    def _fit_circle(
        points: list[Point],
    ) -> tuple[Optional[dict], float]:
        """Fit a circle (centroid + mean radius); returns params and error."""
        pts = np.asarray(points, dtype=float)
        center = pts.mean(axis=0)
        radii = np.linalg.norm(pts - center, axis=1)
        radius = float(radii.mean())
        if radius < 1e-6:
            return None, float("inf")
        error = float(np.abs(radii - radius).mean() / radius)
        return {
            "center": (int(center[0]), int(center[1])),
            "radius": radius,
        }, error

    def _fit_rectangle(self, points: list[Point]) -> tuple[Optional[dict], float]:
        """Fit an axis-of-rotation rectangle via the convex hull."""
        pts = np.asarray(points, dtype=np.int32).reshape(-1, 1, 2)
        hull = cv2.convexHull(pts)
        hull = cv2.approxPolyDP(
            hull, 0.04 * cv2.arcLength(hull, True), True
        ).reshape(-1, 2)
        if len(hull) != 4:
            return None, float("inf")
        corners = [tuple(map(int, c)) for c in hull]
        angles = []
        for i in range(4):
            a = np.asarray(corners[i - 1], float)
            b = np.asarray(corners[i], float)
            c = np.asarray(corners[(i + 1) % 4], float)
            v1, v2 = a - b, c - b
            cos = float(
                np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9)
            )
            angles.append(abs(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0)))))
        if min(angles) < 70.0 or max(angles) > 110.0:
            return None, float("inf")
        error = max(abs(90.0 - a) for a in angles) / 90.0
        rect = cv2.minAreaRect(pts)
        width, height = sorted(rect[1])
        return {
            "corners": corners,
            "center": (int(rect[0][0]), int(rect[0][1])),
            "width": float(width),
            "height": float(height),
            "angle": float(rect[2]),
        }, error

    @staticmethod
    def _angle_between(a: np.ndarray, b: np.ndarray) -> float:
        cos = float(
            np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)
        )
        return abs(np.degrees(np.arccos(np.clip(cos, -1.0, 1.0))))

    # ------------------------------------------------------------------
    # Triangle / diamond detection
    # ------------------------------------------------------------------
    @staticmethod
    def _fit_polygon(
        points: list[Point],
        n_corners: int,
        epsilon: float = 0.04,
    ) -> Optional[list[Point]]:
        """Convex-hull corners of a stroke, or None if the count differs."""
        pts = np.asarray(points, dtype=np.int32).reshape(-1, 1, 2)
        hull = cv2.convexHull(pts)
        hull = cv2.approxPolyDP(
            hull, epsilon * cv2.arcLength(hull, True), True
        ).reshape(-1, 2)
        if len(hull) != n_corners:
            return None
        return [tuple(map(int, c)) for c in hull]

    @staticmethod
    def _polygon_area(corners: list[Point]) -> float:
        """Shoelace area of a polygon defined by its corners."""
        n = len(corners)
        total = 0.0
        for i in range(n):
            x1, y1 = corners[i]
            x2, y2 = corners[(i + 1) % n]
            total += x1 * y2 - x2 * y1
        return abs(total) / 2.0

    @classmethod
    def _is_closed(cls, points: list[Point], ratio: float = 0.15) -> bool:
        """True when the stroke starts and ends near the same point.

        Open strokes (arrows, lines, Vs) are never triangles or diamonds.
        """
        if len(points) < 2:
            return False
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        diagonal = ((max(xs) - min(xs)) ** 2 + (max(ys) - min(ys)) ** 2) ** 0.5
        if diagonal < 1e-6:
            return False
        first, last = points[0], points[-1]
        gap = ((first[0] - last[0]) ** 2 + (first[1] - last[1]) ** 2) ** 0.5
        return gap <= ratio * diagonal

    def _fit_triangle(self, points: list[Point]) -> tuple[Optional[dict], float]:
        """A closed stroke whose convex hull collapses to three corners."""
        corners = self._fit_polygon(points, 3)
        if corners is None or not self._is_closed(points):
            return None, float("inf")
        area = self._polygon_area(corners)
        x, y, w, h = self._bbox(points)
        if w <= 0 or h <= 0 or area / (w * h) < 0.15:
            return None, float("inf")
        return {"corners": corners, "area": float(area)}, 0.0

    def _fit_diamond(self, points: list[Point]) -> tuple[Optional[dict], float]:
        """A closed rhombus: four corners, equal-ish sides, not near-square."""
        corners = self._fit_polygon(points, 4)
        if corners is None or not self._is_closed(points):
            return None, float("inf")
        sides = [
            ((corners[i][0] - corners[(i + 1) % 4][0]) ** 2
             + (corners[i][1] - corners[(i + 1) % 4][1]) ** 2) ** 0.5
            for i in range(4)
        ]
        if min(sides) < 1e-6 or max(sides) / min(sides) > 2.0:
            return None, float("inf")
        angles = []
        for i in range(4):
            a = np.asarray(corners[i - 1], float) - np.asarray(corners[i], float)
            b = np.asarray(corners[(i + 1) % 4], float) - np.asarray(corners[i], float)
            angles.append(self._angle_between(a, b))
        if max(abs(angle - 90.0) for angle in angles) < 12.0:
            return None, float("inf")  # a near-square -> let rectangle handle it
        center = tuple(int(sum(c[i] for c in corners) / 4) for i in (0, 1))
        diag = [
            ((corners[0][0] - corners[2][0]) ** 2
             + (corners[0][1] - corners[2][1]) ** 2) ** 0.5,
            ((corners[1][0] - corners[3][0]) ** 2
             + (corners[1][1] - corners[3][1]) ** 2) ** 0.5,
        ]
        return {
            "corners": corners,
            "center": center,
            "diagonals": [float(d) for d in diag],
            "area": float(self._polygon_area(corners)),
        }, 0.0

    def _arrowhead_end(self, points: list[Point]) -> Optional[bool]:
        """Detect a sharp V at either end of a mostly-straight stroke.

        Returns True if the head is at the start, False if at the end, None if
        the stroke does not look like an arrow.  A real arrowhead is a fan:
        both of the final two segments angle away from the shaft direction.
        """
        pts = np.asarray(points, dtype=float)
        n = len(pts)
        if n < 8:
            return None
        line, dev = self._fit_line(points)
        if line is None or line["length"] < 20:
            return None
        if dev / line["length"] > self.line_tolerance * 1.5:
            return None
        length = line["length"]

        def _head_score(head_is_start: bool) -> bool:
            if head_is_start:
                approach = pts[n // 2] - pts[2]
                v1 = pts[1] - pts[0]
                v2 = pts[2] - pts[1]
            else:
                approach = pts[-3] - pts[n // 2]
                v1 = pts[-2] - pts[-3]
                v2 = pts[-1] - pts[-2]
            if np.linalg.norm(v1) + np.linalg.norm(v2) > 0.4 * length:
                return False
            return (
                self._angle_between(v1, approach) > self.turn_angle
                and self._angle_between(v2, approach) > self.turn_angle
                and self._angle_between(v1, v2) > 60.0
            )

        if _head_score(head_is_start=True):
            return True
        if _head_score(head_is_start=False):
            return False
        return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def recognize_stroke(self, stroke: Stroke) -> Shape:
        """Classify one stroke into a :class:`Shape`."""
        points = list(stroke.points)
        if len(points) < 2:
            return Shape(kind="unknown", points=points)

        line, line_dev = self._fit_line(points)
        circle, circle_err = self._fit_circle(points)
        rect, rect_err = self._fit_rectangle(points)
        diamond, diamond_err = self._fit_diamond(points)
        triangle, triangle_err = self._fit_triangle(points)

        is_line = line is not None and line_dev / max(line["length"], 1e-6) < self.line_tolerance
        is_circle = circle is not None and circle_err < self.circle_tolerance
        is_rect = rect is not None

        # Arrow is checked before line because an arrow contains a line.
        head_at_start = None
        if not is_circle and len(points) >= self.min_points:
            head_at_start = self._arrowhead_end(points)

        if head_at_start is not None:
            line = line or self._fit_line(points)[0]
            head = points[0] if head_at_start else points[-1]
            tail = points[-1] if head_at_start else points[0]
            return Shape(
                kind="arrow",
                points=points,
                bbox=self._bbox(points),
                params={"p1": tail, "p2": head, "head": head},
                fit_error=line_dev / max(line["length"], 1e-6) if line else 0.0,
            )
        if is_circle:
            return Shape(
                kind="circle",
                points=points,
                bbox=self._bbox(points),
                params=circle,
                fit_error=circle_err,
            )
        # Diamond is checked before rectangle: it is a 4-corner polygon that
        # fails the rectangle's near-right-angle test.
        if diamond is not None:
            return Shape(
                kind="diamond",
                points=points,
                bbox=self._bbox(points),
                params=diamond,
                fit_error=diamond_err,
            )
        if is_rect:
            return Shape(
                kind="rectangle",
                points=points,
                bbox=self._bbox(points),
                params=rect,
                fit_error=rect_err,
            )
        if triangle is not None:
            return Shape(
                kind="triangle",
                points=points,
                bbox=self._bbox(points),
                params=triangle,
                fit_error=triangle_err,
            )
        if is_line:
            return Shape(
                kind="line",
                points=points,
                bbox=self._bbox(points),
                params=line,
                fit_error=line_dev / max(line["length"], 1e-6),
            )
        return Shape(kind="unknown", points=points, bbox=self._bbox(points))

    def recognize(self, strokes: list[Stroke]) -> list[Shape]:
        """Classify every stroke; merge adjacent arrow lines into arrows."""
        shapes = [self.recognize_stroke(s) for s in strokes]
        return self._merge_arrows(shapes)

    @staticmethod
    def _bbox(points: list[Point]) -> tuple[int, int, int, int]:
        if not points:
            return (0, 0, 0, 0)
        xs = [p[0] for p in points]
        ys = [p[1] for p in points]
        return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)

    def _merge_arrows(self, shapes: list[Shape]) -> list[Shape]:
        """Merge separate line strokes into arrows when one ends at another's
        endpoint with a small V-shaped companion (not used for now — kept for
        future two-stroke arrows)."""
        return shapes

    # ------------------------------------------------------------------
    # Diagram assembly
    # ------------------------------------------------------------------
    def build_diagram(
        self,
        shapes: list[Shape],
        text_regions: Optional[list[OCRResult]] = None,
    ) -> Diagram:
        """Assemble boxes/circles + arrows + text labels into a Diagram."""
        nodes: list[DiagramNode] = []
        node_id = 0
        node_shapes = [
            s for s in shapes if s.kind in ("rectangle", "circle", "diamond", "triangle")
        ]
        text_regions = text_regions or []

        for shape in node_shapes:
            label = ""
            for region in text_regions:
                if self._region_inside(region.box, shape.bbox):
                    label = region.text
                    break
            nodes.append(DiagramNode(id=f"n{node_id}", shape=shape, label=label))
            node_id += 1

        edges: list[DiagramEdge] = []
        for arrow in shapes:
            if arrow.kind != "arrow":
                continue
            head = arrow.params.get("head")
            tail = arrow.params.get("p1")
            source = self._nearest_node(nodes, tail)
            target = self._nearest_node(nodes, head)
            if source is not None and target is not None and source is not target:
                label = self._edge_label(arrow.bbox, text_regions)
                edges.append(
                    DiagramEdge(source=source.id, target=target.id, shape=arrow, label=label)
                )
        return Diagram(nodes=nodes, edges=edges)

    @staticmethod
    def _edge_label(bbox, text_regions: list[OCRResult]) -> str:
        """Text placed on or right beside an arrow becomes its label."""
        bx, by, bw, bh = bbox
        bx2, by2 = bx + bw, by + bh
        diagonal = (bw * bw + bh * bh) ** 0.5
        best = ""
        best_dist = float("inf")
        for region in text_regions:
            rx, ry, rw, rh = region.box
            cx, cy = rx + rw / 2, ry + rh / 2
            if bx <= cx <= bx2 and by <= cy <= by2:
                return region.text
            dx = max(bx - cx, 0, cx - bx2)
            dy = max(by - cy, 0, cy - by2)
            dist = (dx * dx + dy * dy) ** 0.5
            if dist < best_dist:
                best_dist = dist
                best = region.text
        if best and best_dist <= 0.6 * max(diagonal, 1e-6):
            return best
        return ""

    @staticmethod
    def _region_inside(region_box, shape_box) -> bool:
        rx, ry, rw, rh = region_box
        sx, sy, sw, sh = shape_box
        rcx, rcy = rx + rw / 2, ry + rh / 2
        return sx <= rcx <= sx + sw and sy <= rcy <= sy + sh

    @staticmethod
    def _nearest_node(nodes: list[DiagramNode], point: Optional[Point]):
        if point is None or not nodes:
            return None
        best = None
        best_dist = float("inf")
        for node in nodes:
            d = (node.shape.center[0] - point[0]) ** 2 + (
                node.shape.center[1] - point[1]
            ) ** 2
            if d < best_dist:
                best_dist = d
                best = node
        return best
