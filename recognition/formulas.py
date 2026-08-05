"""Formula detection for handwritten math.

Plain Tesseract is poor at math, so this module decides *whether* a block of
recognised text is likely a formula (vs. prose) using lightweight heuristics
on symbols and structure.  The actual formula-to-LaTeX conversion lives in
:mod:`ai_assist.latex`; an optional pix2tex backend is wired in there too.
"""

from __future__ import annotations

import re
from typing import Optional

# Symbols that almost always indicate a formula.
_MATH_SYMBOLS = re.compile(r"[+\-\u00d7\u00f7=√\u221a∫\u222b∑\u2211π^_\u2265\u2264\u00b1∞→]")

# A formula usually has operators around letters/digits, e.g. "x + 2".
_OPERATORS = re.compile(r"[+\-×÷=]")
_LETTER_OR_DIGIT = re.compile(r"[A-Za-z0-9]")


class FormulaDetector:
    """Heuristically decides whether recognised text is a formula."""

    def __init__(self, max_letters: int = 12) -> None:
        # Prose like "the cat" has letters but no operators; a formula like
        # "y = mx + b" has both.  A very long letter-run is prose.
        self.max_letters = max_letters

    def is_formula(self, text: str) -> bool:
        """Return True when ``text`` looks like a mathematical expression."""
        stripped = text.strip()
        if not stripped:
            return False
        if _MATH_SYMBOLS.search(stripped):
            return True
        operators = len(_OPERATORS.findall(stripped))
        letters = len(re.findall(r"[A-Za-z]", stripped))
        digits = len(re.findall(r"[0-9]", stripped))
        return operators >= 1 and (letters + digits) >= 2 and letters <= self.max_letters

    def extract(self, text: str) -> Optional[str]:
        """Return a cleaned formula string, or None if not a formula."""
        if not self.is_formula(text):
            return None
        cleaned = re.sub(r"\s+", " ", text.strip())
        cleaned = re.sub(r"\s*([+\-×÷=])\s*", r" \1 ", cleaned)
        return cleaned.strip()

    @staticmethod
    def contains_math_symbols(text: str) -> bool:
        """True when ``text`` contains any dedicated mathematical character."""
        return bool(_MATH_SYMBOLS.search(text))
