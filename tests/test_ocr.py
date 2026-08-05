"""Unit tests for the OCR pipeline.

The heavy lifting needs the Tesseract binary; tests that depend on it are
skipped when the binary is not installed.  Rendering / pre-processing are pure
NumPy/OpenCV and always run.
"""

from __future__ import annotations

import unittest

import numpy as np

from canvas import Stroke
from recognition.ocr import OCRRecognizer


class OCRPipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.recognizer = OCRRecognizer()

    def _letter(self) -> Stroke:
        points = [(10 + i, 10) for i in range(30)]
        return Stroke(points=points)

    def test_render_strokes_cropped_image(self) -> None:
        rendered = self.recognizer.render_strokes([self._letter()])
        self.assertIsNotNone(rendered)
        image, bbox = rendered
        self.assertEqual(image.ndim, 2)
        x, y, w, h = bbox
        self.assertGreater(w, 0)
        self.assertGreater(h, 0)

    def test_render_empty_is_none(self) -> None:
        self.assertIsNone(self.recognizer.render_strokes([]))

    def test_preprocess_returns_binary(self) -> None:
        rendered = self.recognizer.render_strokes([self._letter()])
        image, _ = rendered
        binary = self.recognizer._preprocess(image)
        self.assertEqual(binary.dtype, np.uint8)
        self.assertTrue(np.all((binary == 0) | (binary == 255)))

    def test_recognize_raises_without_tesseract(self) -> None:
        if self.recognizer.is_available():
            self.skipTest("tesseract is installed")
        with self.assertRaises(RuntimeError):
            self.recognizer.recognize([self._letter()])


if __name__ == "__main__":
    unittest.main()
