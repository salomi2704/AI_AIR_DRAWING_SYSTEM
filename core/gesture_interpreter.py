"""The gesture interpreter: a small state machine translating hand poses into
canvas and UI commands.

This replaces the ad-hoc per-frame bookkeeping that used to live in
``app.py`` (``_pinch_frames``, ``_pinch_button``, ``_drawing``, ...).  It is a
stateful component: it keeps a pinch/draw/erase session across frames and
emits a :class:`SceneUpdate` every frame describing what to render and which
toolbar button (if any) the user tapped.

It never touches OpenCV or MediaPipe: it only depends on the ``GestureState``
contract from :mod:`tracking.gesture_types` and two small ``Protocol``
interfaces (:class:`DrawSurface` and :class:`UiSurface`) that the real
:class:`~canvas.VirtualCanvas` and :class:`~ui.Toolbar` satisfy structurally.
This makes the whole interaction model unit-testable with fakes.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional, Protocol, Tuple

import config
from core.cursor import CursorSmoother
from core.modes import resolve_mode
from tracking.gesture_types import Gesture, GestureState

Point = Tuple[int, int]


class DrawSurface(Protocol):
    """Everything the interpreter needs from the canvas."""

    def map_normalized(self, nx: float, ny: float) -> Point: ...
    def begin_stroke(
        self, point: Point, color_hex: str = ..., thickness: int = ...
    ) -> object: ...
    def extend_stroke(self, point: Point) -> None: ...
    def end_stroke(self) -> Optional[object]: ...
    def erase_at(self, point: Point, radius: Optional[float] = None) -> int: ...


class UiSurface(Protocol):
    """Everything the interpreter needs from the gesture-controlled UI."""

    active_color: str
    active_brush: int

    def hit_test(self, x: int, y: int) -> Optional[object]: ...
    def set_hover(self, x: int, y: int) -> Optional[object]: ...
    def clear_hover(self) -> None: ...


@dataclass(frozen=True)
class SceneUpdate:
    """What one processed frame tells the renderer and the app loop."""

    cursor: Optional[tuple[float, float]]  # normalised smoothed cursor or None
    gesture: Gesture  # pose to render at the cursor
    erase_radius: Optional[int] = None  # pixel radius of the erase ring
    tap_button: Optional[object] = None  # toolbar button the user released
    status: Optional[str] = None  # e.g. "Erased N points" feedback


class GestureInterpreter:
    """Owns the interaction session state and applies it to canvas + UI.

    Rules (identical to the pre-refactor behaviour):

    * a **single** hand may draw (pinch) and drive the toolbar;
    * a stray second hand never draws (it hovers the UI only);
    * erasing requires **two fists** at once; the configured hand drives the
      eraser;
    * a pinch that started over a toolbar button is a *tap* on release;
    * brief tracking losses (<= tolerance) do not end the current stroke.
    """

    def __init__(
        self,
        canvas: DrawSurface,
        ui: UiSurface,
        *,
        lost_frames_tolerance: int = 3,
        erase_interval: float = config.ERASE_INTERVAL,
        erase_radius: float = config.ERASE_RADIUS,
        smoother: Optional[CursorSmoother] = None,
        hand_index: Optional[int] = None,
        pinch_confirm_frames: int = config.PINCH_CONFIRM_FRAMES,
    ) -> None:
        self._canvas = canvas
        self._ui = ui
        self._lost_frames_tolerance = lost_frames_tolerance
        self._erase_interval = erase_interval
        self._erase_radius = erase_radius
        self._hand_index = hand_index
        self._pinch_confirm_frames = max(1, pinch_confirm_frames)
        self._smoother = smoother or CursorSmoother()

        self._pinch_frames = 0
        self._pinch_confirm = 0
        self._pinch_button: Optional[object] = None
        self._drawing = False
        self._erasing = False
        self._last_erase_at = 0.0
        self._lost_frames = 0
        self._last_cursor: Optional[tuple[float, float]] = None

    # ------------------------------------------------------------------
    # Per-frame entry point
    # ------------------------------------------------------------------
    def update(
        self,
        states: list[GestureState],
        frame_width: int,
        frame_height: int,
    ) -> SceneUpdate:
        """Advance the state machine for one frame of classified hands."""
        mode, primary, eraser = resolve_mode(states, hand_index=self._hand_index)

        if mode == "none":
            return self._on_no_hand(frame_width, frame_height)
        self._lost_frames = 0
        if mode == "erase":
            return self._on_erase(eraser, frame_width, frame_height)
        return self._on_active(primary, mode, frame_width, frame_height)

    # ------------------------------------------------------------------
    # Mode handlers
    # ------------------------------------------------------------------
    def _on_no_hand(self, width: int, height: int) -> SceneUpdate:
        """Tolerate brief tracking losses; hard-reset after ``tolerance``."""
        self._lost_frames += 1
        if self._lost_frames >= self._lost_frames_tolerance:
            self._reset()
            return SceneUpdate(cursor=None, gesture=Gesture.OPEN_PALM)
        gesture = Gesture.PINCH if self._pinch_frames > 0 else Gesture.OPEN_PALM
        return SceneUpdate(cursor=self._last_cursor, gesture=gesture)

    def _on_erase(
        self, eraser: GestureState, width: int, height: int
    ) -> SceneUpdate:
        """Two-fist erase: end any stroke and rub out points at the eraser."""
        self._end_active_stroke()
        self._pinch_frames = 0
        self._pinch_confirm = 0
        self._pinch_button = None
        self._ui.clear_hover()
        self._erasing = True
        self._smoother.reset()
        cursor = self._smoother.smooth(eraser.cursor)
        self._last_cursor = cursor

        point = self._canvas.map_normalized(*cursor)
        status: Optional[str] = None
        now = time.monotonic()
        if now - self._last_erase_at >= self._erase_interval:
            self._last_erase_at = now
            erased = self._canvas.erase_at(point)
            if erased:
                status = f"Erased {erased} points"

        radius = int(self._erase_radius * (width**2 + height**2) ** 0.5)
        return SceneUpdate(
            cursor=cursor, gesture=Gesture.FIST, erase_radius=radius, status=status
        )

    def _on_active(
        self,
        primary: GestureState,
        mode: str,
        width: int,
        height: int,
    ) -> SceneUpdate:
        """Single-hand or UI-hover mode: smooth the cursor, maybe draw/tap."""
        self._erasing = False
        cursor = self._smoother.smooth(primary.cursor)
        self._last_cursor = cursor

        point = self._canvas.map_normalized(*cursor)
        ui_point = (int(cursor[0] * width), int(cursor[1] * height))
        self._ui.set_hover(*ui_point)

        tap_button: Optional[object] = None
        if primary.gesture == Gesture.PINCH:
            # Debounce: a pinch must persist for a few frames before it can
            # draw or tap, so a one-frame flinch never leaves a dot or clicks.
            self._pinch_confirm += 1
            if self._pinch_confirm >= self._pinch_confirm_frames:
                # A single hand may draw; with a second hand visible a pinch is
                # only ever a toolbar tap, so no stroke is ever started.
                self._handle_pinch(point, ui_point, allow_draw=(mode == "single"))
        else:
            self._pinch_confirm = 0
            tap_button = self._handle_release()

        gesture = Gesture.PINCH if self._pinch_frames > 0 else Gesture.OPEN_PALM
        return SceneUpdate(cursor=cursor, gesture=gesture, tap_button=tap_button)

    # ------------------------------------------------------------------
    # Pinch / draw / tap transitions
    # ------------------------------------------------------------------
    def _handle_pinch(
        self, canvas_point: Point, ui_point: Point, allow_draw: bool
    ) -> None:
        """A pinch draws a stroke, or records a button for a tap on release."""
        self._pinch_frames += 1
        if self._pinch_frames == 1:
            self._pinch_button = self._ui.hit_test(*ui_point)
            if allow_draw and self._pinch_button is None:
                self._canvas.begin_stroke(
                    canvas_point,
                    color_hex=self._ui.active_color,
                    thickness=self._ui.active_brush,
                )
                self._drawing = True
        elif self._drawing:
            self._canvas.extend_stroke(canvas_point)

    def _handle_release(self) -> Optional[object]:
        """End the current stroke and report the tapped button (if any).

        A pinch that started on a toolbar button is a click whenever it is
        released (no timing trick needed), because it never draws anything.
        """
        was_pinch = self._pinch_frames > 0
        self._pinch_frames = 0
        self._erasing = False
        self._end_active_stroke()
        tap_button = self._pinch_button if was_pinch else None
        self._pinch_button = None
        return tap_button

    def _end_active_stroke(self) -> None:
        if self._drawing:
            self._canvas.end_stroke()
            self._drawing = False

    def _reset(self) -> None:
        """Reset all session state (hand left view / hard timeout)."""
        self._end_active_stroke()
        self._ui.clear_hover()
        self._pinch_frames = 0
        self._pinch_confirm = 0
        self._pinch_button = None
        self._erasing = False
        self._smoother.reset()
        self._last_cursor = None
