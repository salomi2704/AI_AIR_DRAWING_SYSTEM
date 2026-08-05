"""Unit tests for the exporters (writes temp files, no camera)."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from canvas import VirtualCanvas
from export import ExportBundle, export_all
from recognition.ocr import OCRResult


class ExportTest(unittest.TestCase):
    def setUp(self) -> None:
        self.canvas = VirtualCanvas(width=400, height=300)
        self.canvas.begin_stroke((50, 150), color_hex="#1E88E5", thickness=10)
        for x in range(60, 300):
            self.canvas.extend_stroke((x, 150 + (x % 7)))
        self.canvas.end_stroke()
        self.text = OCRResult(text="hello", confidence=85.0, box=(20, 40, 80, 30))
        self.bundle = ExportBundle(
            canvas=self.canvas,
            text_regions=[self.text],
            latex=[r"$y = mx + b$", r"$\pi r^2$"],
        )

    def test_export_all_writes_every_format(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            files = export_all(self.bundle, output_dir=tmp, base_name="test")
            for fmt in ("svg", "png", "pdf", "tex"):
                self.assertIn(fmt, files)
                path = Path(files[fmt])
                self.assertTrue(path.exists())
                self.assertGreater(path.stat().st_size, 100)

    def test_png_is_canvas_size(self) -> None:
        import cv2

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.png"
            from export import PngExporter

            PngExporter().export(self.bundle, path)
            image = cv2.imread(str(path))
            self.assertEqual(image.shape, (300, 400, 3))

    def test_svg_contains_stroke_color(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            from export import SvgExporter

            path = SvgExporter().export(self.bundle, Path(tmp) / "out.svg")
            content = path.read_text()
            self.assertIn("#1E88E5", content)
            self.assertIn("hello", content)

    def test_tex_contains_formulas(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "out.tex"
            from export import TexExporter

            TexExporter().export(self.bundle, path)
            content = path.read_text()
            self.assertIn("\\pi r^2", content)
            self.assertIn("Recognised text", content)


if __name__ == "__main__":
    unittest.main()
