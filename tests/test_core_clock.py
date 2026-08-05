"""Unit tests for the cursor smoother and frame clock in core."""

from __future__ import annotations

import unittest

from core import CursorSmoother, FPSMeter, FramePacer


class CursorSmootherTest(unittest.TestCase):
    def test_first_sample_passes_through(self) -> None:
        smoother = CursorSmoother()
        self.assertEqual(smoother.smooth((0.5, 0.5)), (0.5, 0.5))

    def test_stationary_cursor_settles(self) -> None:
        smoother = CursorSmoother()
        smoother.smooth((0.5, 0.5))
        out = smoother.smooth((0.5, 0.5))
        self.assertAlmostEqual(out[0], 0.5, places=6)
        self.assertAlmostEqual(out[1], 0.5, places=6)

    def test_fast_movement_is_almost_instant(self) -> None:
        smoother = CursorSmoother(smoothing=0.6, speed_gain=8.0)
        smoother.smooth((0.1, 0.1))
        out = smoother.smooth((0.9, 0.9))  # huge speed -> alpha -> 1.0
        self.assertAlmostEqual(out[0], 0.9, places=2)
        self.assertAlmostEqual(out[1], 0.9, places=2)

    def test_reset_forgets_history(self) -> None:
        smoother = CursorSmoother()
        smoother.smooth((0.1, 0.1))
        smoother.reset()
        self.assertIsNone(smoother.smoothed)
        self.assertEqual(smoother.smooth((0.9, 0.9)), (0.9, 0.9))


class FPSMeterTest(unittest.TestCase):
    def test_first_tick_returns_zero_fps(self) -> None:
        meter = FPSMeter()
        self.assertEqual(meter.tick(now=0.0), 0.0)

    def test_second_tick_measures_interval(self) -> None:
        meter = FPSMeter()
        meter.tick(now=0.0)
        fps = meter.tick(now=0.1)
        self.assertAlmostEqual(fps, 10.0, places=3)

    def test_property_matches_last_tick(self) -> None:
        meter = FPSMeter()
        meter.tick(now=0.0)
        meter.tick(now=0.1)
        self.assertAlmostEqual(meter.fps, meter.tick(now=0.2), places=3)


class FramePacerTest(unittest.TestCase):
    def test_wait_does_not_block_when_past_interval(self) -> None:
        pacer = FramePacer(fps_target=30)
        import time

        start = time.monotonic()
        pacer.wait(frame_started=time.monotonic() - 0.2)  # already over budget
        self.assertLess(time.monotonic() - start, 0.05)


if __name__ == "__main__":
    unittest.main()
