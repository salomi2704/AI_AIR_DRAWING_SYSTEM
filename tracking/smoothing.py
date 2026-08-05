"""Temporal landmark smoothing with the One-Euro filter.

MediaPipe landmarks jitter frame to frame.  The classic fix is the
**One-Euro filter** (Casiez et al., CHI 2012): a low-pass filter whose cutoff
frequency adapts to pointer speed — slow movements are heavily smoothed
(removing jitter) while fast movements keep full bandwidth (removing lag).
It is a cheap, industry-standard building block for gesture systems.

:class:`LandmarkFilter` applies one One-Euro filter per axis (x, y, z) to every
landmark of a hand, returning a filtered :class:`~tracking.hand_tracker.Hand`.
It is duck-typed on purpose so it can be unit-tested without importing
OpenCV/MediaPipe.
"""

from __future__ import annotations

import math
from typing import Optional

import config


class LowPassFilter:
    """Single-pole IIR low-pass filter with a variable alpha."""

    def __init__(self, alpha: float) -> None:
        self._alpha = alpha
        self._value: Optional[float] = None

    def filter(self, value: float, alpha: Optional[float] = None) -> float:
        if alpha is not None:
            self._alpha = alpha
        if self._value is None:
            self._value = value
        else:
            self._value = self._alpha * value + (1.0 - self._alpha) * self._value
        return self._value

    def reset(self) -> None:
        self._value = None


class OneEuroFilter:
    """Adaptive low-pass filter whose cutoff rises with input speed."""

    def __init__(
        self,
        min_cutoff: float = config.SMOOTHING_MIN_CUTOFF,
        beta: float = config.SMOOTHING_BETA,
        d_cutoff: float = config.SMOOTHING_D_CUTOFF,
        rate: float = 30.0,
    ) -> None:
        self._min_cutoff = min_cutoff
        self._beta = beta
        self._d_cutoff = d_cutoff
        self._rate = rate
        self._x_filter = LowPassFilter(self._alpha(1.0))
        self._dx_filter = LowPassFilter(self._alpha(1.0))
        self._last_x: Optional[float] = None

    def _alpha(self, cutoff: float) -> float:
        tau = 1.0 / (2.0 * math.pi * max(cutoff, 1e-9))
        return 1.0 / (1.0 + tau * (1.0 / max(self._rate, 1e-9)))

    def __call__(self, x: float, rate: Optional[float] = None) -> float:
        if rate is not None:
            self._rate = rate
        if self._last_x is None:
            self._last_x = x
            return self._x_filter.filter(x, self._alpha(self._min_cutoff))
        dx = (x - self._last_x) * self._rate
        self._last_x = x
        edx = self._dx_filter.filter(dx, self._alpha(self._d_cutoff))
        cutoff = self._min_cutoff + self._beta * abs(edx)
        return self._x_filter.filter(x, self._alpha(cutoff))

    def reset(self) -> None:
        self._x_filter.reset()
        self._dx_filter.reset()
        self._last_x = None


class LandmarkFilter:
    """Filters all 21 landmarks of a hand with per-axis One-Euro filters."""

    def __init__(
        self,
        min_cutoff: float = config.SMOOTHING_MIN_CUTOFF,
        beta: float = config.SMOOTHING_BETA,
        d_cutoff: float = config.SMOOTHING_D_CUTOFF,
        rate: float = 30.0,
    ) -> None:
        self._min_cutoff = min_cutoff
        self._beta = beta
        self._d_cutoff = d_cutoff
        self._rate = rate
        self._filters: dict[int, tuple[OneEuroFilter, OneEuroFilter, OneEuroFilter]] = {}

    def filter_hand(self, hand: object, dt: Optional[float] = None) -> object:
        """Return a copy of ``hand`` with temporally smoothed landmarks.

        ``dt`` is the seconds since the previous frame (falls back to the
        configured rate when unknown).  Landmarks and hands are reconstructed
        through ``type()`` so this never imports the MediaPipe layer.
        """
        rate = 1.0 / dt if dt is not None and dt > 1e-9 else self._rate
        new_landmarks = []
        for index, landmark in enumerate(hand.landmarks):
            filters = self._filters.get(index)
            if filters is None:
                filters = tuple(
                    OneEuroFilter(
                        self._min_cutoff, self._beta, self._d_cutoff, rate
                    )
                    for _ in range(3)
                )
                self._filters[index] = filters
            fx, fy, fz = filters
            x = fx(landmark.x, rate=rate)
            y = fy(landmark.y, rate=rate)
            z = fz(landmark.z, rate=rate)
            new_landmarks.append(
                type(landmark)(
                    x=x,
                    y=y,
                    z=z,
                    visibility=getattr(landmark, "visibility", 1.0),
                    presence=getattr(landmark, "presence", 1.0),
                )
            )
        return type(hand)(
            landmarks=new_landmarks,
            handedness=getattr(hand, "handedness", "Unknown"),
            score=getattr(hand, "score", 0.0),
        )

    def reset(self) -> None:
        """Forget all history (e.g. when no hand is visible for a while)."""
        self._filters.clear()
