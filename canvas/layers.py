"""Layer container for the virtual canvas."""

from __future__ import annotations

from dataclasses import dataclass, field

from canvas.strokes import Stroke


@dataclass
class Layer:
    """An ordered, optionally transparent collection of strokes."""

    id: int
    name: str
    visible: bool = True
    opacity: float = 1.0
    strokes: list[Stroke] = field(default_factory=list)

    @property
    def stroke_count(self) -> int:
        return len(self.strokes)

    @property
    def point_count(self) -> int:
        return sum(len(s.points) for s in self.strokes)
