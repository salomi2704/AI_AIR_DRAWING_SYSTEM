"""Provider abstraction for the LLM assistant layer.

Every backend (OpenAI-compatible, Gemini, Claude, Ollama, offline rules)
implements the small :class:`Provider` contract so the rest of the
application can treat them uniformly and swap them via config.
"""

from __future__ import annotations

from typing import Protocol


class ProviderError(RuntimeError):
    """Raised when a provider cannot complete or parse a request."""


class Provider(Protocol):
    """Any backend that can turn a prompt into a text answer."""

    name: str

    def available(self) -> bool:
        """True when this backend is configured (e.g. an API key exists)."""
        ...

    def summarize(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 1024,
    ) -> str:
        """Return the answer for ``user_prompt``; raise :class:`ProviderError`."""
        ...
