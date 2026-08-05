"""Unit tests for the gesture classifier.

Hand landmarks are synthesised (no camera required) so the classification
logic is tested in isolation.
"""

from __future__ import annotations

import unittest

from tracking import Gesture, GestureClassifier, Hand, Landmark


def synthetic_hand(
    thumb_extended: bool = True,
    index_extended: bool = True,
    middle_extended: bool = True,
    ring_extended: bool = True,
    pinky_extended: bool = True,
    pinch: bool = False,
) -> Hand:
    """Build a plausible hand landmark set from the desired finger poses.

    The hand is drawn "pointing up": wrist at the bottom, fingers reaching
    toward the top of the frame.  Landmark indices follow the MediaPipe
    topology (0=wrist, 1..4=thumb, 5..8=index, ..., 17..20=pinky).
    """
    base_fingers = {
        5: (0.44, 0.76), 9: (0.50, 0.75), 13: (0.56, 0.76), 17: (0.61, 0.78)
    }  # MCP joints
    tip = 4
    pips = {5: 6, 9: 10, 13: 14, 17: 18}
    extended = {
        5: index_extended, 9: middle_extended, 13: ring_extended, 17: pinky_extended
    }

    lm: list[tuple[float, float]] = [(0.50, 0.90)]  # wrist
    # thumb chain
    lm.append((0.42, 0.80))  # CMC
    lm.append((0.37, 0.77))  # MCP
    if pinch:
        lm.append((0.42, 0.68))  # IP
        lm.append((0.44, 0.64))  # TIP near index tip
    elif thumb_extended:
        lm.append((0.32, 0.72))
        lm.append((0.30, 0.66))
    else:
        lm.append((0.37, 0.76))
        lm.append((0.38, 0.75))
    # four fingers
    for mcp_idx in (5, 9, 13, 17):
        mx, my = base_fingers[mcp_idx]
        lm.append((mx, my))                       # MCP
        lm.append((mx, my - 0.02))                # PIP
        lm.append((mx, my - 0.04))                # DIP
        if extended[mcp_idx]:
            lm.append((mx, my - 0.12))            # extended TIP
        else:
            lm.append((mx, my + 0.005))           # curled TIP (near palm)

    assert len(lm) == 21, f"expected 21 landmarks, got {len(lm)}"
    landmarks = [Landmark(x, y, 0.0) for x, y in lm]
    return Hand(landmarks=landmarks, handedness="Left", score=1.0)


class GestureClassifierTest(unittest.TestCase):
    def setUp(self) -> None:
        self.classifier = GestureClassifier()

    def test_open_palm(self) -> None:
        state = self.classifier.classify(synthetic_hand())
        self.assertEqual(state.gesture, Gesture.OPEN_PALM)

    def test_fist(self) -> None:
        state = self.classifier.classify(
            synthetic_hand(
                thumb_extended=False,
                index_extended=False,
                middle_extended=False,
                ring_extended=False,
                pinky_extended=False,
            )
        )
        self.assertEqual(state.gesture, Gesture.FIST)

    def test_pinch(self) -> None:
        state = self.classifier.classify(synthetic_hand(pinch=True))
        self.assertEqual(state.gesture, Gesture.PINCH)
        self.assertLess(state.pinch_distance, self.classifier.pinch_ratio)

    def test_partial_pose_is_none(self) -> None:
        state = self.classifier.classify(
            synthetic_hand(index_extended=False, middle_extended=False)
        )
        self.assertEqual(state.gesture, Gesture.NONE)

    def test_cursor_is_index_tip(self) -> None:
        state = self.classifier.classify(synthetic_hand())
        self.assertAlmostEqual(state.cursor[0], 0.44, places=2)
        self.assertAlmostEqual(state.cursor[1], 0.64, places=2)

    def test_extended_fingers_report(self) -> None:
        state = self.classifier.classify(synthetic_hand(pinky_extended=False))
        self.assertEqual(state.extended_fingers, (True, True, True, True, False))

    def test_fist_overrides_pinch_ordering(self) -> None:
        # A fully curled hand where the thumb happens to sit close to the index
        # tip must still be recognised as a fist, not a pinch.
        hand = synthetic_hand(
            thumb_extended=False,
            index_extended=False,
            middle_extended=False,
            ring_extended=False,
            pinky_extended=False,
        )
        hand.landmarks[THUMB_TIP_IDX] = Landmark(0.44, 0.76, 0.0)
        state = self.classifier.classify(hand)
        self.assertEqual(state.gesture, Gesture.FIST)


THUMB_TIP_IDX = 4


if __name__ == "__main__":
    unittest.main()
