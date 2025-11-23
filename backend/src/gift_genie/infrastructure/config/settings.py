import json
from functools import lru_cache
from typing import Any

from loguru import logger
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings - supports environment variable overrides"""

    model_config = SettingsConfigDict(
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Environment
    ENV: str = "dev"

    # Application
    APP_NAME: str = "Gift Genie"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://frontend:5173"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"

    # Redis
    REDIS_URL: str = "localhost:6379"
    REDIS_USERNAME: str = ""  # Empty for local dev (no auth)
    REDIS_PASSWORD: str = ""  # Empty for local dev (no auth)

    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Cookie settings
    COOKIE_SAMESITE: str = "lax"
    COOKIE_SECURE: bool = False

    # Email (to be configured)
    EMAIL_ENABLED: bool = False
    EMAIL_FROM: str = ""

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Parse CORS_ORIGINS from comma-separated string, JSON array, or list.

        Handles various input types and returns a default if invalid.
        """
        default_origins = ["http://localhost:5173"]

        if v is None:
            return default_origins

        if isinstance(v, list):
            # Ensure all elements are strings and strip whitespace
            return [str(origin).strip() for origin in v if str(origin).strip()]

        if isinstance(v, str):
            v = v.strip()
            if not v:
                return default_origins

            # Check if it's a JSON array
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed if str(origin).strip()]
                    else:
                        return default_origins
                except json.JSONDecodeError:
                    # Fall back to comma-separated parsing
                    pass

            # Parse as comma-separated string
            origins = [origin.strip() for origin in v.split(",") if origin.strip()]
            return origins if origins else default_origins

        # For any other type (int, dict, etc.), return default
        return default_origins

    @model_validator(mode="after")
    def ensure_database_scheme(self) -> "Settings":
        """Add PostgreSQL async driver scheme to DATABASE_URL if not present.

        Terraform provides: username:password@host:port/db?params
        We convert to: postgresql+asyncpg://username:password@host:port/db?params
        """
        logger.info(f"ensure_database_scheme called with: {self.DATABASE_URL}")
        # Check if URL already has a scheme (contains ://)
        if "://" not in self.DATABASE_URL:
            # Credentials@host format from Terraform - add our driver scheme
            logger.info("Adding postgresql+asyncpg:// scheme")
            self.DATABASE_URL = f"postgresql+asyncpg://{self.DATABASE_URL}"
        else:
            logger.info("Scheme already present, no change needed")
        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
