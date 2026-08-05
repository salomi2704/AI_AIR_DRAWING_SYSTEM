"""Application core: the pure, hardware-independent layer.

``core/`` holds the application's *intelligence* — gesture state machine,
cursor smoothing, frame pacing, interaction-mode resolution and toolbar action
dispatch — with no dependency on OpenCV or MediaPipe.  It talks to the rest of
the system through small ``Protocol`` interfaces, which makes every piece
unit-testable without a camera and keeps the loop in ``app.py`` thin.

Public API::

    from core import (
        CursorSmoother,
        FPSMeter,
        FramePacer,
        GestureInterpreter,
        SceneUpdate,
        apply_toolbar_action,
        resolve_mode,
    )
"""

from __future__ import annotations

from core.actions import apply_toolbar_action
from core.clock import FPSMeter, FramePacer
from core.cursor import CursorSmoother
from core.gesture_interpreter import (
    DrawSurface,
    GestureInterpreter,
    SceneUpdate,
    UiSurface,
)
from core.modes import resolve_mode

__all__ = [
    "apply_toolbar_action",
    "FPSMeter",
    "FramePacer",
    "CursorSmoother",
    "GestureInterpreter",
    "SceneUpdate",
    "DrawSurface",
    "UiSurface",
    "resolve_mode",
]
