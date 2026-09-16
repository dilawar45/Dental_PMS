"""Base classes and schemas for LLM provider abstraction."""

from abc import ABC, abstractmethod
from typing import Any, Literal
from pydantic import BaseModel, Field


class Message(BaseModel):
    """Chat message representation for LLM exchanges."""

    role: Literal["system", "user", "assistant", "tool"]
    content: str
    tool_call_id: str | None = None
    name: str | None = None


class ToolSpec(BaseModel):
    """Specification of a tool exposed to the LLM."""

    name: str
    description: str
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="JSON Schema dictionary describing the parameters",
    )


class ToolCall(BaseModel):
    """Invocation request emitted by an LLM."""

    id: str
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class LLMResponse(BaseModel):
    """Response produced by an LLM provider."""

    text: str = ""
    tool_calls: list[ToolCall] = Field(default_factory=list)


class LLMProvider(ABC):
    """Abstract interface for swappable LLM adapters."""

    @abstractmethod
    async def complete(
        self,
        messages: list[Message],
        tools: list[ToolSpec] | None = None,
    ) -> LLMResponse:
        """Generate a response given conversation messages and available tool specs."""
        pass
