"""Diagram summarization through a pluggable LLM provider.

:class:`DiagramSummarizer` turns the recognition output (shapes, OCR text,
LaTeX formulas) into a short natural-language description.  It always works:

* with the default **offline** provider it is purely deterministic;
* with a remote provider (OpenAI / Gemini / Claude / Ollama) it sends the
  diagram as a prompt, and automatically falls back to the offline summary if
  the request fails or returns nothing.
"""

from __future__ import annotations

from ai_assist.providers import create_provider
from ai_assist.providers.base import Provider, ProviderError
from ai_assist.providers.offline import RuleProvider

SYSTEM_PROMPT = (
    "You describe hand-drawn diagrams that a vision pipeline has recognized. "
    "Be concise (at most 6 sentences) and focus on structure and meaning, "
    "not on listing every shape."
)


class DiagramSummarizer:
    def __init__(self, provider: Provider | None = None) -> None:
        self.provider = provider if provider is not None else create_provider()

    # ------------------------------------------------------------------
    # Prompting
    # ------------------------------------------------------------------
    @staticmethod
    def build_prompt(shapes, text_regions, latex: list[str]) -> str:
        lines: list[str] = []
        if shapes:
            entries = [
                f"{shape.kind}({getattr(shape, 'label', '') or ''})"
                for shape in shapes
            ]
            lines.append("Shapes (type, label): " + "; ".join(entries))
        if text_regions:
            lines.append("Recognized text: " + "; ".join(r.text for r in text_regions))
        if latex:
            lines.append("Formulas: " + "; ".join(latex))
        if not lines:
            lines.append("The diagram is empty.")
        lines.append("Describe the overall diagram in a few sentences.")
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Summarization
    # ------------------------------------------------------------------
    def summarize(self, shapes, text_regions, latex: list[str]) -> str:
        """Return a summary, preferring the configured provider."""
        offline = RuleProvider.summarize_diagram(text_regions, shapes, latex)
        if isinstance(self.provider, RuleProvider):
            return offline
        try:
            result = self.provider.summarize(
                SYSTEM_PROMPT, self.build_prompt(shapes, text_regions, latex)
            )
        except (ProviderError, OSError, ValueError) as exc:
            return f"{offline} (LLM unavailable: {exc})"
        if not result or not result.strip():
            return offline
        return result.strip()


#: Module-level default summarizer used by the app (created lazily).
_DEFAULT_SUMMARIZER: DiagramSummarizer | None = None


def get_summarizer() -> DiagramSummarizer:
    """Return a process-wide :class:`DiagramSummarizer` (cached)."""
    global _DEFAULT_SUMMARIZER
    if _DEFAULT_SUMMARIZER is None:
        _DEFAULT_SUMMARIZER = DiagramSummarizer()
    return _DEFAULT_SUMMARIZER


__all__ = ["DiagramSummarizer", "SYSTEM_PROMPT", "get_summarizer"]
