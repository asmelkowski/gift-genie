from contextlib import asynccontextmanager
import redis.asyncio as redis
from typing import Literal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter
from pydantic import BaseModel
from gift_genie.presentation.api.v1 import auth, exclusions, groups, members
from gift_genie.infrastructure.config.settings import get_settings

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await FastAPILimiter.init(redis_client)
    yield

app = FastAPI(
    title="Gift Genie API",
    description="API for organizing gift exchanges within groups",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize rate limiter
redis_client = redis.from_url("redis://localhost:6379", encoding="utf-8", decode_responses=True)


# Include routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(members.router, prefix="/api/v1")
app.include_router(exclusions.router, prefix="/api/v1")


class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]


@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "healthy"}
