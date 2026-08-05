"""Autosave and session recovery.

:class:`AutosaveManager` periodically writes the canvas to a single JSON file
(atomically, via a temp file + rename, so a crash mid-write never corrupts a
previous save).  The last session can be restored on startup with
:meth:`AutosaveManager.load`.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Optional

import config
from canvas.virtual_canvas import VirtualCanvas
from storage.serializer import canvas_from_dict, canvas_to_dict


class AutosaveManager:
    """Owns the autosave file for one canvas and triggers timed saves."""

    def __init__(
        self,
        canvas: VirtualCanvas,
        path: Optional[Path | str] = None,
        interval: Optional[float] = None,
    ) -> None:
        self.canvas = canvas
        self.path = Path(path) if path is not None else config.AUTOSAVE_PATH
        self.interval = (
            interval if interval is not None else config.AUTOSAVE_INTERVAL
        )
        self._last_save = time.monotonic()

    # ------------------------------------------------------------------
    # Saving
    # ------------------------------------------------------------------
    def maybe_save(self) -> Optional[Path]:
        """Save now if ``interval`` seconds have passed since the last save."""
        now = time.monotonic()
        if now - self._last_save >= self.interval:
            self._last_save = now
            return self.save()
        return None

    def save(self) -> Path:
        """Write the current canvas state to the autosave file (atomic)."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps(canvas_to_dict(self.canvas))
        tmp = self.path.with_name(self.path.name + ".tmp")
        tmp.write_text(payload, encoding="utf-8")
        os.replace(tmp, self.path)
        return self.path

    # ------------------------------------------------------------------
    # Recovery
    # ------------------------------------------------------------------
    @classmethod
    def load(
        cls, path: Optional[Path | str] = None
    ) -> Optional[VirtualCanvas]:
        """Return the last autosaved canvas, or None when nothing was saved.

        A corrupt or version-mismatched file raises ``ValueError`` so the
        caller can decide how to surface it.
        """
        path = Path(path) if path is not None else config.AUTOSAVE_PATH
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return canvas_from_dict(data)

    @classmethod
    def clear(cls, path: Optional[Path | str] = None) -> None:
        """Delete the autosave file (used after a successful recovery)."""
        path = Path(path) if path is not None else config.AUTOSAVE_PATH
        if path.exists():
            path.unlink()
