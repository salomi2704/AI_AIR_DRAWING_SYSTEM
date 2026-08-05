"""Unit tests for formula detection heuristics."""

from __future__ import annotations

import unittest

from recognition import FormulaDetector


class FormulaDetectorTest(unittest.TestCase):
    def setUp(self) -> None:
        self.detector = FormulaDetector()

    def test_prose_is_not_formula(self) -> None:
        self.assertFalse(self.detector.is_formula("the cat sat on the mat"))
        self.assertFalse(self.detector.is_formula("Hello, how are you today?"))

    def test_equation_is_formula(self) -> None:
        self.assertTrue(self.detector.is_formula("y = mx + b"))
        self.assertTrue(self.detector.is_formula("x^2 + 3x = 12"))

    def test_math_symbols_trigger_formula(self) -> None:
        self.assertTrue(self.detector.is_formula("E = mc^2"))
        self.assertTrue(self.detector.is_formula("\u222b x dx"))  # integral sign
        self.assertTrue(self.detector.is_formula("A = \u03c0 r^2"))  # pi

    def test_number_expression_is_formula(self) -> None:
        self.assertTrue(self.detector.is_formula("3 + 4 = 7"))

    def test_extract_cleans_spacing(self) -> None:
        self.assertEqual(self.detector.extract("y= mx+b"), "y = mx + b")
        self.assertIsNone(self.detector.extract("just some words"))


if __name__ == "__main__":
    unittest.main()
