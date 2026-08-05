"""On-screen HUD rendering for the gesture-controlled toolbar.

Draws the toolbar strip, the fingertip cursor and small status badges on top
of the OpenCV video frame.  Pure drawing: it never reads from the camera or
mutates application state beyond the hover/press flags it paints.
"""

from __future__ import annotations

from typing import Optional

import numpy as np

import config
from tracking.gestures import Gesture
from ui.toolbar import Button, Toolbar

try:
    import cv2
except ImportError as exc:  # pragma: no cover - depends on environment
    raise ImportError("The UI module needs 'opencv-python' installed.") from exc

FONT = cv2.FONT_HERSHEY_SIMPLEX
_GESTURE_LABELS = {
    Gesture.PINCH: "DRAW",
    Gesture.FIST: "ERASE",
    Gesture.OPEN_PALM: "HOVER",
    Gesture.NONE: "",
}


class UIRenderer:
    """Renders the toolbar + cursor + status text onto a frame."""

    def __init__(self, toolbar: Toolbar) -> None:
        self.toolbar = toolbar
        self._status_text: str = ""
        self._status_until: float = 0.0
        self._tap_until: float = 0.0

    def draw_toolbar(self, frame: np.ndarray) -> np.ndarray:
        """Draw the full toolbar strip on ``frame`` in place and return it."""
        height = self.toolbar.height
        cv2.rectangle(frame, (0, 0), (frame.shape[1], height), (40, 40, 40), -1)
        cv2.line(frame, (0, height), (frame.shape[1], height), (90, 90, 90), 2)
        for button in self.toolbar.buttons:
            self._draw_button(frame, button)
        return frame

    def _draw_button(self, frame: np.ndarray, button: Button) -> None:
        x, y, w, h = button.rect
        if button.kind == "color" and button.color_hex is not None:
            self._draw_color_swatch(frame, button)
            return
        if button.kind == "brush" and button.brush_size is not None:
            self._draw_brush_dot(frame, button)
            return
        self._draw_action_button(frame, button)

    def _draw_color_swatch(self, frame: np.ndarray, button: Button) -> None:
        x, y, w, h = button.rect
        bgr = config.hex_to_bgr(button.color_hex)
        fill = button.color_hex if button.color_hex != "#000000" else "#1a1a1a"
        cv2.rectangle(frame, (x, y), (x + w, y + h), config.hex_to_bgr(fill), -1)
        if button.color_hex == self.toolbar.active_color:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 255, 255), 3)
        border = (120, 255, 120) if button.hovered else (60, 60, 60)
        cv2.rectangle(frame, (x, y), (x + w, y + h), border, 2)

    def _draw_brush_dot(self, frame: np.ndarray, button: Button) -> None:
        x, y, w, h = button.rect
        cx, cy = button.center
        active = button.brush_size == self.toolbar.active_brush
        fill = (140, 220, 255) if active else (70, 70, 70)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (45, 45, 45), -1)
        cv2.circle(frame, (cx, cy), max(3, button.brush_size // 2), fill, -1)
        border = (120, 255, 120) if button.hovered else (90, 90, 90)
        cv2.rectangle(frame, (x, y), (x + w, y + h), border, 2)

    def _draw_action_button(self, frame: np.ndarray, button: Button) -> None:
        x, y, w, h = button.rect
        fill = (150, 150, 60) if button.hovered else (70, 70, 70)
        if button.id in ("export", "recognize"):
            fill = (110, 110, 200) if button.hovered else (60, 60, 110)
        cv2.rectangle(frame, (x, y), (x + w, y + h), fill, -1)
        cv2.rectangle(frame, (x, y), (x + w, y + h), (160, 160, 160), 2)
        (tw, th), _ = cv2.getTextSize(
            button.label, FONT, 0.55, 1
        )
        tx = x + (w - tw) // 2
        ty = y + (h + th) // 2
        cv2.putText(frame, button.label, (tx, ty), FONT, 0.55, (255, 255, 255), 1)

    # ------------------------------------------------------------------
    # Cursor / status
    # ------------------------------------------------------------------
    def draw_cursor(
        self,
        frame: np.ndarray,
        position: tuple[int, int],
        gesture: Gesture,
    ) -> np.ndarray:
        """Draw the fingertip cursor; colour encodes the current mode."""
        if gesture == Gesture.PINCH:
            color = config.hex_to_bgr(self.toolbar.active_color)
            radius = max(4, self.toolbar.active_brush // 2)
            thickness = -1
        elif gesture == Gesture.FIST:
            color = (0, 0, 255)  # red = erasing
            radius = 16
            thickness = 3
        elif gesture == Gesture.OPEN_PALM:
            color = (255, 200, 0)  # orange = hovering UI
            radius = 8
            thickness = 2
        else:
            color = (200, 200, 200)
            radius = 6
            thickness = 2
        cv2.circle(frame, position, radius, color, thickness)
        if gesture in _GESTURE_LABELS:
            label = _GESTURE_LABELS[gesture]
            cv2.putText(
                frame,
                label,
                (position[0] - 20, position[1] - radius - 8),
                FONT,
                0.5,
                color,
                1,
            )
        return frame

    def draw_status(self, frame: np.ndarray, text: str) -> np.ndarray:
        """Overlay a status banner (e.g. \"Exported to ...\")."""
        if not text:
            return frame
        label = text if len(text) <= 64 else text[:61] + "..."
        (tw, th), _ = cv2.getTextSize(label, FONT, 0.7, 2)
        x0 = (frame.shape[1] - tw) // 2
        y0 = frame.shape[0] - 50
        cv2.rectangle(
            frame, (x0 - 12, y0 - th - 10), (x0 + tw + 12, y0 + 10), (20, 20, 20), -1
        )
        cv2.putText(frame, label, (x0, y0), FONT, 0.7, (255, 255, 255), 2)
        return frame
