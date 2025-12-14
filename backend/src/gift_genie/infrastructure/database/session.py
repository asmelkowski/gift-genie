"""Database configuration and session management."""

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

# Module-level engine and session maker - lazily initialized
_engine: AsyncEngine | None = None
_session_maker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """Get or create the async database engine.

    Configures SSL when DATABASE_SSL_REQUIRED is True.
    Uses connection pooling settings optimized for serverless environments.
    """
    global _engine
    if _engine is None:
        settings = get_settings()

        # Configure SSL for asyncpg when required
        connect_args: dict[str, object] = {}
        if settings.DATABASE_SSL_REQUIRED:
            logger.info("Configuring SSL for database connection")
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_context

        _engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            # Connection pool settings for serverless
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # Verify connections before use
            pool_recycle=3600,  # Recycle connections every hour
            connect_args=connect_args,
        )
        logger.info("Database engine created")

    return _engine


def get_session_maker() -> async_sessionmaker[AsyncSession]:
    """Get or create the async session maker."""
    global _session_maker
    if _session_maker is None:
        _session_maker = async_sessionmaker(
            bind=get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_maker


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for database sessions.

    Yields a database session and ensures it's closed after the request.
    """
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def close_db() -> None:
    """Close database connections. Call on application shutdown."""
    global _engine, _session_maker
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_maker = None
        logger.info("Database connections closed")
