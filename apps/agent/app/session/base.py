"""Session store base models and abstract interface."""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Chat message recorded in conversation history."""

    role: Literal["system", "user", "assistant", "tool"]
    content: str
    tool_call_id: str | None = None
    name: str | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Session(BaseModel):
    """Conversation session state."""

    conversation_id: str
    channel: str = "whatsapp"
    patient_id: str | None = None
    clinic_id: str | None = None
    history: list[ChatMessage] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SessionStore(ABC):
    """Abstract interface for session storage."""

    @abstractmethod
    async def get(self, conversation_id: str) -> Session | None:
        """Fetch a session by conversation ID, or None if not found."""
        pass

    @abstractmethod
    async def set(self, session: Session, ttl: int = 86400) -> None:
        """Persist a session with an expiration TTL in seconds."""
        pass

    @abstractmethod
    async def delete(self, conversation_id: str) -> bool:
        """Delete a session from storage."""
        pass
