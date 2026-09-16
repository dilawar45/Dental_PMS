"""Claude LLM provider stub."""

from app.llm.base import LLMProvider, Message, ToolSpec, LLMResponse


class ClaudeLLMProvider(LLMProvider):
    """Claude LLM provider stub — throws until configured in future phases."""

    def __init__(self, api_key: str = "") -> None:
        self.api_key = api_key

    async def complete(
        self,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
    ) -> LLMResponse:
        raise NotImplementedError(
            "Claude LLM provider not configured or active in Phase 4A. "
            "Use LLM_PROVIDER=mock or configure ANTHROPIC_API_KEY."
        )
