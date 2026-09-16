"""Session store factory — resolves store based on configuration."""

from app.config import Settings
from app.session.base import SessionStore
from app.session.memory_store import MemorySessionStore
from app.session.redis_store import RedisSessionStore

_in_memory_instance: MemorySessionStore | None = None


def get_session_store(settings: Settings) -> SessionStore:
    """Return configured session store instance (singleton for in-memory)."""
    global _in_memory_instance
    mode = settings.session_store.lower().strip()

    if mode == "memory":
        if _in_memory_instance is None:
            _in_memory_instance = MemorySessionStore()
        return _in_memory_instance
    elif mode == "redis":
        return RedisSessionStore(redis_url=settings.redis_url)
    else:
        raise ValueError(
            f"Unknown SESSION_STORE '{mode}'. Supported stores: 'memory', 'redis'."
        )
