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

        # Configure SSL based on extracted DATABASE_SSL_MODE
        connect_args = {}
        if settings.DATABASE_SSL_MODE:
            logger.info(f"Configuring SSL for mode: {settings.DATABASE_SSL_MODE}")

            if settings.DATABASE_SSL_MODE == "disable":
                # Explicitly disable SSL
                logger.info("SSL disabled")
                pass  # No connect_args needed for disable

            elif settings.DATABASE_SSL_MODE == "require":
                # SSL required but no certificate verification
                # This is equivalent to asyncpg's sslmode=require
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                connect_args["ssl"] = ssl_context
                logger.info("SSL enabled without certificate verification")

            elif settings.DATABASE_SSL_MODE in ("verify-ca", "verify-full"):
                # Full SSL verification with certificate checking
                connect_args["ssl"] = ssl.create_default_context()
                logger.info("SSL enabled with full certificate verification")

            elif settings.DATABASE_SSL_MODE in ("allow", "prefer"):
                # For allow/prefer modes, let asyncpg handle it (no explicit config)
                logger.info(f"SSL mode {settings.DATABASE_SSL_MODE} - using asyncpg defaults")
                pass

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
