"""Tests for LLM provider factory and stubs."""

import pytest
from app.config import Settings
from app.llm.factory import get_llm_provider
from app.llm.mock import MockLLMProvider
from app.llm.claude import ClaudeLLMProvider
from app.llm.gemini import GeminiLLMProvider
from app.llm.base import Message


def test_get_llm_provider_mock() -> None:
    """Factory returns MockLLMProvider for 'mock'."""
    settings = Settings(llm_provider="mock")
    provider = get_llm_provider(settings)
    assert isinstance(provider, MockLLMProvider)


def test_get_llm_provider_claude() -> None:
    """Factory returns ClaudeLLMProvider for 'claude'."""
    settings = Settings(llm_provider="claude", anthropic_api_key="test-key")
    provider = get_llm_provider(settings)
    assert isinstance(provider, ClaudeLLMProvider)


def test_get_llm_provider_gemini() -> None:
    """Factory returns GeminiLLMProvider for 'gemini'."""
    settings = Settings(llm_provider="gemini", gemini_api_key="test-key")
    provider = get_llm_provider(settings)
    assert isinstance(provider, GeminiLLMProvider)


def test_get_llm_provider_invalid() -> None:
    """Factory raises ValueError on unknown provider name."""
    settings = Settings(llm_provider="unsupported_ai")
    with pytest.raises(ValueError) as exc_info:
        get_llm_provider(settings)
    assert "unsupported_ai" in str(exc_info.value)


@pytest.mark.asyncio
async def test_claude_and_gemini_raise_not_implemented() -> None:
    """Calling complete on Claude or Gemini stubs raises NotImplementedError in Phase 4A."""
    claude = ClaudeLLMProvider()
    with pytest.raises(NotImplementedError):
        await claude.complete([Message(role="user", content="hello")])

    gemini = GeminiLLMProvider()
    with pytest.raises(NotImplementedError):
        await gemini.complete([Message(role="user", content="hello")])
