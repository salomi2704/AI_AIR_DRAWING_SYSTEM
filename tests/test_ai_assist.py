"""Unit tests for sketch cleanup and LaTeX conversion."""

from __future__ import annotations

import math
import unittest

from ai_assist import LatexConverter, SketchCleaner
from canvas import Stroke
from recognition import ShapeRecognizer


class SketchCleanerTest(unittest.TestCase):
    def setUp(self) -> None:
        self.cleaner = SketchCleaner(recognizer=ShapeRecognizer(), samples=48)

    def _wobbly_line(self) -> Stroke:
        pts = []
        for i in range(30):
            x = i * 10
            y = 5 + (3 if i % 3 else -3)
            pts.append((x, int(y)))
        return Stroke(points=pts, color_hex="#1E88E5", thickness=12)

    def _wobbly_circle(self, cx=300, cy=300, r=120) -> Stroke:
        pts = []
        for i in range(60):
            ang = 2 * math.pi * i / 60
            wobble = 6 if i % 5 else -6
            pts.append(
                (
                    int(cx + (r + wobble) * math.cos(ang)),
                    int(cy + (r + wobble) * math.sin(ang)),
                )
            )
        return Stroke(points=pts)

    def test_line_is_straightened(self) -> None:
        clean = self.cleaner.clean_stroke(self._wobbly_line())
        xs = [p[0] for p in clean.points]
        ys = [p[1] for p in clean.points]
        self.assertEqual(len(xs), 2)
        self.assertEqual(sorted(xs), [0, 290])
        self.assertLessEqual(max(ys) - min(ys), 2)

    def test_cleaned_stroke_keeps_attributes(self) -> None:
        clean = self.cleaner.clean_stroke(self._wobbly_line())
        self.assertEqual(clean.color_hex, "#1E88E5")
        self.assertEqual(clean.thickness, 12)

    def test_circle_is_snapped_to_perfect_radius(self) -> None:
        clean = self.cleaner.clean_stroke(self._wobbly_circle())
        cx = sum(p[0] for p in clean.points) / len(clean.points)
        cy = sum(p[1] for p in clean.points) / len(clean.points)
        radii = [math.hypot(p[0] - cx, p[1] - cy) for p in clean.points]
        self.assertLess(max(radii) - min(radii), 2.0)

    def test_unknown_stroke_passes_through(self) -> None:
        pts = [(i * 5, (i * i) % 50) for i in range(20)]
        stroke = Stroke(points=pts)
        clean = self.cleaner.clean_stroke(stroke)
        self.assertEqual(clean.points, pts)


class LatexConverterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.converter = LatexConverter()

    def test_wraps_in_math_mode(self) -> None:
        self.assertEqual(self.converter.to_latex("y = mx + b"), "$y = mx + b$")

    def test_unicode_symbols_mapped(self) -> None:
        self.assertEqual(self.converter.to_latex("\u03c0 r\u00d7 2"), r"$\pi r\times 2$")

    def test_superscript_grouped(self) -> None:
        self.assertEqual(self.converter.to_latex("x^2 + 1"), "$x^{2} + 1$")

    def test_integral(self) -> None:
        self.assertEqual(self.converter.to_latex("\u222b x dx"), r"$\int x dx$")

    def test_pix2tex_unavailable_check(self) -> None:
        # Should not raise, whichever way the environment is set up.
        self.assertIsInstance(self.converter.is_pix2tex_available(), bool)


if __name__ == "__main__":
    unittest.main()
