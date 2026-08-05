"""Deterministic, network-free provider.

This is the default backend: it summarises a recognized diagram with simple
rules, so the assistant feature works out of the box with no API key.  It
also serves as the automatic fallback whenever a remote provider fails.
"""

from __future__ import annotations


class RuleProvider:
    name = "offline"

    def available(self) -> bool:
        return True

    def summarize(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 1024,
    ) -> str:
        """Interface-compatible no-op; use :meth:`summarize_diagram` instead."""
        return ""

    @staticmethod
    def summarize_diagram(text_regions, shapes, latex: list[str]) -> str:
        """Build a human-readable summary from recognition output.

        ``text_regions`` items need a ``.text`` attribute, ``shapes`` items a
        ``.kind`` attribute.
        """
        if not shapes and not text_regions and not latex:
            return "The canvas is blank: no shapes, text or formulas were recognized."

        parts: list[str] = []
        if shapes:
            counts: dict[str, int] = {}
            for shape in shapes:
                kind = shape.kind or "unknown"
                counts[kind] = counts.get(kind, 0) + 1
            labels = [
                f"{count} {name}{'s' if count != 1 else ''}"
                for name, count in sorted(counts.items())
            ]
            parts.append("Shapes: " + ", ".join(labels) + ".")
        if text_regions:
            texts = [region.text for region in text_regions]
            parts.append("Text: " + "; ".join(texts) + ".")
        if latex:
            parts.append("Formulas: " + "; ".join(latex) + ".")
        return " ".join(parts)
