import json
import logging
from functools import lru_cache
from typing import Any

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine.url import URL

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings - supports environment variable overrides"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
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
    def assemble_db_url(self) -> "Settings":
        """Construct DATABASE_URL from components if provided.

        Handles malformed DB_ENDPOINT values defensively:
        - Strips trailing colons
        - Defaults to PostgreSQL port 5432 when no port is provided
        - Logs configuration for debugging
        """
        # If DB_ENDPOINT is provided (e.g. from Terraform), parse it
        if self.DB_ENDPOINT:
            logger.info(f"Parsing DB_ENDPOINT: '{self.DB_ENDPOINT}'")

            # Strip whitespace and trailing colons
            endpoint = self.DB_ENDPOINT.strip().rstrip(":")

            if not endpoint:
                logger.warning("DB_ENDPOINT is empty after stripping")
            elif ":" in endpoint:
                # Split on the last colon to separate host and port
                host, port_str = endpoint.rsplit(":", 1)
                self.DB_HOST = host.strip() if host else None

                if port_str and port_str.strip():
                    # Try to parse port as integer
                    try:
                        self.DB_PORT = int(port_str.strip())
                        logger.info(
                            f"Parsed DB_ENDPOINT - Host: {self.DB_HOST}, " f"Port: {self.DB_PORT}"
                        )
                    except ValueError:
                        # Port is not a valid integer, default to PostgreSQL port
                        logger.warning(
                            f"Invalid port '{port_str}' in DB_ENDPOINT, " f"defaulting to 5432"
                        )
                        self.DB_PORT = 5432
                else:
                    # Empty port string after stripping, default to PostgreSQL port
                    logger.warning("Empty port in DB_ENDPOINT, defaulting to 5432")
                    self.DB_PORT = 5432
            else:
                # No port separator, use entire endpoint as host
                self.DB_HOST = endpoint
                self.DB_PORT = 5432
                logger.info(
                    f"No port found in DB_ENDPOINT, defaulting to 5432. " f"Host: {self.DB_HOST}"
                )

        # If we have the necessary components, construct the URL
        if self.DB_USER and self.DB_PASSWORD and self.DB_HOST and self.DB_NAME:
            # Ensure DB_PORT is a valid integer, not None or empty string
            port = self.DB_PORT if self.DB_PORT else 5432

            logger.info(
                f"Constructing DATABASE_URL with: "
                f"user={self.DB_USER}, host={self.DB_HOST}, "
                f"port={port}, database={self.DB_NAME}"
            )

            try:
                url = URL.create(
                    drivername="postgresql+asyncpg",
                    username=self.DB_USER,
                    password=self.DB_PASSWORD,
                    host=self.DB_HOST,
                    port=port,
                    database=self.DB_NAME,
                    query={"sslmode": "require"},
                )
                self.DATABASE_URL = url.render_as_string(hide_password=False)
                logger.info("Successfully constructed DATABASE_URL from components")
            except Exception as e:
                logger.error(f"Failed to construct DATABASE_URL from components: {e}")

        return self


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
