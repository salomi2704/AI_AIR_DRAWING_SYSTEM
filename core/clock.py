"""Frame timing: FPS measurement and frame pacing.

Real-time loops need two pieces of timing discipline: measuring how fast they
are actually running (an instant ``1/dt`` bounces wildly between frames) and
pacing the loop so it does not peg the CPU at hundreds of FPS.  Both are
separated here so the loop in ``app.py`` stays declarative.
"""

from __future__ import annotations

import time
from typing import Optional

import config


class FPSMeter:
    """Exponentially smoothed frames-per-second measurement."""

    def __init__(self, alpha: float = 0.1) -> None:
        self._alpha = alpha
        self._last_tick: Optional[float] = None
        self._fps: float = 0.0

    def tick(self, now: Optional[float] = None) -> float:
        """Record one frame boundary; returns the current smoothed FPS."""
        now = now if now is not None else time.monotonic()
        if self._last_tick is not None:
            dt = now - self._last_tick
            if dt > 1e-6:
                instantaneous = 1.0 / dt
                if self._fps <= 0.0:
                    self._fps = instantaneous
                else:
                    self._fps = (
                        self._alpha * instantaneous + (1 - self._alpha) * self._fps
                    )
        self._last_tick = now
        return self._fps

    @property
    def fps(self) -> float:
        """The current smoothed FPS."""
        return self._fps


class FramePacer:
    """Sleeps at the end of each iteration to hit a target frame rate."""

    def __init__(self, fps_target: int = config.FPS_TARGET) -> None:
        self.interval = 1.0 / fps_target

    def wait(self, frame_started: float) -> None:
        """Sleep until the target interval after ``frame_started`` has elapsed."""
        elapsed = time.monotonic() - frame_started
        sleep = self.interval - elapsed
        if sleep > 0:
            time.sleep(sleep)
