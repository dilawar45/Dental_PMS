"""LLM provider factory — resolves provider based on configuration."""

from app.config import Settings
from app.llm.base import LLMProvider
from app.llm.mock import MockLLMProvider
from app.llm.claude import ClaudeLLMProvider
from app.llm.gemini import GeminiLLMProvider


def get_llm_provider(settings: Settings) -> LLMProvider:
    """Return configured LLM provider instance."""
    provider = settings.llm_provider.lower().strip()

    if provider == "mock":
        return MockLLMProvider()
    elif provider == "claude":
        return ClaudeLLMProvider(api_key=settings.anthropic_api_key)
    elif provider == "gemini":
        return GeminiLLMProvider(api_key=settings.gemini_api_key)
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER '{provider}'. Supported providers: 'mock', 'claude', 'gemini'."
        )
