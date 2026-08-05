"""Unit tests for the DiagramSummarizer and its offline fallback."""

from __future__ import annotations

import unittest

from ai_assist import DiagramSummarizer, ProviderError, get_summarizer
from ai_assist.providers.offline import RuleProvider


class FakeShape:
    def __init__(self, kind: str, label: str = "") -> None:
        self.kind = kind
        self.label = label


class FakeRegion:
    def __init__(self, text: str) -> None:
        self.text = text


class _FakeLLM:
    name = "fake"

    def __init__(self, result=None, error=None) -> None:
        self.result = result
        self.error = error

    def summarize(self, system_prompt, user_prompt, *, max_tokens=1024) -> str:
        if self.error is not None:
            raise self.error
        return self.result


class DiagramSummarizerTest(unittest.TestCase):
    def test_offline_provider_builds_rule_summary(self) -> None:
        summarizer = DiagramSummarizer(RuleProvider())
        summary = summarizer.summarize(
            [FakeShape("rectangle", "Start")], [FakeRegion("hello")], []
        )
        self.assertIn("1 rectangle", summary)
        self.assertIn("hello", summary)

    def test_build_prompt_includes_inputs(self) -> None:
        prompt = DiagramSummarizer.build_prompt(
            [FakeShape("circle")], [FakeRegion("hi")], ["x^2"]
        )
        self.assertIn("circle", prompt)
        self.assertIn("hi", prompt)
        self.assertIn("x^2", prompt)

    def test_build_prompt_reports_empty(self) -> None:
        self.assertIn("empty", DiagramSummarizer.build_prompt([], [], []))

    def test_uses_provider_result(self) -> None:
        summarizer = DiagramSummarizer(_FakeLLM(result="A flow for login."))
        self.assertEqual(summarizer.summarize([], [], []), "A flow for login.")

    def test_falls_back_when_provider_fails(self) -> None:
        summarizer = DiagramSummarizer(_FakeLLM(error=ProviderError("boom")))
        summary = summarizer.summarize([FakeShape("rectangle")], [], [])
        self.assertIn("1 rectangle", summary)
        self.assertIn("LLM unavailable", summary)

    def test_falls_back_on_empty_result(self) -> None:
        summarizer = DiagramSummarizer(_FakeLLM(result="   "))
        summary = summarizer.summarize([FakeShape("arrow")], [], [])
        self.assertIn("1 arrow", summary)

    def test_module_default_summarizer(self) -> None:
        self.assertIsInstance(get_summarizer(), DiagramSummarizer)


if __name__ == "__main__":
    unittest.main()
