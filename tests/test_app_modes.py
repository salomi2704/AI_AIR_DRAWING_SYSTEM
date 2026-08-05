"""Unit tests for the two-hand mode resolution (no camera required)."""

from __future__ import annotations

import unittest

import config
from app import resolve_mode
from tracking.gestures import Gesture, GestureState


def state(gesture: Gesture, cursor=(0.5, 0.5)) -> GestureState:
    return GestureState(gesture=gesture, cursor=cursor)


class ResolveModeTest(unittest.TestCase):
    def test_no_hands_is_none_mode(self) -> None:
        self.assertEqual(resolve_mode([])[0], "none")

    def test_single_open_palm_is_single_mode(self) -> None:
        mode, primary, eraser = resolve_mode([state(Gesture.OPEN_PALM)])
        self.assertEqual(mode, "single")
        self.assertIs(primary.gesture, Gesture.OPEN_PALM)
        self.assertIsNone(eraser)

    def test_single_pinch_is_single_mode(self) -> None:
        self.assertEqual(resolve_mode([state(Gesture.PINCH)])[0], "single")

    def test_single_fist_is_single_mode(self) -> None:
        self.assertEqual(resolve_mode([state(Gesture.FIST)])[0], "single")

    def test_two_fists_is_erase_mode(self) -> None:
        mode, primary, eraser = resolve_mode(
            [state(Gesture.FIST, cursor=(0.1, 0.1)), state(Gesture.FIST, cursor=(0.9, 0.9))]
        )
        self.assertEqual(mode, "erase")
        self.assertEqual(eraser.cursor, (0.9, 0.9))

    def test_erase_uses_configured_hand_index(self) -> None:
        hand_index = config.ERASE_HAND_INDEX
        states = [state(Gesture.FIST, cursor=(i, 0.0)) for i in range(3)]
        _, _, eraser = resolve_mode(states)
        self.assertEqual(eraser.cursor, (hand_index, 0.0))

    def test_two_hands_not_all_fists_is_hover_mode(self) -> None:
        mode, primary, eraser = resolve_mode(
            [state(Gesture.OPEN_PALM), state(Gesture.FIST)]
        )
        self.assertEqual(mode, "hover")
        self.assertIsNotNone(primary)
        self.assertIsNone(eraser)

    def test_two_pinches_is_hover_mode_never_draws(self) -> None:
        self.assertEqual(
            resolve_mode([state(Gesture.PINCH), state(Gesture.PINCH)])[0],
            "hover",
        )


if __name__ == "__main__":
    unittest.main()
