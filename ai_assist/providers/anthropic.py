"""Anthropic Claude provider (REST ``/v1/messages`` endpoint)."""

from __future__ import annotations

from typing import Optional

import config

from ai_assist.providers.base import ProviderError
from ai_assist.providers.http import post_json

_URL = "https://api.anthropic.com/v1/messages"


class ClaudeProvider:
    name = "claude"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = config.ASSIST_CLAUDE_MODEL,
        timeout: float = config.ASSIST_TIMEOUT,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def available(self) -> bool:
        return bool(self.api_key)

    @staticmethod
    def build_request(
        model: str,
        system_prompt: str,
        user_prompt: str,
        max_tokens: int = 1024,
    ) -> dict:
        return {
            "model": model,
            "system": system_prompt,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": user_prompt}],
        }

    @staticmethod
    def parse_response(payload: dict) -> str:
        try:
            content = payload["content"]
        except (KeyError, TypeError) as exc:
            raise ProviderError(f"Unexpected Claude response: {payload}") from exc
        text = "".join(
            block.get("text", "")
            for block in content
            if block.get("type") == "text"
        )
        return text.strip()

    def summarize(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 1024,
    ) -> str:
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key or "",
            "anthropic-version": "2023-06-01",
        }
        payload = post_json(
            _URL,
            self.build_request(self.model, system_prompt, user_prompt, max_tokens),
            headers,
            self.timeout,
        )
        return self.parse_response(payload)
