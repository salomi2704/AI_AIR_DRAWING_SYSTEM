"""Hand landmark tracking and gesture classification.

Public API::

    from tracking import HandTracker, GestureClassifier, Gesture, Hand
"""

from tracking.hand_tracker import (
    FINGER_TIP_PIP,
    THUMB_IP,
    THUMB_TIP,
    WRIST,
    Hand,
    HandTracker,
    Landmark,
    ensure_model_downloaded,
)
from tracking.gestures import Gesture, GestureClassifier, GestureState

__all__ = [
    "FINGER_TIP_PIP",
    "THUMB_IP",
    "THUMB_TIP",
    "WRIST",
    "Hand",
    "HandTracker",
    "Landmark",
    "ensure_model_downloaded",
    "Gesture",
    "GestureClassifier",
    "GestureState",
]
