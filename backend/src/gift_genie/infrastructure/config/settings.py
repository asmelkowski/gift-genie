from functools import lru_cache
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    # Application
    APP_NAME: str = "Gift Genie"
    DEBUG: bool = True

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/gift_genie"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379

    # Security
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Email (to be configured)
    EMAIL_ENABLED: bool = False
    EMAIL_FROM: str = ""


class ProdSettings(Settings):
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: list[str] = ["http://gift-genie-frontend:80"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@gift-genie-postgres:5432/gift_genie"

    # Redis
    REDIS_HOST: str = "gift-genie-redis"
    REDIS_PORT: int = 6379



@lru_cache
def get_settings() -> Settings:
    is_prod = os.getenv("PROD", False)
    return Settings() if not is_prod else ProdSettings()
