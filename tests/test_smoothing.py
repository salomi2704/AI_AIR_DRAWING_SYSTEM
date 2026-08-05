"""Unit tests for One-Euro temporal landmark smoothing.

These tests exercise the filters directly (no OpenCV/MediaPipe required).
"""

from __future__ import annotations

import unittest

from tracking import Hand, Landmark
from tracking.smoothing import LandmarkFilter, LowPassFilter, OneEuroFilter


def make_hand(x: float, y: float) -> Hand:
    landmarks = [Landmark(x=x, y=y, z=0.0) for _ in range(21)]
    return Hand(landmarks=landmarks, handedness="Right", score=1.0)


class LowPassFilterTest(unittest.TestCase):
    def test_first_sample_passes_through(self) -> None:
        flt = LowPassFilter(alpha=0.5)
        self.assertEqual(flt.filter(0.7), 0.7)

    def test_alpha_weights_new_vs_old(self) -> None:
        flt = LowPassFilter(alpha=0.5)
        flt.filter(100.0)
        self.assertEqual(flt.filter(0.0), 50.0)

    def test_reset_clears_state(self) -> None:
        flt = LowPassFilter(alpha=0.5)
        flt.filter(10.0)
        flt.reset()
        self.assertEqual(flt.filter(5.0), 5.0)


class OneEuroFilterTest(unittest.TestCase):
    def _filter(self) -> OneEuroFilter:
        return OneEuroFilter(min_cutoff=2.0, beta=0.05, d_cutoff=1.0, rate=30.0)

    def test_constant_input_converges(self) -> None:
        flt = self._filter()
        out = 0.0
        for _ in range(60):
            out = flt(0.5)
        self.assertAlmostEqual(out, 0.5, places=3)

    def test_step_is_approached_not_jumped(self) -> None:
        flt = self._filter()
        flt(0.0)
        out = flt(1.0)
        self.assertGreater(out, 0.0)
        self.assertLess(out, 1.0)

    def test_fast_moves_keep_more_bandwidth_than_slow_noise(self) -> None:
        passive = OneEuroFilter(min_cutoff=2.0, beta=0.0, d_cutoff=1.0, rate=30.0)
        adaptive = OneEuroFilter(min_cutoff=2.0, beta=1.0, d_cutoff=1.0, rate=30.0)
        passive(0.0)
        adaptive(0.0)
        self.assertGreater(adaptive(1.0), passive(1.0))

    def test_reset_restarts_history(self) -> None:
        flt = self._filter()
        flt(0.0)
        flt(0.5)
        flt.reset()
        self.assertEqual(flt(0.3), 0.3)


class LandmarkFilterTest(unittest.TestCase):
    def _filter(self) -> LandmarkFilter:
        return LandmarkFilter(min_cutoff=2.0, beta=0.05, d_cutoff=1.0, rate=30.0)

    def test_steady_hand_does_not_drift(self) -> None:
        flt = self._filter()
        hand = make_hand(0.4, 0.4)
        out = hand
        for _ in range(30):
            out = flt.filter_hand(hand, dt=1 / 30)
        self.assertAlmostEqual(out.landmarks[8].x, 0.4, places=3)
        self.assertAlmostEqual(out.landmarks[8].y, 0.4, places=3)

    def test_jump_is_low_passed(self) -> None:
        flt = self._filter()
        flt.filter_hand(make_hand(0.1, 0.1), dt=1 / 30)
        out = flt.filter_hand(make_hand(0.9, 0.9), dt=1 / 30)
        x = out.landmarks[8].x
        self.assertGreater(x, 0.1)
        self.assertLess(x, 0.9)

    def test_metadata_is_preserved(self) -> None:
        flt = self._filter()
        out = flt.filter_hand(make_hand(0.5, 0.5), dt=1 / 30)
        self.assertEqual(out.handedness, "Right")
        self.assertEqual(out.score, 1.0)
        self.assertEqual(len(out.landmarks), 21)

    def test_reset_forgets_history(self) -> None:
        flt = self._filter()
        flt.filter_hand(make_hand(0.1, 0.1), dt=1 / 30)
        flt.reset()
        out = flt.filter_hand(make_hand(0.5, 0.5), dt=1 / 30)
        self.assertAlmostEqual(out.landmarks[0].x, 0.5, places=6)

    def test_duck_typed_objects_are_supported(self) -> None:
        class MiniLandmark:
            def __init__(self, x, y, **kwargs):
                self.x, self.y, self.z = x, y, kwargs.get("z", 0.0)

        class MiniHand:
            def __init__(self, landmarks, **kwargs):
                self.landmarks = landmarks

        flt = self._filter()
        out = flt.filter_hand(MiniHand([MiniLandmark(0.3, 0.3) for _ in range(21)]))
        self.assertEqual(len(out.landmarks), 21)
        self.assertAlmostEqual(out.landmarks[0].x, 0.3, places=6)


if __name__ == "__main__":
    unittest.main()
