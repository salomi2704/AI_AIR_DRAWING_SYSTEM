"""Convert recognised handwritten formulas to LaTeX.

The primary path is rule-based: unicode math characters (π, ∫, ∑, ×, ...) are
translated into their LaTeX commands and the result is wrapped in math mode.
When ``pix2tex`` is installed it can additionally be used to transcribe a
rendered formula image directly (see :meth:`LatexConverter.from_image`).
"""

from __future__ import annotations

import re
from typing import Optional

_SYMBOL_TABLE = {
    "\u00d7": r"\times",  # ×
    "\u00f7": r"\div",  # ÷
    "\u03c0": r"\pi",  # π
    "\u03b1": r"\alpha",  # α
    "\u03b2": r"\beta",  # β
    "\u03b8": r"\theta",  # θ
    "\u221a": r"\sqrt",  # √
    "\u222b": r"\int",  # ∫
    "\u2211": r"\sum",  # ∑
    "\u2265": r"\geq",  # ≥
    "\u2264": r"\leq",  # ≤
    "\u2260": r"\neq",  # ≠
    "\u00b1": r"\pm",  # ±
    "\u221e": r"\infty",  # ∞
    "\u2192": r"\to",  # →
    "\u2190": r"\gets",  # ←
    "\u2219": r"\cdot",  # ∙
    "*": r"\cdot",
}

_SUPERSCRIPT = re.compile(r"\^([0-9]+)")
_SUBSCRIPT = re.compile(r"_([0-9]+)")


class LatexConverter:
    """Translates a plain-text formula into a LaTeX math expression."""

    @staticmethod
    def is_pix2tex_available() -> bool:
        """True when the optional ``pix2tex`` package is importable."""
        try:
            __import__("pix2tex")
            return True
        except ImportError:
            return False

    def to_latex(self, formula: str) -> str:
        """Convert a plain-text formula string to ``$...$`` LaTeX."""
        text = formula.strip()
        for symbol, latex in _SYMBOL_TABLE.items():
            text = text.replace(symbol, latex)
        text = _SUPERSCRIPT.sub(r"^{\1}", text)
        text = _SUBSCRIPT.sub(r"_{\1}", text)
        return f"${text}$"

    def from_image(self, image_path: str) -> Optional[str]:
        """Transcribe a formula image using pix2tex (if installed).

        Raises RuntimeError when pix2tex is unavailable.
        """
        if not self.is_pix2tex_available():
            raise RuntimeError(
                "pix2tex is not installed; install it to transcribe formula "
                "images directly."
            )
        from pix2tex.cli import LatexOCR  # imported lazily (heavy)

        model = LatexOCR()
        latex = model(image_path)
        return latex.strip() if latex else None
