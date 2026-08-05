"""Unit tests for contour-based shape recognition (pure math, no camera)."""

from __future__ import annotations

import math
import unittest

from canvas import Stroke
from recognition.ocr import OCRResult
from recognition.shapes import ShapeRecognizer


def line_stroke(start, end, steps=60, noise=0.0):
    pts = []
    import random

    rng = random.Random(7)
    for i in range(steps + 1):
        t = i / steps
        x = start[0] + (end[0] - start[0]) * t + (rng.uniform(-noise, noise) if noise else 0)
        y = start[1] + (end[1] - start[1]) * t + (rng.uniform(-noise, noise) if noise else 0)
        pts.append((int(x), int(y)))
    return Stroke(points=pts)


def circle_stroke(cx=200, cy=200, radius=100, steps=80):
    pts = []
    for i in range(steps + 1):
        ang = 2 * math.pi * i / steps
        pts.append((int(cx + radius * math.cos(ang)), int(cy + radius * math.sin(ang))))
    return Stroke(points=pts)


def rectangle_stroke():
    edges = [
        [(100, 100), (300, 100)],
        [(300, 100), (300, 220)],
        [(300, 220), (100, 220)],
        [(100, 220), (100, 100)],
    ]
    pts = []
    for (x1, y1), (x2, y2) in edges:
        for i in range(20):
            t = i / 20
            pts.append((int(x1 + (x2 - x1) * t), int(y1 + (y2 - y1) * t)))
    return Stroke(points=pts)


def polygon_stroke(corners):
    pts = []
    for i in range(len(corners)):
        (x1, y1), (x2, y2) = corners[i], corners[(i + 1) % len(corners)]
        for k in range(25):
            t = k / 25
            pts.append((int(x1 + (x2 - x1) * t), int(y1 + (y2 - y1) * t)))
    return Stroke(points=pts)


def triangle_stroke():
    return polygon_stroke([(150, 80), (320, 260), (60, 260)])


def diamond_stroke():
    return polygon_stroke([(200, 60), (340, 160), (200, 260), (60, 160)])


def arrow_stroke():
    pts = [(i, 0) for i in range(0, 201, 4)]
    pts += [(200, 0), (190, -22), (190, 22)]
    return Stroke(points=pts)


def zigzag_stroke():
    import random

    rng = random.Random(11)
    x, y = 50, 100
    pts = [(x, y)]
    for _ in range(45):
        x += rng.randint(-18, 18)
        y += rng.randint(-18, 18)
        pts.append((x, y))
    return Stroke(points=pts)


class ShapeRecognizerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.recognizer = ShapeRecognizer()

    def test_straight_line_is_line(self) -> None:
        shape = self.recognizer.recognize_stroke(line_stroke((0, 0), (300, 0)))
        self.assertEqual(shape.kind, "line")
        self.assertAlmostEqual(shape.params["length"], 300.0, delta=2.0)

    def test_wobbly_line_is_line(self) -> None:
        shape = self.recognizer.recognize_stroke(line_stroke((0, 0), (300, 0), noise=2.0))
        self.assertEqual(shape.kind, "line")

    def test_circle_is_circle(self) -> None:
        shape = self.recognizer.recognize_stroke(circle_stroke())
        self.assertEqual(shape.kind, "circle")
        self.assertAlmostEqual(shape.params["radius"], 100.0, delta=2.0)

    def test_rectangle_is_rectangle(self) -> None:
        shape = self.recognizer.recognize_stroke(rectangle_stroke())
        self.assertEqual(shape.kind, "rectangle")

    def test_triangle_is_triangle(self) -> None:
        shape = self.recognizer.recognize_stroke(triangle_stroke())
        self.assertEqual(shape.kind, "triangle")
        self.assertEqual(len(shape.params["corners"]), 3)
        self.assertGreater(shape.params["area"], 0.0)

    def test_diamond_is_diamond(self) -> None:
        shape = self.recognizer.recognize_stroke(diamond_stroke())
        self.assertEqual(shape.kind, "diamond")
        self.assertEqual(len(shape.params["corners"]), 4)
        self.assertEqual(len(shape.params["diagonals"]), 2)

    def test_open_v_is_not_a_polygon(self) -> None:
        pts = []
        for i in range(40):
            pts.append((i * 4, 0))
        for i in range(20):
            pts.append((160 - i * 6, i * 3))
        shape = self.recognizer.recognize_stroke(Stroke(points=pts))
        self.assertNotIn(shape.kind, ("triangle", "diamond"))

    def test_diamond_is_preferred_over_rectangle(self) -> None:
        shape = self.recognizer.recognize_stroke(diamond_stroke())
        self.assertEqual(shape.kind, "diamond")

    def test_arrow_is_arrow(self) -> None:
        shape = self.recognizer.recognize_stroke(arrow_stroke())
        self.assertEqual(shape.kind, "arrow")
        self.assertEqual(shape.params["head"], (190, 22))

    def test_zigzag_is_unknown(self) -> None:
        shape = self.recognizer.recognize_stroke(zigzag_stroke())
        self.assertEqual(shape.kind, "unknown")


class DiagramTest(unittest.TestCase):
    def setUp(self) -> None:
        self.recognizer = ShapeRecognizer()

    def test_flowchart_assembly(self) -> None:
        box1 = self.recognizer.recognize_stroke(rectangle_stroke())
        box2 = self.recognizer.recognize_stroke(rectangle_stroke())
        # move box2 to the right of box1
        for point in box2.points:
            pass
        box2_shifted = Stroke(points=[(p[0] + 300, p[1]) for p in box2.points])
        box2 = self.recognizer.recognize_stroke(box2_shifted)

        arrow = self.recognizer.recognize_stroke(arrow_stroke())
        arrow_shifted = Stroke(points=[(p[0] + 200, p[1] + 75) for p in arrow.points])
        arrow = self.recognizer.recognize_stroke(arrow_shifted)

        diagram = self.recognizer.build_diagram([box1, box2, arrow])
        self.assertEqual(len(diagram.nodes), 2)
        self.assertEqual(len(diagram.edges), 1)
        self.assertEqual(diagram.edges[0].source, diagram.nodes[0].id)
        self.assertEqual(diagram.edges[0].target, diagram.nodes[1].id)

    def test_text_label_attached_to_node(self) -> None:
        box = self.recognizer.recognize_stroke(rectangle_stroke())
        text = OCRResult(text="start", confidence=90.0, box=(150, 130, 60, 25))
        diagram = self.recognizer.build_diagram([box], text_regions=[text])
        self.assertEqual(diagram.nodes[0].label, "start")

    def test_edge_label_attached_to_arrow(self) -> None:
        box1 = self.recognizer.recognize_stroke(rectangle_stroke())
        box2_shifted = Stroke(
            points=[(p[0] + 300, p[1]) for p in rectangle_stroke().points]
        )
        box2 = self.recognizer.recognize_stroke(box2_shifted)
        arrow_shifted = Stroke(
            points=[(p[0] + 200, p[1] + 75) for p in arrow_stroke().points]
        )
        arrow = self.recognizer.recognize_stroke(arrow_shifted)
        text = OCRResult(text="yes", confidence=90.0, box=(280, 60, 40, 30))
        diagram = self.recognizer.build_diagram(
            [box1, box2, arrow], text_regions=[text]
        )
        self.assertEqual(diagram.edges[0].label, "yes")


if __name__ == "__main__":
    unittest.main()
