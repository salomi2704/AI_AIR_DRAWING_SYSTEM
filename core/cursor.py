"""Velocity-adaptive cursor smoothing.

A plain exponential moving average (EMA) makes the fingertip cursor feel laggy
when the hand moves quickly (e.g. reaching for a toolbar button) because the
smoothed position trails behind the real one.  The alpha therefore grows with
fingertip speed so fast movements are tracked almost one-to-one while the hand
is still, giving both stability and responsiveness.
"""

from __future__ import annotations

import math
from typing import Optional

import config

Point = tuple[float, float]


class CursorSmoother:
    """EMA smoother whose responsiveness rises with pointer speed."""

    def __init__(
        self,
        smoothing: float = config.CURSOR_SMOOTHING,
        speed_gain: float = config.CURSOR_SPEED_GAIN,
    ) -> None:
        self.smoothing = smoothing
        self.speed_gain = speed_gain
        self._smoothed: Optional[Point] = None
        self._prev_raw: Optional[Point] = None

    def smooth(self, cursor: Point) -> Point:
        """Return the smoothed version of ``cursor`` (normalised coords)."""
        if self._smoothed is None:
            self._prev_raw = cursor
            self._smoothed = cursor
            return cursor
        prev = self._prev_raw if self._prev_raw is not None else cursor
        speed = math.dist(cursor, prev)
        alpha = min(1.0, self.smoothing + speed * self.speed_gain)
        self._prev_raw = cursor
        self._smoothed = (
            alpha * cursor[0] + (1 - alpha) * self._smoothed[0],
            alpha * cursor[1] + (1 - alpha) * self._smoothed[1],
        )
        return self._smoothed

    def reset(self) -> None:
        """Forget history (e.g. when the hand leaves view or mode changes)."""
        self._smoothed = None
        self._prev_raw = None

    @property
    def smoothed(self) -> Optional[Point]:
        """The last smoothed position, or None if nothing has been smoothed."""
        return self._smoothed
