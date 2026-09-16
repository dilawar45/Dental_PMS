"""Redis-backed session store implementation."""

import json
from datetime import datetime, timezone
import redis.asyncio as aioredis
from app.session.base import SessionStore, Session


class RedisSessionStore(SessionStore):
    """
    Redis session store for multi-instance production environments.
    Uses async redis client with JSON serialization and key expiration.
    """

    def __init__(self, redis_url: str = "redis://localhost:6379", key_prefix: str = "session:dental_pms:") -> None:
        self.redis_url = redis_url
        self.key_prefix = key_prefix
        self._redis: aioredis.Redis | None = None

    async def _get_client(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._redis

    async def get(self, conversation_id: str) -> Session | None:
        client = await self._get_client()
        key = f"{self.key_prefix}{conversation_id}"
        raw = await client.get(key)
        if not raw:
            return None
        data = json.loads(raw)
        return Session.model_validate(data)

    async def set(self, session: Session, ttl: int = 86400) -> None:
        client = await self._get_client()
        key = f"{self.key_prefix}{session.conversation_id}"
        session.updated_at = datetime.now(timezone.utc)
        payload = session.model_dump_json()
        await client.set(key, payload, ex=ttl)

    async def delete(self, conversation_id: str) -> bool:
        client = await self._get_client()
        key = f"{self.key_prefix}{conversation_id}"
        res = await client.delete(key)
        return bool(res > 0)
