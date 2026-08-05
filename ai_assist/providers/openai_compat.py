"""OpenAI-compatible chat provider.

Talks the ``/chat/completions`` protocol, which also covers OpenAI's hosted
API, Ollama's OpenAI endpoint and any local server exposing the same schema
(LM Studio, vLLM, ...).  Request and response parsing are pure functions so
they can be unit-tested without a network.
"""

from __future__ import annotations

from typing import Optional

import config

from ai_assist.providers.base import ProviderError
from ai_assist.providers.http import post_json


class OpenAICompatibleProvider:
    name = "openai"

    def __init__(
        self,
        base_url: str = config.ASSIST_OPENAI_BASE_URL,
        api_key: Optional[str] = None,
        model: str = config.ASSIST_OPENAI_MODEL,
        timeout: float = config.ASSIST_TIMEOUT,
        name: str = "openai",
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.name = name

    def available(self) -> bool:
        """Needs a key, or a local endpoint that does not require one."""
        if self.api_key:
            return True
        return "localhost" in self.base_url or "127.0.0.1" in self.base_url

    @staticmethod
    def build_request(
        model: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 1024,
    ) -> dict:
        return {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.4,
            "max_tokens": max_tokens,
        }

    @staticmethod
    def parse_response(payload: dict) -> str:
        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"Unexpected OpenAI response: {payload}") from exc
        return str(content).strip()

    def summarize(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 1024,
    ) -> str:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        payload = post_json(
            f"{self.base_url}/chat/completions",
            self.build_request(self.model, system_prompt, user_prompt, max_tokens),
            headers,
            self.timeout,
        )
        return self.parse_response(payload)
