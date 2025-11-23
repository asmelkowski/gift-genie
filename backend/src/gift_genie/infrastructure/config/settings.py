import json
import os
from functools import lru_cache
from typing import Any

from loguru import logger
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import URL


class Settings(BaseSettings):
    """Application settings - supports environment variable overrides"""

    model_config = SettingsConfigDict(
        env_file=".env",
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

    # Database components (optional, for robust URL construction)
    DB_USER: str | None = None
    DB_PASSWORD: str | None = None
    DB_HOST: str | None = None
    DB_PORT: int | None = None
    DB_NAME: str | None = None
    DB_ENDPOINT: str | None = None  # host:port format from Terraform

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

    @model_validator(mode="before")
    @classmethod
    def log_env_vars(cls, data: Any) -> Any:
        """Log environment variables before validation to debug issues."""
        # Only log if we are in a context where we expect env vars to be populated
        # or if we are specifically debugging.

        # We can check os.environ directly or the data passed in if it's a dict
        logger.info("--- DEBUGGING SETTINGS INITIALIZATION ---")

        # Log specific keys we suspect are causing issues
        keys_to_log = [
            "DB_PORT",
            "DB_HOST",
            "DB_USER",
            "DB_NAME",
            "DB_ENDPOINT",
            "REDIS_URL",
            "ENV",
            "PORT",
        ]

        for key in keys_to_log:
            # Check both data dict and os.environ
            val_data = data.get(key) if isinstance(data, dict) else None
            val_env = os.getenv(key)

            logger.info(f"Env var {key}: env='{val_env}', data='{val_data}'")

        return data

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

    @field_validator("DB_PORT", mode="before")
    @classmethod
    def parse_db_port(cls, v: Any) -> Any:
        """Handle empty string for DB_PORT."""
        if v == "":
            return None
        return v

    @model_validator(mode="after")
    def assemble_db_url(self) -> "Settings":
        """Construct DATABASE_URL from components if provided."""
        # If DB_ENDPOINT is provided
        if self.DB_ENDPOINT:
            # Check if it's a full connection string (e.g. from Scaleway Serverless SQL)
            if self.DB_ENDPOINT.startswith(("postgres://", "postgresql://")):
                self.DATABASE_URL = self.DB_ENDPOINT
                # If it's a full URL, we don't need to do anything else
                return self

            # Otherwise treat as host:port
            parts = self.DB_ENDPOINT.rstrip(":").split(":")
            self.DB_HOST = parts[0]
            if len(parts) > 1:
                try:
                    self.DB_PORT = int(parts[1])
                except (ValueError, TypeError):
                    pass

        # Build connection string if we have all required components
        if self.DB_USER and self.DB_PASSWORD and self.DB_HOST and self.DB_NAME:
            url = URL.create(
                drivername="postgresql+asyncpg",
                username=self.DB_USER,
                password=self.DB_PASSWORD,
                host=self.DB_HOST,
                port=self.DB_PORT
                or 5432,  # Scaleway Serverless SQL always uses standard PostgreSQL port
                database=self.DB_NAME,
                query={"sslmode": "require"},
            )
            self.DATABASE_URL = url.render_as_string(hide_password=False)

        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
