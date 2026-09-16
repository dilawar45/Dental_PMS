"""Tests for session stores and serialization."""

import pytest
from app.session.base import Session, ChatMessage
from app.session.memory_store import MemorySessionStore


@pytest.mark.asyncio
async def test_memory_session_store_lifecycle() -> None:
    """Test get, set, sliding turn window, and delete in MemorySessionStore."""
    store = MemorySessionStore(max_history_turns=5)

    # 1. Non-existent session returns None
    assert await store.get("test_conv_1") is None

    # 2. Set new session
    session = Session(
        conversation_id="test_conv_1",
        channel="whatsapp",
        history=[
            ChatMessage(role="user", content="Hello"),
            ChatMessage(role="assistant", content="Hi there!"),
        ],
    )
    await store.set(session)

    # 3. Retrieve session
    fetched = await store.get("test_conv_1")
    assert fetched is not None
    assert fetched.conversation_id == "test_conv_1"
    assert len(fetched.history) == 2
    assert fetched.history[0].content == "Hello"

    # 4. Exceed sliding window (max 5 turns)
    for i in range(10):
        fetched.history.append(ChatMessage(role="user", content=f"Message {i}"))
    await store.set(fetched)

    trimmed = await store.get("test_conv_1")
    assert trimmed is not None
    assert len(trimmed.history) == 5
    assert trimmed.history[-1].content == "Message 9"

    # 5. Delete session
    assert await store.delete("test_conv_1") is True
    assert await store.get("test_conv_1") is None
    assert await store.delete("test_conv_1") is False
