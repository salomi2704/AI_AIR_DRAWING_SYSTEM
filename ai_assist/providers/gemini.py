"""Google Gemini provider (REST ``generateContent`` endpoint)."""

from __future__ import annotations

from typing import Optional

import config

from ai_assist.providers.base import ProviderError
from ai_assist.providers.http import post_json

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProvider:
    name = "gemini"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = config.ASSIST_GEMINI_MODEL,
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
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": max_tokens},
        }

    @staticmethod
    def parse_response(payload: dict) -> str:
        try:
            parts = payload["candidates"][0]["content"]["parts"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderError(f"Unexpected Gemini response: {payload}") from exc
        return "".join(part.get("text", "") for part in parts).strip()

    def summarize(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        max_tokens: int = 1024,
    ) -> str:
        url = f"{_BASE_URL}/models/{self.model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key or "",
        }
        payload = post_json(
            url,
            self.build_request(self.model, system_prompt, user_prompt, max_tokens),
            headers,
            self.timeout,
        )
        return self.parse_response(payload)
