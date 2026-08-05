"""Pure gesture vocabulary shared across the whole system.

The :class:`Gesture` enum and :class:`GestureState` dataclass are the output
contract of :mod:`tracking.gestures` and the input contract of the gesture
state machine in :mod:`core.gesture_interpreter`.

This module deliberately imports nothing but the standard library so any layer
(e.g. ``core/``) can depend on it without pulling in OpenCV or MediaPipe.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Gesture(str, Enum):
    """The recognised high-level hand poses."""

    NONE = "none"
    PINCH = "pinch"
    FIST = "fist"
    OPEN_PALM = "open_palm"


@dataclass(frozen=True)
class GestureState:
    """The result of classifying one hand in one frame."""

    gesture: Gesture
    cursor: tuple[float, float]  # normalised (x, y) of the index fingertip
    pinch_distance: float = 0.0  # normalised thumb<->index gap
    extended_fingers: tuple[bool, bool, bool, bool, bool] = (False,) * 5
