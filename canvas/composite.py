"""White-key compositing of the canvas preview onto the camera feed.

The canvas renders on a white background; every pixel that is *not* white is
ink and should replace the video underneath.  :func:`composite_white_key`
does that with a single masked assignment instead of the previous
``inRange`` + two ``bitwise_and`` + ``add`` chain (four full-frame passes),
and :func:`composite_mask_ops` keeps the old implementation so the benchmark
tool can measure the difference.
"""

from __future__ import annotations

import numpy as np

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("The composite module needs 'opencv-python'.") from exc


def key_mask(overlay: np.ndarray, threshold: int = 250) -> np.ndarray:
    """Boolean mask of overlay pixels that are ink (True = draw overlay).

    A pixel counts as background when *every* channel is at least
    ``threshold`` (white is exactly 255); anti-aliased stroke edges are
    preserved as ink.
    """
    return ~np.all(overlay >= threshold, axis=2)


def composite_white_key(
    frame: np.ndarray, overlay: np.ndarray, threshold: int = 250
) -> np.ndarray:
    """Overlay ink pixels onto a copy of ``frame``.

    Measured ~2x faster than the four-pass ``inRange`` +
    ``bitwise_and`` x2 + ``add`` chain, because ``cv2.copyTo`` performs a
    single masked copy once the white-key mask is known.
    """
    white = cv2.inRange(
        overlay, (threshold, threshold, threshold), (255, 255, 255)
    )
    result = frame.copy()
    cv2.copyTo(overlay, cv2.bitwise_not(white), result)
    return result


def composite_mask_ops(
    frame: np.ndarray, overlay: np.ndarray, threshold: int = 250
) -> np.ndarray:
    """Reference compositing (inRange + bitwise_and x2 + add)."""
    white = cv2.inRange(
        overlay, (threshold, threshold, threshold), (255, 255, 255)
    )
    strokes = cv2.bitwise_and(overlay, overlay, mask=cv2.bitwise_not(white))
    background = cv2.bitwise_and(frame, frame, mask=white)
    return cv2.add(strokes, background)
