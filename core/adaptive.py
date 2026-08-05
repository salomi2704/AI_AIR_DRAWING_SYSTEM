"""Adaptive preview resolution: trade render cost for frame rate.

MediaPipe tracking dominates the loop, but canvas rendering and compositing
still cost a few milliseconds per frame.  :class:`AdaptiveResolution` lowers
the preview resolution when FPS drops below the target and restores it when
there is headroom, with hysteresis so the scale does not oscillate.
"""

from __future__ import annotations

import config


class AdaptiveResolution:
    """Adjusts a ``scale`` factor (min..max) to keep FPS near the target."""

    def __init__(
        self,
        min_scale: float = config.ADAPTIVE_MIN_SCALE,
        max_scale: float = config.ADAPTIVE_MAX_SCALE,
        target_fps: int = config.FPS_TARGET,
        step: float = 0.05,
    ) -> None:
        self.min_scale = min_scale
        self.max_scale = max_scale
        self.target_fps = target_fps
        self.step = step
        self.scale = max_scale

    def update(self, fps: float) -> float:
        """Adjust and return the preview scale for the next frame.

        * ``fps`` well below target -> shrink the preview (cheaper frames);
        * ``fps`` comfortably above target -> grow it back to full size;
        * around the target -> leave it alone (hysteresis).
        """
        if fps <= 0.0:
            return self.scale
        if fps < self.target_fps * 0.8:
            self.scale = max(self.min_scale, self.scale - self.step)
        elif fps > self.target_fps * 1.05:
            self.scale = min(self.max_scale, self.scale + self.step)
        return self.scale
