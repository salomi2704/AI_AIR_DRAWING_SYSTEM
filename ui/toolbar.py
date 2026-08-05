"""Gesture-controlled on-screen toolbar.

The toolbar is a horizontal strip of buttons (colour swatches, brush sizes and
action buttons) laid out in camera-frame pixel coordinates.  It is entirely
gesture driven:

* the app feeds the normalised cursor position via :meth:`set_hover`,
* a quick pinch tap is reported through :meth:`click`,
* active colour / brush state lives here so the canvas and the HUD agree.

Rendering is intentionally separate (see :mod:`ui.renderer`) so this module
stays pure layout + state and can be unit-tested without a display.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import config

Rect = tuple[int, int, int, int]  # (x, y, width, height)


@dataclass
class Button:
    """A single toolbar button (colour swatch, brush dot or text action)."""

    id: str
    label: str
    kind: str  # "color" | "brush" | "action"
    rect: Rect
    color_hex: Optional[str] = None
    brush_size: Optional[int] = None
    hovered: bool = False
    pressed: bool = False

    @property
    def center(self) -> tuple[int, int]:
        x, y, w, h = self.rect
        return x + w // 2, y + h // 2

    def contains(self, x: int, y: int) -> bool:
        bx, by, bw, bh = self.rect
        return bx <= x < bx + bw and by <= y < by + bh


class Toolbar:
    """Builds the button layout and handles hit-testing / active state."""

    def __init__(
        self,
        frame_width: int,
        frame_height: int,
        height: int = config.TOOLBAR_HEIGHT,
        colors: Optional[list[tuple[str, str]]] = None,
        brush_sizes: Optional[list[int]] = None,
    ) -> None:
        self.frame_width = frame_width
        self.frame_height = frame_height
        self.height = height
        self.colors: list[tuple[str, str]] = colors or config.COLOR_PALETTE
        self.brush_sizes: list[int] = brush_sizes or config.BRUSH_SIZES
        self.active_color: str = config.DEFAULT_COLOR
        self.active_brush: int = config.BRUSH_SIZES[config.DEFAULT_INDEX_BRUSH]
        self.buttons: list[Button] = []
        self.hovered: Optional[Button] = None
        self._build()

    # ------------------------------------------------------------------
    # Layout
    # ------------------------------------------------------------------
    def _build(self) -> None:
        """Place colour swatches, brush dots and action buttons in a strip."""
        buttons: list[Button] = []
        x = 12
        y = (self.height - 48) // 2
        for name, hex_color in self.colors:
            buttons.append(
                Button(
                    id=f"color:{hex_color}",
                    label=name,
                    kind="color",
                    color_hex=hex_color,
                    rect=(x, y, 48, 48),
                )
            )
            x += 58
        x += 10
        for size in self.brush_sizes:
            buttons.append(
                Button(
                    id=f"brush:{size}",
                    label=str(size),
                    kind="brush",
                    brush_size=size,
                    rect=(x, y, 48, 48),
                )
            )
            x += 58
        x += 10
        for action_id, label in (
            ("undo", "Undo"),
            ("redo", "Redo"),
            ("clear", "Clear"),
            ("export", "Export"),
            ("recognize", "Recognize"),
        ):
            width = 96
            buttons.append(
                Button(
                    id=action_id,
                    label=label,
                    kind="action",
                    rect=(x, y, width, 48),
                )
            )
            x += width + 10
        self.buttons = buttons

    # ------------------------------------------------------------------
    # Interaction
    # ------------------------------------------------------------------
    def hit_test(self, x: int, y: int) -> Optional[Button]:
        """Return the button under ``(x, y)`` (canvas px), or None."""
        if y >= self.height:
            return None
        for button in self.buttons:
            if button.contains(x, y):
                return button
        return None

    def set_hover(self, x: int, y: int) -> Optional[Button]:
        """Mark the button under the cursor as hovered; return it."""
        for button in self.buttons:
            button.hovered = False
        self.hovered = self.hit_test(x, y)
        if self.hovered is not None:
            self.hovered.hovered = True
        return self.hovered

    def clear_hover(self) -> None:
        """Clear the hover highlight (e.g. when the hand leaves view)."""
        for button in self.buttons:
            button.hovered = False
        self.hovered = None

    def click(self, x: int, y: int) -> Optional[Button]:
        """Simulate a press on the button at ``(x, y)``; return it.

        Selecting a colour or brush updates the toolbar's active state.
        """
        button = self.hit_test(x, y)
        if button is None:
            return None
        if button.kind == "color" and button.color_hex is not None:
            self.active_color = button.color_hex
        elif button.kind == "brush" and button.brush_size is not None:
            self.active_brush = button.brush_size
        return button

    def has_button(self, button_id: str) -> bool:
        """True if a button with ``button_id`` exists (used by the app loop)."""
        return any(b.id == button_id for b in self.buttons)

    def button(self, button_id: str) -> Optional[Button]:
        """Look up a button by id."""
        for b in self.buttons:
            if b.id == button_id:
                return b
        return None
