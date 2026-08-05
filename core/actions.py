"""Toolbar action dispatch.

Extracted from ``app.py`` so the state-changing part of a toolbar tap (colour
/ brush selection, undo, redo, clear) is pure and testable.  Actions that need
I/O or recognition wiring (``export``, ``recognize``) are returned as
``None`` and handled by the application layer.
"""

from __future__ import annotations

from typing import Optional, Protocol


class CanvasActions(Protocol):
    """The subset of :class:`~canvas.VirtualCanvas` used by toolbar actions."""

    def undo(self) -> bool: ...
    def redo(self) -> bool: ...
    def clear_all(self) -> None: ...


class ToolbarState(Protocol):
    """The subset of :class:`~ui.Toolbar` used by toolbar actions."""

    active_color: str
    active_brush: int


def apply_toolbar_action(
    button: object,
    canvas: CanvasActions,
    toolbar: ToolbarState,
) -> Optional[str]:
    """Apply a toolbar button's state-changing action.

    Returns a short status message describing what happened, or ``None`` for
    actions the application must run itself (``export`` / ``recognize``).

    Colour and brush buttons update ``toolbar``'s active state; undo / redo /
    clear mutate ``canvas`` and return feedback.
    """
    kind = getattr(button, "kind", None)
    if kind == "color":
        toolbar.active_color = button.color_hex
        return f"Selected {button.label}"
    if kind == "brush":
        toolbar.active_brush = button.brush_size
        return f"Selected brush {button.brush_size}"

    button_id = getattr(button, "id", "")
    if button_id == "undo":
        return "Undo" if canvas.undo() else None
    if button_id == "redo":
        return "Redo" if canvas.redo() else None
    if button_id == "clear":
        canvas.clear_all()
        return "Canvas cleared"
    return None  # export / recognize are handled by the app
