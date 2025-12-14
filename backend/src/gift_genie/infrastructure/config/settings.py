import json
import re
from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator, model_validator
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
    DATABASE_SSL_MODE: str | None = None  # Extracted from DATABASE_URL sslmode parameter
    DATABASE_SSL_REQUIRED: bool = Field(
        default=False,
        description="Whether to require SSL for database connections. "
        "Auto-detected if not explicitly set based on DATABASE_URL patterns.",
    )

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
    def ensure_database_scheme_and_auto_detect_ssl(self) -> "Settings":
        """Add PostgreSQL driver scheme, remove sslmode parameter, and auto-detect SSL.

        Terraform provides: username:password@host:port/db?sslmode=require
        We convert to: postgresql+asyncpg://username:password@host:port/db
        SSL is configured via connect_args in session.py, not via URL parameter.

        Auto-detects if SSL is required based on cloud provider patterns in DATABASE_URL
        if DATABASE_SSL_REQUIRED was not explicitly set.
        """
        # Extract sslmode parameter if present
        sslmode_match = re.search(r"[?&]sslmode=([^&]+)", self.DATABASE_URL)
        if sslmode_match:
            self.DATABASE_SSL_MODE = sslmode_match.group(1)
            # Remove sslmode parameter while preserving other query params
            # Case 1: ?sslmode=X& (first param with others following)
            self.DATABASE_URL = re.sub(r"\?sslmode=[^&]*&", "?", self.DATABASE_URL)
            # Case 2: ?sslmode=X$ (only param)
            self.DATABASE_URL = re.sub(r"\?sslmode=[^&]*$", "", self.DATABASE_URL)
            # Case 3: &sslmode=X (not the first param)
            self.DATABASE_URL = re.sub(r"&sslmode=[^&]*", "", self.DATABASE_URL)

        # Add scheme if not present (for local development)
        if "://" not in self.DATABASE_URL:
            self.DATABASE_URL = f"postgresql+asyncpg://{self.DATABASE_URL}"

        # Auto-detect SSL requirement if not explicitly set
        # Check if DATABASE_SSL_REQUIRED was NOT explicitly provided by user
        # (either via env var or constructor argument)
        if "DATABASE_SSL_REQUIRED" not in self.__pydantic_fields_set__:
            # Check if any cloud provider pattern is in the DATABASE_URL
            cloud_patterns = [
                "scaleway",
                "scw.cloud",  # Scaleway container/serverless domains
                "sdb.",  # Scaleway Serverless Database
                "rds.amazonaws",
                "database.azure",
                "cloudsql",
            ]
            self.DATABASE_SSL_REQUIRED = any(
                pattern in self.DATABASE_URL.lower() for pattern in cloud_patterns
            )

        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
