"""Persistence: canvas serialization, autosave and session recovery.

Public API::

    from storage import AutosaveManager, canvas_from_dict, canvas_to_dict
"""

from storage.autosave import AutosaveManager
from storage.serializer import (
    CANVAS_FORMAT_VERSION,
    canvas_from_dict,
    canvas_to_dict,
)

__all__ = [
    "CANVAS_FORMAT_VERSION",
    "AutosaveManager",
    "canvas_from_dict",
    "canvas_to_dict",
]
