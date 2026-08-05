"""Unit tests for white-key compositing (single-pass vs reference)."""

from __future__ import annotations

import unittest

import numpy as np

from canvas.composite import composite_mask_ops, composite_white_key, key_mask


class CompositeTest(unittest.TestCase):
    def setUp(self) -> None:
        rng = np.random.default_rng(42)
        self.frame = rng.integers(0, 255, size=(64, 80, 3), dtype=np.uint8)

    def _overlay_with_ink(self) -> np.ndarray:
        overlay = np.full((64, 80, 3), 255, dtype=np.uint8)
        overlay[10:20, 10:30] = (20, 20, 20)  # dark stroke
        overlay[30:40, 40:60] = (231, 53, 53)  # red stroke (BGR)
        overlay[5, 5] = (254, 254, 254)  # near-white AA edge
        return overlay

    def test_single_pass_matches_reference(self) -> None:
        overlay = self._overlay_with_ink()
        expected = composite_mask_ops(self.frame, overlay)
        actual = composite_white_key(self.frame, overlay)
        np.testing.assert_array_equal(actual, expected)

    def test_ink_is_painted_background_is_kept(self) -> None:
        overlay = self._overlay_with_ink()
        result = composite_white_key(self.frame, overlay)
        self.assertTrue(np.all(result[10:20, 10:30] == 20))
        np.testing.assert_array_equal(
            result[50:60, 60:70], self.frame[50:60, 60:70]
        )

    def test_does_not_mutate_input_frame(self) -> None:
        overlay = self._overlay_with_ink()
        before = self.frame.copy()
        composite_white_key(self.frame, overlay)
        np.testing.assert_array_equal(self.frame, before)

    def test_key_mask_threshold_semantics(self) -> None:
        overlay = np.full((4, 4, 3), 255, dtype=np.uint8)
        overlay[0, 0] = (250, 250, 250)  # exactly at threshold -> background
        overlay[1, 1] = (249, 250, 250)  # one channel below -> ink
        mask = key_mask(overlay, threshold=250)
        self.assertTrue(mask[1, 1])
        self.assertFalse(mask[0, 0])
        self.assertFalse(mask[3, 3])

    def test_output_shape_and_dtype(self) -> None:
        overlay = self._overlay_with_ink()
        result = composite_white_key(self.frame, overlay)
        self.assertEqual(result.shape, self.frame.shape)
        self.assertEqual(result.dtype, np.uint8)


if __name__ == "__main__":
    unittest.main()
