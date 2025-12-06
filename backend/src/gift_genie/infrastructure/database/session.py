from __future__ import annotations

import ssl
from typing import AsyncGenerator

from loguru import logger
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from gift_genie.infrastructure.config.settings import get_settings

_engine = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()

        # Configure SSL for Scaleway SDB (requires SSL without certificate verification)
        # Local PostgreSQL works without SSL configuration
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args = {"ssl": ssl_context}

        _engine = create_async_engine(
            settings.DATABASE_URL,
            future=True,
            echo=False,
            connect_args=connect_args,
        )
        logger.info("Database engine created successfully")
    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(bind=_get_engine(), expire_on_commit=False)
    return _session_maker


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    session_maker = get_session_maker()
    async with session_maker() as session:
        yield session
