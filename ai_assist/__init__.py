"""AI assist: sketch cleanup, formula-to-LaTeX and LLM diagram summaries.

Public API::

    from ai_assist import (
        DiagramSummarizer, SketchCleaner, LatexConverter, create_provider,
    )

The provider layer (:mod:`ai_assist.providers`) abstracts OpenAI / Gemini /
Claude / Ollama behind one interface, defaulting to a deterministic offline
summarizer so the app works with no API keys.
"""

from ai_assist.assistant import DiagramSummarizer, get_summarizer
from ai_assist.cleanup import SketchCleaner
from ai_assist.latex import LatexConverter
from ai_assist.providers import Provider, ProviderError, create_provider

__all__ = [
    "DiagramSummarizer",
    "SketchCleaner",
    "LatexConverter",
    "Provider",
    "ProviderError",
    "create_provider",
    "get_summarizer",
]
