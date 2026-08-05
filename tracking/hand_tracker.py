"""Real-time hand landmark detection built on the MediaPipe Tasks API.

This module is deliberately independent from the rest of the system: it only
knows about MediaPipe, NumPy/OpenCV for drawing and :mod:`config`.  The
:class:`Hand` dataclass is the single data contract the rest of the app
consumes (see :mod:`tracking.gestures`).
"""

from __future__ import annotations

import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

import config

try:
    import cv2
    import mediapipe as mp
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError(
        "The tracking module needs 'opencv-python' and 'mediapipe' installed."
    ) from exc

# Named landmark indices (MediaPipe hand topology, 21 points).
WRIST: int = 0
THUMB_CMC: int = 1
THUMB_MCP: int = 2
THUMB_IP: int = 3
THUMB_TIP: int = 4
INDEX_MCP: int = 5
INDEX_PIP: int = 6
INDEX_DIP: int = 7
INDEX_TIP: int = 8
MIDDLE_MCP: int = 9
MIDDLE_PIP: int = 10
MIDDLE_DIP: int = 11
MIDDLE_TIP: int = 12
RING_MCP: int = 13
RING_PIP: int = 14
RING_DIP: int = 15
RING_TIP: int = 16
PINKY_MCP: int = 17
PINKY_PIP: int = 18
PINKY_DIP: int = 19
PINKY_TIP: int = 20

# (tip, pip) pairs for the four fingers, used for extension checks.
FINGER_TIP_PIP: tuple[tuple[int, int], ...] = (
    (INDEX_TIP, INDEX_PIP),
    (MIDDLE_TIP, MIDDLE_PIP),
    (RING_TIP, RING_PIP),
    (PINKY_TIP, PINKY_PIP),
)


@dataclass(frozen=True)
class Landmark:
    """A single normalised hand landmark.

    ``x`` and ``y`` are relative to the frame (0..1), ``z`` is relative to the
    wrist depth.  ``visibility``/``presence`` are MediaPipe confidence values.
    """

    x: float
    y: float
    z: float = 0.0
    visibility: float = 1.0
    presence: float = 1.0

    @classmethod
    def from_mp(cls, landmark: object) -> "Landmark":
        """Build a :class:`Landmark` from a MediaPipe NormalizedLandmark.

        MediaPipe 1.0 leaves ``visibility``/``presence`` as ``None`` for the
        hand landmarker, so they default to 1.0 here.
        """
        visibility = getattr(landmark, "visibility", None)
        presence = getattr(landmark, "presence", None)
        return cls(
            x=float(landmark.x),
            y=float(landmark.y),
            z=float(landmark.z),
            visibility=1.0 if visibility is None else float(visibility),
            presence=1.0 if presence is None else float(presence),
        )


@dataclass
class Hand:
    """A detected hand with its 21 landmarks (index 0 = wrist, 4/8/12/16/20 tips)."""

    landmarks: list[Landmark]
    handedness: str = "Unknown"
    score: float = 0.0

    def landmark(self, index: int) -> Landmark:
        """Return the landmark at ``index`` (0..20)."""
        return self.landmarks[index]

    @property
    def thumb_tip(self) -> Landmark:
        return self.landmarks[THUMB_TIP]

    @property
    def index_tip(self) -> Landmark:
        return self.landmarks[INDEX_TIP]

    @property
    def middle_mcp(self) -> Landmark:
        return self.landmarks[MIDDLE_MCP]


def ensure_model_downloaded(
    model_path: Optional[Path | str] = None,
    url: Optional[str] = None,
) -> Path:
    """Make sure the MediaPipe ``hand_landmarker.task`` model exists locally.

    The model is ~7.8 MB and is fetched once from Google's public bucket if it
    is missing.  Returns the path to the model file.
    """
    path = Path(model_path) if model_path else config.HAND_LANDMARKER_MODEL_PATH
    if path.exists():
        return path
    source = url or config.HAND_LANDMARKER_MODEL_URL
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"[tracking] Downloading hand landmarker model -> {path}")
    urllib.request.urlretrieve(source, str(path))
    return path


class HandTracker:
    """High-level wrapper around MediaPipe's ``HandLandmarker``.

    Usage::

        tracker = HandTracker()
        hands = tracker.process(frame_bgr)
        annotated = tracker.draw_landmarks(frame_bgr, hands)

    Runs in ``RunningMode.VIDEO`` so MediaPipe tracks the hand between frames
    instead of re-detecting it every frame; the first frame of a hand in view
    pays the full detection cost, later frames only run landmark inference.
    ``process`` returns an empty list when no hands are in view.
    """

    def __init__(
        self,
        model_path: Optional[Path | str] = None,
        num_hands: int = config.NUM_HANDS,
        min_detection_confidence: float = config.MIN_DETECTION_CONFIDENCE,
        min_tracking_confidence: float = config.MIN_TRACKING_CONFIDENCE,
        min_presence_confidence: float = config.MIN_PRESENCE_CONFIDENCE,
    ) -> None:
        model = ensure_model_downloaded(model_path)
        options = mp.tasks.vision.HandLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=str(model)),
            running_mode=mp.tasks.vision.RunningMode.VIDEO,
            num_hands=num_hands,
            min_hand_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            min_hand_presence_confidence=min_presence_confidence,
        )
        self._landmarker = mp.tasks.vision.HandLandmarker.create_from_options(options)
        self._timestamp_ms = 0

    def _next_timestamp_ms(self) -> int:
        """Strictly increasing timestamp required by the VIDEO running mode."""
        self._timestamp_ms = max(
            self._timestamp_ms + 1, int(time.monotonic() * 1000)
        )
        return self._timestamp_ms

    def process(self, frame_bgr: np.ndarray) -> list[Hand]:
        """Detect all hands in a BGR frame and return :class:`Hand` objects."""
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        result = self._landmarker.detect_for_video(image, self._next_timestamp_ms())

        hands: list[Hand] = []
        for landmarks, handedness in zip(result.hand_landmarks, result.handedness):
            lm_list = [Landmark.from_mp(lm) for lm in landmarks]
            category = handedness[0] if handedness else None
            hands.append(
                Hand(
                    landmarks=lm_list,
                    handedness=category.category_name if category else "Unknown",
                    score=float(category.score) if category else 0.0,
                )
            )
        return hands

    def draw_landmarks(self, frame: np.ndarray, hands: list[Hand]) -> np.ndarray:
        """Draw the detected hands (connections + joints) onto a BGR frame."""
        connections = mp.tasks.vision.HandLandmarksConnections.HAND_CONNECTIONS
        for hand in hands:
            pts = [
                (int(lm.x * frame.shape[1]), int(lm.y * frame.shape[0]))
                for lm in hand.landmarks
            ]
            for a, b in connections:
                cv2.line(frame, pts[a], pts[b], (0, 255, 0), 2)
            for point in pts:
                cv2.circle(frame, point, 3, (0, 200, 0), -1)
        return frame

    def close(self) -> None:
        """Release the underlying MediaPipe resources."""
        self._landmarker.close()

    def __enter__(self) -> "HandTracker":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()
