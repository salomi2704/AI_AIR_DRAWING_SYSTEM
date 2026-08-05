"""Test doubles for the gesture interpreter's DrawSurface / UiSurface.

The real ``VirtualCanvas`` and ``Toolbar`` satisfy these structurally; the
fakes let the interaction model be tested with zero OpenCV/MediaPipe.
"""

from __future__ import annotations

from typing import Optional


class FakeButton:
    def __init__(self, button_id: str, kind: str, **attrs) -> None:
        self.id = button_id
        self.kind = kind
        self.label = attrs.pop("label", button_id)
        for key, value in attrs.items():
            setattr(self, key, value)


class FakeCanvas:
    """Records interpreter commands instead of rendering anything."""

    def __init__(self) -> None:
        self.active = False
        self.erased_points: list[tuple[int, int]] = []
        self.erases = 0

    def map_normalized(self, nx: float, ny: float):
        return (int(nx * 100), int(ny * 100))

    def begin_stroke(self, point, color_hex="", thickness=0):
        self.active = True
        self.stroke_start = point
        self.stroke_color = color_hex
        self.stroke_thickness = thickness

    def extend_stroke(self, point) -> None:
        if self.active:
            self.last_extend = point

    def end_stroke(self) -> Optional[object]:
        self.active = False
        self.ended = True
        return object()

    def erase_at(self, point, radius=None) -> int:
        self.erases += 1
        self.erased_points.append(point)
        return 3


class FakeUI:
    def __init__(self, buttons: Optional[list[FakeButton]] = None) -> None:
        self.active_color = "#000000"
        self.active_brush = 10
        self.buttons = buttons or []
        self.hovered_button = None
        self.hovers = 0

    def hit_test(self, x: int, y: int) -> Optional[FakeButton]:
        return self.hovered_button

    def set_hover(self, x: int, y: int) -> Optional[FakeButton]:
        self.hovers += 1
        return self.hovered_button

    def clear_hover(self) -> None:
        self.hovered_button = None


def make_ui(button: Optional[FakeButton] = None) -> FakeUI:
    ui = FakeUI()
    if button is not None:
        ui.hovered_button = button
    return ui
