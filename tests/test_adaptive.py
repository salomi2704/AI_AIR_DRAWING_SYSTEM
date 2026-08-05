"""Unit tests for adaptive preview resolution."""

from __future__ import annotations

import unittest

from core.adaptive import AdaptiveResolution


class AdaptiveResolutionTest(unittest.TestCase):
    def test_starts_at_full_scale(self) -> None:
        adaptive = AdaptiveResolution()
        self.assertEqual(adaptive.scale, 1.0)

    def test_low_fps_shrinks_preview(self) -> None:
        adaptive = AdaptiveResolution(target_fps=30)
        adaptive.update(10.0)
        self.assertLess(adaptive.scale, 1.0)

    def test_high_fps_restores_preview(self) -> None:
        adaptive = AdaptiveResolution(target_fps=30)
        adaptive.update(10.0)
        adaptive.update(60.0)
        self.assertGreater(adaptive.scale, 0.9)
        for _ in range(50):
            adaptive.update(60.0)
        self.assertEqual(adaptive.scale, 1.0)

    def test_never_goes_below_min_scale(self) -> None:
        adaptive = AdaptiveResolution(target_fps=30, min_scale=0.5)
        for _ in range(200):
            adaptive.update(1.0)
        self.assertGreaterEqual(adaptive.scale, 0.5)

    def test_never_goes_above_max_scale(self) -> None:
        adaptive = AdaptiveResolution(target_fps=30, max_scale=1.0)
        for _ in range(200):
            adaptive.update(120.0)
        self.assertLessEqual(adaptive.scale, 1.0)

    def test_hysteresis_around_target(self) -> None:
        adaptive = AdaptiveResolution(target_fps=30)
        before = adaptive.scale
        for _ in range(50):
            adaptive.update(30.0)  # exactly on target -> no change
        self.assertEqual(adaptive.scale, before)

    def test_zero_fps_is_ignored(self) -> None:
        adaptive = AdaptiveResolution(target_fps=30)
        adaptive.update(0.0)
        self.assertEqual(adaptive.scale, 1.0)


if __name__ == "__main__":
    unittest.main()
