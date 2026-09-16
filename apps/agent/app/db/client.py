"""Async database client and tenant-scoped connection helper."""

import asyncio
import json
import re
import uuid
from collections.abc import Callable, Coroutine
from datetime import datetime, timezone
from typing import Any, TypeVar
import asyncpg
import psycopg2
from app.config import settings

T = TypeVar("T")

UUID_REGEX = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Pools keyed by active event loop to ensure safety across test/prod environments
_pools: dict[asyncio.AbstractEventLoop, asyncpg.Pool] = {}


async def get_pool() -> asyncpg.Pool:
    """Acquire or initialize the asyncpg connection pool for the active event loop."""
    loop = asyncio.get_running_loop()
    pool = _pools.get(loop)
    if pool is None or pool._loop.is_closed():
        pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=1,
            max_size=10,
            command_timeout=60,
        )
        _pools[loop] = pool
    return pool


async def close_pool() -> None:
    """Close the asyncpg connection pool for the active event loop."""
    loop = asyncio.get_running_loop()
    pool = _pools.pop(loop, None)
    if pool is not None and not pool._loop.is_closed():
        await pool.close()


async def with_clinic(
    clinic_id: str,
    fn: Callable[[asyncpg.Connection], Coroutine[Any, Any, T]],
) -> T:
    """
    Execute database operations within a tenant-scoped transaction.

    Enforces PostgreSQL Row-Level Security (RLS) identically to the TypeScript
    withClinic helper by setting:
      SET LOCAL ROLE authenticated;
      SET LOCAL app.clinic_id = '<clinicId>';
    """
    if not UUID_REGEX.match(clinic_id):
        raise ValueError(f"Invalid clinicId UUID: {clinic_id}")

    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                f"SET LOCAL ROLE authenticated; SET LOCAL app.clinic_id = '{clinic_id}';"
            )
            return await fn(conn)


async def log_audit(
    conn: asyncpg.Connection,
    clinic_id: str,
    action: str,
    entity: str,
    entity_id: str | None = None,
    actor_id: str | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Record an immutable entry in the audit_log table."""
    meta_json = json.dumps(meta) if meta is not None else None
    await conn.execute(
        """
        INSERT INTO audit_log (
            id, clinic_id, actor_id, action, entity, entity_id, meta, at, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, NOW(), NOW(), NOW()
        )
        """,
        clinic_id,
        actor_id,
        action,
        entity,
        entity_id,
        meta_json,
    )


async def log_dev_outbox_async(
    channel: str,
    from_: str,
    to: str,
    body: str,
    direction: str,
    provider: str = "mock",
) -> None:
    """Async insert a communication record into dev_outbox."""
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO dev_outbox (id, channel, "from", "to", body, provider, direction, created_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW())
                """,
                channel,
                from_,
                to,
                body,
                provider,
                direction,
            )
    except Exception as e:
        print(f"[Warning] Failed to log dev_outbox async: {e}")


def log_dev_outbox(
    channel: str,
    from_: str,
    to: str,
    body: str,
    direction: str,
    provider: str = "mock",
) -> None:
    """Sync fallback insert a communication record into dev_outbox via psycopg2."""
    try:
        conn = psycopg2.connect(settings.database_url, connect_timeout=2)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO dev_outbox (id, channel, "from", "to", body, provider, direction, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        str(uuid.uuid4()),
                        channel,
                        from_,
                        to,
                        body,
                        provider,
                        direction,
                        datetime.now(timezone.utc),
                    ),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception as e:
        print(f"[Warning] Failed to log to dev_outbox: {e}")
