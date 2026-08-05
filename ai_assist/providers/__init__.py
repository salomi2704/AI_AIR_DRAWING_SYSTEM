"""Provider registry: name -> factory, and a ``create_provider`` helper.

Providers are resolved from :data:`config.ASSIST_PROVIDER` (or an explicit
name).  API keys come from environment variables:

* OpenAI / OpenAI-compatible: ``OPENAI_API_KEY``
* Gemini: ``GEMINI_API_KEY``
* Claude: ``ANTHROPIC_API_KEY``
* Ollama: none (local server)
* offline: none (built in)
"""

from __future__ import annotations

import os
from typing import Callable

import config

from ai_assist.providers.anthropic import ClaudeProvider
from ai_assist.providers.base import Provider, ProviderError
from ai_assist.providers.gemini import GeminiProvider
from ai_assist.providers.offline import RuleProvider
from ai_assist.providers.openai_compat import OpenAICompatibleProvider


def _openai_factory() -> OpenAICompatibleProvider:
    return OpenAICompatibleProvider(
        base_url=config.ASSIST_OPENAI_BASE_URL,
        api_key=os.environ.get("OPENAI_API_KEY"),
        model=config.ASSIST_OPENAI_MODEL,
    )


def _ollama_factory() -> OpenAICompatibleProvider:
    return OpenAICompatibleProvider(
        base_url=config.ASSIST_OLLAMA_BASE_URL,
        api_key=None,
        model=config.ASSIST_OLLAMA_MODEL,
        name="ollama",
    )


def _gemini_factory() -> GeminiProvider:
    return GeminiProvider(
        api_key=os.environ.get("GEMINI_API_KEY"),
        model=config.ASSIST_GEMINI_MODEL,
    )


def _claude_factory() -> ClaudeProvider:
    return ClaudeProvider(
        api_key=os.environ.get("ANTHROPIC_API_KEY"),
        model=config.ASSIST_CLAUDE_MODEL,
    )


PROVIDERS: dict[str, Callable[[], Provider]] = {
    "offline": lambda: RuleProvider(),
    "openai": _openai_factory,
    "gemini": _gemini_factory,
    "claude": _claude_factory,
    "ollama": _ollama_factory,
}


def create_provider(name: str | None = None) -> Provider:
    """Instantiate the provider named ``name`` (default: configured one)."""
    resolved = (name or config.ASSIST_PROVIDER).lower()
    if resolved not in PROVIDERS:
        raise ProviderError(
            f"Unknown assistant provider: {resolved!r} "
            f"(choose from {sorted(PROVIDERS)})"
        )
    return PROVIDERS[resolved]()
