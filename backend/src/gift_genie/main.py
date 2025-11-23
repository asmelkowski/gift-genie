from contextlib import asynccontextmanager
import redis.asyncio as redis
import sys
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from loguru import logger
from pydantic import BaseModel

from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.infrastructure.logging import get_request_context
from gift_genie.presentation.api.v1 import auth, draws, exclusions, groups, members
from gift_genie.presentation.api.exception_handlers import setup_exception_handlers
from gift_genie.presentation.middleware import setup_exception_logging_middleware

settings = get_settings()


def setup_logging() -> None:
    """Configure loguru logging with structured output and request context."""
    # Remove default handler
    logger.remove()

    # Determine log level
    log_level = settings.LOG_LEVEL.upper()

    # Configure handler based on environment
    if settings.ENV == "dev":
        # Development: human-readable format with colors
        logger.add(
            sys.stdout,
            level=log_level,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | <level>{message}</level>",
            colorize=True,
        )
    else:
        # Production: JSON format for structured logging
        logger.add(
            sys.stdout,
            level=log_level,
            format="{time} | {level} | {name}:{function}:{line} | {message} | {extra}",
            serialize=True,
        )

    # Configure context integration to include request context in all logs
    logger.configure(patcher=lambda record: record["extra"].update(get_request_context()))


# Setup logging early
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await FastAPILimiter.init(redis_client)
    yield


print(settings.DEBUG)
app = FastAPI(
    title="Gift Genie API",
    description="API for organizing gift exchanges within groups",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup exception logging middleware
setup_exception_logging_middleware(app)

# Initialize rate limiter with stable, well-tested configuration
# Core parameters: connection pooling, UTF-8 encoding, response decoding, and socket timeouts
redis_client = redis.from_url(
    f"redis://{settings.REDIS_URL}",
    encoding="utf-8",
    decode_responses=True,
    max_connections=50,
    socket_connect_timeout=5,
    socket_timeout=5,
)

# Setup exception handlers
setup_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")
app.include_router(exclusions.router, prefix="/api/v1")
app.include_router(draws.router, prefix="/api/v1")


class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]
    redis_status: str | None = None


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    redis_status = "disconnected"
    overall_status: Literal["healthy", "unhealthy"] = "healthy"

    try:
        await redis_client.ping()
        redis_status = "connected"
    except Exception as e:
        redis_status = "disconnected"
        overall_status = "unhealthy"
        logger.error(f"Redis health check failed: {e}")

    return HealthResponse(status=overall_status, redis_status=redis_status)
