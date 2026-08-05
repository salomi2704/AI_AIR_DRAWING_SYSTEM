"""Gesture classification from hand landmarks.

Maps the raw 21-landmark representation into a small, high-level vocabulary
the rest of the application understands:

* **PINCH**      -> draw mode (thumb + index tip touching)
* **FIST**       -> erase mode (all four fingers curled)
* **OPEN_PALM**  -> hover / UI mode (all fingers extended)
* **NONE**       -> any other intermediate pose

Pinches that exist for only a few frames are later interpreted as *taps* by
the UI layer, so a pinch can both draw and click the toolbar.
"""

from __future__ import annotations

import config
from tracking.gesture_types import Gesture, GestureState
from tracking.hand_tracker import (
    FINGER_TIP_PIP,
    THUMB_IP,
    THUMB_TIP,
    WRIST,
    Hand,
    Landmark,
)


def _distance(a: Landmark, b: Landmark) -> float:
    """Euclidean distance between two normalised landmarks."""
    return ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5


class GestureClassifier:
    """Classifies a single :class:`Hand` into a :class:`GestureState`.

    All distances are normalised by the palm size so the thresholds work for
    hands near or far from the camera.

    Precedence: a fully curled hand is always a **FIST** (erase), then a close
    thumb/index gap is a **PINCH**, then a fully open hand is an **OPEN_PALM**.

    Pinch detection is *hysteretic*: the classifier latches onto a pinch below
    ``pinch_ratio`` and only lets it go once the thumb/index gap grows beyond
    ``pinch_exit_ratio``.  This stops the hand from flickering between hover
    and draw while the fingers hover right around the boundary.
    """

    def __init__(
        self,
        pinch_ratio: float = config.PINCH_RATIO,
        pinch_exit_ratio: float = config.PINCH_EXIT_RATIO,
        extension_factor: float = 1.05,
    ) -> None:
        self.pinch_ratio = pinch_ratio
        self.pinch_exit_ratio = pinch_exit_ratio
        self.extension_factor = extension_factor
        self._pinching = False

    def _finger_extended(self, hand: Hand, tip_idx: int, pip_idx: int) -> bool:
        """A finger is extended when its tip is clearly farther from the wrist
        than its PIP joint (rotation-invariant rule)."""
        wrist = hand.landmark(WRIST)
        tip = hand.landmark(tip_idx)
        pip = hand.landmark(pip_idx)
        return _distance(tip, wrist) > self.extension_factor * _distance(pip, wrist)

    def _thumb_extended(self, hand: Hand) -> bool:
        """Thumbs need a different reference: compare against the pinky MCP."""
        pinky_mcp = hand.landmark(17)
        tip = hand.landmark(THUMB_TIP)
        ip = hand.landmark(THUMB_IP)
        return _distance(tip, pinky_mcp) > self.extension_factor * _distance(ip, pinky_mcp)

    def classify(self, hand: Hand) -> GestureState:
        """Classify ``hand`` and return the corresponding :class:`GestureState`."""
        thumb_extended = self._thumb_extended(hand)
        fingers = tuple(
            self._finger_extended(hand, tip, pip) for tip, pip in FINGER_TIP_PIP
        )
        extended = (thumb_extended, *fingers)

        thumb_tip = hand.landmark(THUMB_TIP)
        index_tip = hand.landmark(8)
        palm_size = max(
            _distance(hand.landmark(WRIST), hand.middle_mcp), 1e-6
        )
        pinch_distance = _distance(thumb_tip, index_tip) / palm_size

        threshold = self.pinch_exit_ratio if self._pinching else self.pinch_ratio
        pinching = pinch_distance < threshold

        if not any(fingers):  # all four fingers curled => erase mode
            gesture = Gesture.FIST
            self._pinching = False
        elif pinching:
            gesture = Gesture.PINCH
            self._pinching = True
        elif all(extended):
            gesture = Gesture.OPEN_PALM
            self._pinching = False
        else:
            gesture = Gesture.NONE
            self._pinching = False

        return GestureState(
            gesture=gesture,
            cursor=(index_tip.x, index_tip.y),
            pinch_distance=pinch_distance,
            extended_fingers=extended,
        )
