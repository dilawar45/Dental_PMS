"""In-memory session store implementation."""

import asyncio
from datetime import datetime, timezone
from app.session.base import SessionStore, Session


class MemorySessionStore(SessionStore):
    """
    In-memory session store for local development and testing.
    Thread-safe via asyncio.Lock, caps message history to sliding window.
    """

    def __init__(self, max_history_turns: int = 30) -> None:
        self._store: dict[str, Session] = {}
        self._lock = asyncio.Lock()
        self.max_history_turns = max_history_turns

    async def get(self, conversation_id: str) -> Session | None:
        async with self._lock:
            session = self._store.get(conversation_id)
            if not session:
                return None
            return session.model_copy(deep=True)

    async def set(self, session: Session, ttl: int = 86400) -> None:
        async with self._lock:
            # Enforce max history window to prevent unbounded memory growth
            if len(session.history) > self.max_history_turns:
                session.history = session.history[-self.max_history_turns:]
            session.updated_at = datetime.now(timezone.utc)
            self._store[session.conversation_id] = session.model_copy(deep=True)

    async def delete(self, conversation_id: str) -> bool:
        async with self._lock:
            return self._store.pop(conversation_id, None) is not None
