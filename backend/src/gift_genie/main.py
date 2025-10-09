from typing import Literal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from gift_genie.presentation.api.v1 import auth
from gift_genie.infrastructure.config.settings import get_settings

settings = get_settings()

app = FastAPI(
    title="Gift Genie API",
    description="API for organizing gift exchanges within groups",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/v1")


class HealthResponse(BaseModel):
    status: Literal["healthy", "unhealthy"]


@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "healthy"}
