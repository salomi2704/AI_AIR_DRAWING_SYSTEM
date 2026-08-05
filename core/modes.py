"""Interaction-mode resolution for the visible hand poses.

Decides whether the user is drawing, erasing, hovering the UI or doing nothing
based on how many hands are visible and their gestures.  Moved out of the old
``app.py`` monolith so the two-hand rules are unit-testable in isolation.
"""

from __future__ import annotations

from typing import Optional

import config
from tracking.gesture_types import Gesture, GestureState

Mode = str  # "none" | "single" | "hover" | "erase"


def resolve_mode(
    states: list[GestureState],
    hand_index: Optional[int] = None,
) -> tuple[Mode, Optional[GestureState], Optional[GestureState]]:
    """Decide the interaction mode from the visible hand poses.

    Returns ``(mode, primary, eraser)`` where ``primary`` drives the cursor
    and ``eraser`` (erase mode only) drives the erase location.

    Modes:

    * ``"none"``   - no hand in view.
    * ``"erase"``  - two or more hands, every one a fist; the configured hand
      (``hand_index``, default ``config.ERASE_HAND_INDEX``) is the eraser.
    * ``"single"`` - exactly one hand in view; it may draw / tap / hover.
    * ``"hover"``  - more than one hand but not all fists; UI hover only, so
      a stray second hand can never cause a stroke or an accidental erase.
    """
    if not states:
        return "none", None, None
    if len(states) >= 2 and all(s.gesture == Gesture.FIST for s in states):
        index = hand_index if hand_index is not None else config.ERASE_HAND_INDEX
        eraser = states[index if index < len(states) else 1]
        return "erase", states[0], eraser
    if len(states) == 1:
        return "single", states[0], None
    return "hover", states[0], None
