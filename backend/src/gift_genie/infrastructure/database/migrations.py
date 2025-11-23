"""Database migration utilities for automatic schema updates on startup."""

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from loguru import logger

from gift_genie.infrastructure.config.settings import get_settings


def run_migrations() -> None:
    """Run Alembic migrations programmatically with retry logic.

    Performs database migrations using exponential backoff retry logic.
    If migrations fail after max retries, raises an exception to prevent app startup.

    Raises:
        RuntimeError: If migrations fail after all retry attempts.
    """
    settings = get_settings()
    max_retries = 5
    initial_retry_delay = 2  # seconds

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Running database migrations (attempt {attempt}/{max_retries})")

            # Configure Alembic programmatically
            # Path resolution: migrations.py is in src/gift_genie/infrastructure/database/
            # We need to go up 5 levels to get to the app root (/app in Docker, backend/ locally)
            # Then navigate into the alembic/ directory
            alembic_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "alembic"

            # Create Alembic config without loading alembic.ini
            config = Config()

            # Set script location (where env.py and versions/ directory are located)
            config.set_main_option("script_location", str(alembic_dir))

            # Set the database URL, removing +asyncpg driver for synchronous operations
            sync_db_url = settings.DATABASE_URL.replace("+asyncpg", "")
            config.set_main_option("sqlalchemy.url", sync_db_url)

            # Run migrations
            command.upgrade(config, "head")

            logger.info("Database migrations completed successfully")
            return

        except Exception as e:
            if attempt == max_retries:
                logger.error(f"Database migrations failed after {max_retries} retries: {e}")
                raise RuntimeError(f"Failed to run database migrations: {e}") from e

            # Calculate backoff delay
            delay = initial_retry_delay * (2 ** (attempt - 1))
            logger.warning(f"Migration attempt {attempt} failed: {e}. Retrying in {delay}s...")
            time.sleep(delay)
