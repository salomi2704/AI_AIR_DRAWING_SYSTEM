"""Unit tests for adaptive pinch detection.

The pinch thresholds tighten as MediaPipe confidence drops (so an ambiguous
hand needs a clearly closed pinch before it draws), and ``reset()`` forgets
the hysteresis latch together with the palm estimate.
"""

from __future__ import annotations

import unittest

from tests.test_gestures import synthetic_hand
from tracking import Gesture, GestureClassifier, Landmark

THUMB_TIP_IDX = 4


class AdaptivePinchTest(unittest.TestCase):
    def _marginal_pinch(self, score: float):
        """A hand whose pinch gap is ~0.30 of the palm size.

        That sits between the low-confidence entry threshold (~0.28) and the
        full-confidence entry threshold (0.35), while the thumb still reads as
        extended (so the pose is a pinch or an open palm, never "none").
        """
        hand = synthetic_hand(pinch=True)
        hand.landmarks[THUMB_TIP_IDX] = Landmark(0.395, 0.64, 0.0)
        hand.score = score
        return hand

    def test_marginal_gap_pinches_at_full_confidence(self) -> None:
        classifier = GestureClassifier()
        state = classifier.classify(self._marginal_pinch(1.0))
        self.assertEqual(state.gesture, Gesture.PINCH)

    def test_same_gap_is_suppressed_at_low_confidence(self) -> None:
        classifier = GestureClassifier()
        state = classifier.classify(self._marginal_pinch(0.3))
        self.assertEqual(state.gesture, Gesture.OPEN_PALM)

    def test_confidence_adaptation_can_be_disabled(self) -> None:
        classifier = GestureClassifier(confidence_adaptation=0.0)
        state = classifier.classify(self._marginal_pinch(0.3))
        self.assertEqual(state.gesture, Gesture.PINCH)


class PinchLatchResetTest(unittest.TestCase):
    def test_reset_releases_the_latch(self) -> None:
        classifier = GestureClassifier()
        classifier.classify(synthetic_hand(pinch=True))
        hand = synthetic_hand(pinch=True)
        hand.landmarks[THUMB_TIP_IDX] = Landmark(0.50, 0.60, 0.0)
        self.assertEqual(classifier.classify(hand).gesture, Gesture.PINCH)  # latched
        classifier.reset()
        self.assertEqual(classifier.classify(hand).gesture, Gesture.NONE)  # fresh


if __name__ == "__main__":
    unittest.main()
