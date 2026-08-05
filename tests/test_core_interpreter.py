"""Unit tests for the gesture interpreter (core) using fake surfaces."""

from __future__ import annotations

import unittest

from core import CursorSmoother, GestureInterpreter
from tests.fakes import FakeButton, FakeCanvas, make_ui
from tracking import Gesture, GestureState


def state(gesture: Gesture, cursor=(0.5, 0.5)) -> GestureState:
    return GestureState(gesture=gesture, cursor=cursor)


class GestureInterpreterTest(unittest.TestCase):
    def setUp(self) -> None:
        self.canvas = FakeCanvas()
        self.ui = make_ui()
        self.interp = GestureInterpreter(
            self.canvas,
            self.ui,
            lost_frames_tolerance=3,
            erase_interval=0.0,
            pinch_confirm_frames=1,
        )

    def test_no_hand_yields_no_cursor(self) -> None:
        update = self.interp.update([], 100, 100)
        self.assertIsNone(update.cursor)
        self.assertFalse(self.canvas.active)

    def test_single_pinch_draws_and_ends_on_release(self) -> None:
        self.interp.update([state(Gesture.PINCH, (0.2, 0.2))], 100, 100)
        self.assertTrue(self.canvas.active)
        self.assertEqual(self.canvas.stroke_color, "#000000")
        self.assertEqual(self.canvas.stroke_thickness, 10)
        self.interp.update([state(Gesture.PINCH, (0.4, 0.2))], 100, 100)
        update = self.interp.update([state(Gesture.OPEN_PALM)], 100, 100)
        self.assertFalse(self.canvas.active)
        self.assertTrue(self.canvas.ended)
        self.assertIsNone(update.tap_button)

    def test_single_open_palm_never_draws(self) -> None:
        self.interp.update([state(Gesture.OPEN_PALM)], 100, 100)
        self.assertFalse(self.canvas.active)

    def test_two_fists_erase_driven_by_eraser_hand(self) -> None:
        update = self.interp.update(
            [state(Gesture.FIST, (0.1, 0.1)), state(Gesture.FIST, (0.9, 0.9))],
            100,
            100,
        )
        self.assertEqual(self.canvas.erases, 1)
        self.assertEqual(self.canvas.erased_points, [(90, 90)])
        self.assertEqual(update.gesture, Gesture.FIST)
        self.assertEqual(update.status, "Erased 3 points")
        self.assertEqual(update.erase_radius, int(0.035 * (100**2 + 100**2) ** 0.5))

    def test_pinch_over_button_is_tap_and_never_draws(self) -> None:
        button = FakeButton("color:#E53935", "color", label="red")
        ui = make_ui(button)
        interp = GestureInterpreter(
            self.canvas, ui, lost_frames_tolerance=3, pinch_confirm_frames=1
        )
        interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertFalse(self.canvas.active)
        update = interp.update([state(Gesture.OPEN_PALM)], 100, 100)
        self.assertIs(update.tap_button, button)

    def test_second_hand_never_draws_in_hover_mode(self) -> None:
        interp = GestureInterpreter(
            self.canvas, self.ui, lost_frames_tolerance=3, pinch_confirm_frames=1
        )
        interp.update(
            [state(Gesture.PINCH, (0.3, 0.3)), state(Gesture.OPEN_PALM, (0.7, 0.7))],
            100,
            100,
        )
        self.assertFalse(self.canvas.active)

    def test_hover_mode_pinch_over_button_taps(self) -> None:
        button = FakeButton("brush:22", "brush", label="22")
        ui = make_ui(button)
        interp = GestureInterpreter(
            self.canvas, ui, lost_frames_tolerance=3, pinch_confirm_frames=1
        )
        interp.update(
            [state(Gesture.PINCH), state(Gesture.OPEN_PALM)], 100, 100
        )
        self.assertFalse(self.canvas.active)
        update = interp.update(
            [state(Gesture.OPEN_PALM), state(Gesture.OPEN_PALM)], 100, 100
        )
        self.assertIs(update.tap_button, button)

    def test_brief_loss_keeps_stroke_open(self) -> None:
        self.interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertTrue(self.canvas.active)
        self.interp.update([], 100, 100)
        self.interp.update([], 100, 100)
        self.assertTrue(self.canvas.active)  # tolerance not reached yet
        update = self.interp.update([], 100, 100)
        self.assertFalse(self.canvas.active)
        self.assertTrue(self.canvas.ended)
        self.assertIsNone(update.cursor)

    def test_cursor_is_smoothed(self) -> None:
        self.interp.update([state(Gesture.OPEN_PALM, (0.2, 0.2))], 100, 100)
        update = self.interp.update([state(Gesture.OPEN_PALM, (0.8, 0.8))], 100, 100)
        # a large jump -> alpha ~ 1 -> cursor tracks nearly 1:1
        self.assertAlmostEqual(update.cursor[0], 0.8, places=1)
        self.assertIsNotNone(update.cursor)

    def test_status_after_erase_is_reported_once(self) -> None:
        self.interp.update(
            [state(Gesture.FIST), state(Gesture.FIST)], 100, 100
        )
        self.assertEqual(self.interp.update(
            [state(Gesture.FIST), state(Gesture.FIST)], 100, 100
        ).status, "Erased 3 points")


class GestureInterpreterDebounceTest(unittest.TestCase):
    """A pinch must persist for a few frames before it draws or taps."""

    def test_pinch_must_persist_before_drawing(self) -> None:
        canvas = FakeCanvas()
        interp = GestureInterpreter(canvas, make_ui(), pinch_confirm_frames=3)
        interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertFalse(canvas.active)
        interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertFalse(canvas.active)
        interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertTrue(canvas.active)
        self.assertEqual(canvas.stroke_start, (50, 50))

    def test_one_frame_pinch_is_ignored_not_tapped(self) -> None:
        canvas = FakeCanvas()
        interp = GestureInterpreter(canvas, make_ui(), pinch_confirm_frames=3)
        interp.update([state(Gesture.PINCH)], 100, 100)
        update = interp.update([state(Gesture.OPEN_PALM)], 100, 100)
        self.assertFalse(canvas.active)
        self.assertIsNone(update.tap_button)

    def test_confirm_counter_resets_on_release(self) -> None:
        canvas = FakeCanvas()
        interp = GestureInterpreter(canvas, make_ui(), pinch_confirm_frames=2)
        interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertFalse(canvas.active)
        interp.update([state(Gesture.OPEN_PALM)], 100, 100)
        interp.update([state(Gesture.PINCH)], 100, 100)
        interp.update([state(Gesture.PINCH)], 100, 100)
        self.assertTrue(canvas.active)


class GestureInterpreterSmootherInjectionTest(unittest.TestCase):
    def test_custom_smoother_is_used(self) -> None:
        canvas = FakeCanvas()
        ui = make_ui()
        smoother = CursorSmoother()
        interp = GestureInterpreter(canvas, ui, smoother=smoother)
        interp.update([state(Gesture.OPEN_PALM, (0.5, 0.5))], 100, 100)
        self.assertEqual(smoother.smoothed, (0.5, 0.5))


if __name__ == "__main__":
    unittest.main()
