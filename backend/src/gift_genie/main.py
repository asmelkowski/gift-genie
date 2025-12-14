from contextlib import asynccontextmanager
import sys
from collections.abc import AsyncGenerator
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from pydantic import BaseModel
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from gift_genie.infrastructure.config.settings import get_settings
from gift_genie.infrastructure.database.migrations import run_migrations
from gift_genie.infrastructure.logging import get_request_context
from gift_genie.infrastructure.rate_limiting import limiter
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
    # Run database migrations first (before any other initialization)
    logger.info("Starting database migrations...")
    run_migrations()
    logger.info("Database migrations completed")

    # Initialize SlowAPI rate limiter
    logger.info("Rate limiting initialized with in-memory storage")

    yield


app = FastAPI(
    title="Gift Genie API",
    description="API for organizing gift exchanges within groups",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# Add SlowAPI to app state and register exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

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

# Setup exception handlers
setup_exception_handlers(app)

# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")
app.include_router(exclusions.router, prefix="/api/v1")
app.include_router(draws.router, prefix="/api/v1")


class HealthResponse(BaseModel):
    status: Literal["healthy"]


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="healthy")
