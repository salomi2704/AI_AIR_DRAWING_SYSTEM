"""Unit tests for the LLM assistant provider layer.

Request/response builders are pure functions, so parsing and payload shape
are tested without any network access.
"""

from __future__ import annotations

import unittest

from ai_assist import ProviderError, create_provider
from ai_assist.providers import PROVIDERS
from ai_assist.providers.anthropic import ClaudeProvider
from ai_assist.providers.gemini import GeminiProvider
from ai_assist.providers.offline import RuleProvider
from ai_assist.providers.openai_compat import OpenAICompatibleProvider


class FakeShape:
    def __init__(self, kind):
        self.kind = kind


class FakeRegion:
    def __init__(self, text):
        self.text = text


class RegistryTest(unittest.TestCase):
    def test_offline_provider_is_default(self) -> None:
        provider = create_provider("offline")
        self.assertIsInstance(provider, RuleProvider)
        self.assertTrue(provider.available())

    def test_registered_names(self) -> None:
        self.assertEqual(
            sorted(PROVIDERS),
            ["claude", "gemini", "offline", "ollama", "openai"],
        )

    def test_unknown_provider_raises(self) -> None:
        with self.assertRaises(ProviderError):
            create_provider("does-not-exist")

    def test_remote_providers_are_constructible_without_keys(self) -> None:
        self.assertEqual(create_provider("openai").name, "openai")
        self.assertEqual(create_provider("gemini").name, "gemini")
        self.assertEqual(create_provider("claude").name, "claude")
        self.assertEqual(create_provider("ollama").name, "ollama")


class OpenAICompatProviderTest(unittest.TestCase):
    def test_build_request_shape(self) -> None:
        request = OpenAICompatibleProvider.build_request("gpt-x", "sys", "user")
        self.assertEqual(request["model"], "gpt-x")
        self.assertEqual(request["messages"][0]["role"], "system")
        self.assertEqual(request["messages"][0]["content"], "sys")
        self.assertEqual(request["messages"][1]["content"], "user")

    def test_parse_response(self) -> None:
        payload = {"choices": [{"message": {"content": "  hello  "}}]}
        self.assertEqual(OpenAICompatibleProvider.parse_response(payload), "hello")

    def test_parse_response_missing_choices_raises(self) -> None:
        with self.assertRaises(ProviderError):
            OpenAICompatibleProvider.parse_response({})

    def test_local_endpoint_is_available_without_key(self) -> None:
        provider = OpenAICompatibleProvider(
            base_url="http://localhost:11434/v1", api_key=None
        )
        self.assertTrue(provider.available())

    def test_cloud_endpoint_needs_key(self) -> None:
        provider = OpenAICompatibleProvider(api_key=None)
        self.assertFalse(provider.available())


class GeminiProviderTest(unittest.TestCase):
    def test_build_request_shape(self) -> None:
        request = GeminiProvider.build_request("gem", "sys", "user")
        self.assertEqual(request["system_instruction"]["parts"][0]["text"], "sys")
        self.assertEqual(request["contents"][0]["parts"][0]["text"], "user")

    def test_parse_response_joins_parts(self) -> None:
        payload = {"candidates": [{"content": {"parts": [{"text": "a"}, {"text": "b"}]}}]}
        self.assertEqual(GeminiProvider.parse_response(payload), "ab")

    def test_parse_response_missing_candidates_raises(self) -> None:
        with self.assertRaises(ProviderError):
            GeminiProvider.parse_response({"candidates": []})


class ClaudeProviderTest(unittest.TestCase):
    def test_build_request_shape(self) -> None:
        request = ClaudeProvider.build_request("cl", "sys", "user")
        self.assertEqual(request["system"], "sys")
        self.assertEqual(request["messages"][0]["content"], "user")
        self.assertIn("max_tokens", request)

    def test_parse_response_picks_text_blocks(self) -> None:
        payload = {
            "content": [{"type": "text", "text": "answer"}, {"type": "x", "text": "nope"}]
        }
        self.assertEqual(ClaudeProvider.parse_response(payload), "answer")

    def test_parse_response_missing_content_raises(self) -> None:
        with self.assertRaises(ProviderError):
            ClaudeProvider.parse_response({})


class RuleProviderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.provider = RuleProvider()

    def test_blank_canvas(self) -> None:
        self.assertIn("blank", self.provider.summarize_diagram([], [], []))

    def test_shapes_are_counted_and_pluralized(self) -> None:
        shapes = [FakeShape("rectangle"), FakeShape("rectangle"), FakeShape("arrow")]
        summary = self.provider.summarize_diagram([], shapes, [])
        self.assertIn("2 rectangles", summary)
        self.assertIn("1 arrow", summary)

    def test_text_and_formulas_are_listed(self) -> None:
        regions = [FakeRegion("Start"), FakeRegion("End")]
        summary = self.provider.summarize_diagram(
            regions, [], ["a^2 + b^2 = c^2"]
        )
        self.assertIn("Start; End", summary)
        self.assertIn("a^2 + b^2 = c^2", summary)

    def test_interface_compliance_noop(self) -> None:
        self.assertEqual(self.provider.summarize("sys", "user"), "")


if __name__ == "__main__":
    unittest.main()
